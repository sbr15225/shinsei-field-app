// supabase/functions/auth-google/index.ts
// [2026-09-29] 管理画面の「Googleでログイン」。許可リストの Gmail（社長・勝間さん）だけ管理者 s5 として入れる
//
// リクエスト: POST { action, ... }
//   get_config {}              → { ok, clientId }   ※ clientId が空＝未設定（画面はボタンを出さない）
//   login      { credential }  → auth-pin / auth-passkey と同じ形 { ok, user, sessionToken }
//   [2026-09-30] 登録済み端末（社長PCなど。Googleアカウントの無い人が自分のPCで開くだけで入る）
//   register_device { token, deviceLabel } → { ok, sessionToken, deviceLabel, expiresAt }
//                     ※ 今のセッションが Googleログイン（auth_method='google'）の管理者だけ。PIN・パスキー・端末セッションからは不可
//                     ※ 発行した端末セッション（auth_method='device'・1年）に入れ替え、元の google セッションは削除する
//   list_devices    { token }             → { ok, currentAuthMethod, devices:[{ id, deviceLabel, registeredBy, createdAt, expiresAt, isThisDevice }] }
//   revoke_device   { token, id }         → { ok, wasThisDevice }   ※ 管理者セッションなら方法を問わず可。token は一覧に出さない（id で指定）
//
// 方針：
//   ・ID トークンの署名検証は jose（バージョン固定）に任せる。Google の公開鍵（JWKS）で RS256 を検証し、
//     issuer・audience（app_settings.google_client_id）・有効期限を確認。email_verified=true も必須
//   ・許可リストは app_settings.admin_google_emails（カンマ区切り・小文字で比較）。無ければ拒否
//   ・通ったら staff s5（DB で role=admin を確認）として sessions に auth_method='google' で発行。期限は30日
//   ・成功も拒否も login_audit_logs に残す（どのメールで来たか）。記録に失敗してもログイン自体は止めない
//   ・回数制限は auth-passkey と同じ（インスタンス内 20回/分/IP ＋ pin_fail_locks で IP 毎 5回/30分）。
//     全体停止（global）は入れない：Google の署名は総当たりで破れないので、
//     入れると「ゴミを大量に送るだけで社長・勝間さんが入れなくなる」害の方が大きいため

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN");
if (!ALLOWED_ORIGIN) throw new Error("ALLOWED_ORIGIN environment variable is not set");
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Google の設定 ──
// 公開鍵は jose がキャッシュする（鍵の入れ替わりにも自動で追従）
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

// Googleで入った人がなる管理者アカウント（社長・勝間さんで共用している s5「管理者」）
const ADMIN_STAFF_ID = "s5";
// Googleセッションの期限：30日（個人の端末でずっと入れるように。PIN・パスキーは12時間のまま）
const SESSION_TTL_MINUTES_GOOGLE = 30 * 24 * 60;
// [2026-09-30] 登録済み端末のセッション期限：1年（切れたらもう一度 Google で入って登録し直す）
const SESSION_TTL_MINUTES_DEVICE = 365 * 24 * 60;

// ── レート制限（インスタンス内メモリ・IP毎 20回/分）── auth-passkey と同じ
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── ログイン失敗の回数制限（auth-pin / auth-passkey と同じテーブル・同じ意味）──
//   キーは "google," で始める（PIN・パスキーとは別カウント。PIN 側の IP キーは "," を含まないので衝突しない）
const MAX_FAILURES = 5;
const FAIL_WINDOW_MS = 30 * 60_000;
const LOCK_DURATION_MS = 30 * 60_000;
const ipKey = (ip: string) => `google,${ip}`;

async function checkFailLock(key: string, max: number): Promise<{ locked: boolean; remaining?: number }> {
  const { data } = await supabaseAdmin
    .from("pin_fail_locks").select("failures, locked_until").eq("ip", key).maybeSingle();
  if (!data?.locked_until) return { locked: false };
  const lu = new Date(data.locked_until).getTime();
  const now = Date.now();
  if (lu > now) {
    if ((data.failures || 0) >= max) return { locked: true, remaining: Math.ceil((lu - now) / 60_000) };
    return { locked: false };
  }
  await supabaseAdmin.from("pin_fail_locks").delete().eq("ip", key);
  return { locked: false };
}

async function recordFailure(key: string, max: number, windowMs: number, lockMs: number): Promise<void> {
  const { data } = await supabaseAdmin
    .from("pin_fail_locks").select("failures, locked_until").eq("ip", key).maybeSingle();
  const now = Date.now();
  const lu = data?.locked_until ? new Date(data.locked_until).getTime() : 0;
  const active = lu > now;
  const next = (active ? (data?.failures || 0) : 0) + 1;
  if (next >= max) {
    await supabaseAdmin.from("pin_fail_locks").upsert({
      ip: key, failures: next, locked_until: new Date(now + lockMs).toISOString(),
    });
  } else {
    const until = active ? new Date(lu).toISOString() : new Date(now + windowMs).toISOString();
    await supabaseAdmin.from("pin_fail_locks").upsert({ ip: key, failures: next, locked_until: until });
  }
}

// ── 小物 ──
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// app_settings から1つ読む（無い・読めない時は空文字）
async function getSetting(key: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from("app_settings").select("value").eq("key", key).maybeSingle();
  if (error) console.error(`auth-google: app_settings(${key}) read failed:`, error.message);
  return typeof data?.value === "string" ? data.value.trim() : "";
}

// 監査ログ（失敗してもログインは止めない。Supabase の関数ログにも同じ内容を出す）
// [2026-09-30] 端末の登録・取り消しも同じ表に auth_method='device' で残す（最後の引数）
async function audit(result: "success" | "denied", email: string, reason: string, ip: string, staffId: string | null = null, authMethod = "google") {
  console.log(`auth-google ${authMethod} ${result}: email=${email || "-"} reason=${reason || "-"} ip=${ip}`);
  const { error } = await supabaseAdmin.from("login_audit_logs").insert({
    auth_method: authMethod, result, email: email.slice(0, 320), staff_id: staffId, reason: reason.slice(0, 200), ip: ip.slice(0, 100),
  });
  if (error) console.error("auth-google: login_audit_logs insert failed:", error.message);
}

// ── ログイン ──
async function login(ip: string, body: Record<string, unknown>): Promise<Response> {
  const lock = await checkFailLock(ipKey(ip), MAX_FAILURES);
  if (lock.locked) return json({ ok: false, error: `失敗が続いたため止めています。${lock.remaining}分後にもう一度お試しください` }, 403);

  const clientId = await getSetting("google_client_id");
  if (!clientId) return json({ ok: false, error: "Googleログインは未設定です" }, 400);

  const deny = async (email: string, reason: string, userMsg: string, status = 401) => {
    await audit("denied", email, reason, ip);
    await recordFailure(ipKey(ip), MAX_FAILURES, FAIL_WINDOW_MS, LOCK_DURATION_MS);
    return json({ ok: false, error: userMsg }, status);
  };

  const credential = body.credential;
  if (typeof credential !== "string" || credential.length < 20 || credential.length > 4096) {
    return await deny("", "bad_request", "Googleの応答が不正です。もう一度お試しください", 400);
  }

  // 署名・発行元・宛先（自分のクライアントID）・有効期限を検証
  let payload;
  try {
    ({ payload } = await jwtVerify(credential, GOOGLE_JWKS, {
      issuer: GOOGLE_ISSUERS,
      audience: clientId,
      algorithms: ["RS256"],
      clockTolerance: 30, // 端末とサーバの時計ずれを30秒だけ許す
    }));
  } catch (e) {
    console.error("auth-google verify error:", (e as Error).message);
    return await deny("", "invalid_token", "Googleの確認に失敗しました。もう一度お試しください");
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!email) return await deny("", "no_email", "Googleアカウントのメールアドレスを確認できませんでした");
  if (payload.email_verified !== true) return await deny(email, "email_not_verified", "このGoogleアカウントはメールアドレスが未確認です");

  // 許可リスト（カンマ区切り・前後の空白を除いて小文字で比較）
  const allowed = (await getSetting("admin_google_emails"))
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(email)) {
    return await deny(email, "not_allowed", `このGoogleアカウント（${email}）では管理画面に入れません`, 403);
  }

  // 管理者アカウントを DB で確認（role=admin でなければ発行しない）
  const { data: staff, error: staffErr } = await supabaseAdmin
    .from("staff").select("id, name, role, daily_rate, is_executive").eq("id", ADMIN_STAFF_ID).maybeSingle();
  if (staffErr) return json({ ok: false, error: "サーバーエラー: " + staffErr.message }, 500);
  if (!staff || staff.role !== "admin") {
    await audit("denied", email, "admin_staff_missing", ip);
    return json({ ok: false, error: "管理者アカウントが見つかりません" }, 500);
  }

  // セッション発行（auth-pin / auth-passkey と同じ形。期限だけ30日）
  try { await supabaseAdmin.rpc("cleanup_expired_sessions"); } catch (_) { /* ignore */ }
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES_GOOGLE * 60_000).toISOString();
  const { error: sessErr } = await supabaseAdmin.from("sessions").insert({
    // [2026-09-30] auth_email：端末登録の時に「誰のGoogleで登録したか」を残すため（migration 093 の列）
    staff_id: staff.id, token: sessionToken, expires_at: expiresAt, auth_method: "google", auth_email: email,
  });
  if (sessErr) return json({ ok: false, error: "セッション作成エラー: " + sessErr.message }, 500);

  await audit("success", email, "", ip, staff.id);
  return json({
    ok: true,
    user: {
      id: staff.id, name: staff.name, role: staff.role,
      dailyRate: staff.daily_rate, isExecutive: staff.is_executive || false,
    },
    sessionToken,
  });
}

// ══════════════════════════════════════════════════════════════
// [2026-09-30] 登録済み端末（auth_method='device'）
//   ・登録：Googleで入った管理者だけ。端末セッション（1年）を発行して、今の google セッションは消す
//   ・一覧・取り消し：管理者セッションなら誰でも（PIN・パスキー・端末でも可）。token は返さない
//   ・api-gateway 等は sessions の token と期限だけで判定するので、device セッションも他と同じように使える
//     （staff.require_passkey＝PIN停止スイッチは auth-pin だけが見る。device には影響しない）
// ══════════════════════════════════════════════════════════════
interface CurrentSession {
  id: string; staffId: string; role: string; authMethod: string; authEmail: string;
}

// リクエストの token から今のセッションを確認（期限切れ・管理者以外は null）
async function currentAdminSession(token: unknown): Promise<CurrentSession | null> {
  if (typeof token !== "string" || token.length < 10 || token.length > 200) return null;
  const { data: s, error } = await supabaseAdmin
    .from("sessions").select("id, staff_id, expires_at, auth_method, auth_email").eq("token", token).maybeSingle();
  if (error) console.error("auth-google: sessions read failed:", error.message);
  if (!s || new Date(s.expires_at).getTime() < Date.now()) return null;
  const { data: staff } = await supabaseAdmin.from("staff").select("id, role").eq("id", s.staff_id).maybeSingle();
  if (!staff || staff.role !== "admin") return null;
  return {
    id: s.id, staffId: staff.id, role: staff.role,
    authMethod: s.auth_method || "", authEmail: s.auth_email || "",
  };
}

// 端末名：前後の空白と制御文字を除いて30文字まで。空なら「社長PC」
function cleanDeviceLabel(v: unknown): string {
  const s = typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 30) : "";
  return s || "社長PC";
}

const isUuid = (v: unknown) =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

async function registerDevice(me: CurrentSession, body: Record<string, unknown>, ip: string): Promise<Response> {
  if (me.authMethod !== "google") {
    return json({ ok: false, error: "端末の登録は「Googleでログイン」で入った時だけできます。一度退出して、Googleでログインし直してください" }, 403);
  }
  // 093 適用前に発行された google セッションはメールが残っていない → 誰が登録したか残せないので断る
  if (!me.authEmail) {
    return json({ ok: false, error: "ログインした人のGoogleアカウントを確認できません。一度退出して、Googleでログインし直してから登録してください" }, 403);
  }
  const label = cleanDeviceLabel(body.deviceLabel);

  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES_DEVICE * 60_000).toISOString();
  const { error: insErr } = await supabaseAdmin.from("sessions").insert({
    staff_id: me.staffId, token: sessionToken, expires_at: expiresAt,
    auth_method: "device", device_label: label, auth_email: me.authEmail,
  });
  if (insErr) return json({ ok: false, error: "登録に失敗しました: " + insErr.message }, 500);

  // この端末に残っていた google セッション（30日）はもう使わないので消す。失敗しても登録は成功扱い
  const { error: delErr } = await supabaseAdmin.from("sessions").delete().eq("id", me.id);
  if (delErr) console.error("auth-google: old google session delete failed:", delErr.message);

  await audit("success", me.authEmail, `device_register:${label}`, ip, me.staffId, "device");
  return json({ ok: true, sessionToken, deviceLabel: label, expiresAt });
}

async function listDevices(me: CurrentSession): Promise<Response> {
  const { data, error } = await supabaseAdmin
    .from("sessions").select("id, device_label, auth_email, created_at, expires_at")
    .eq("auth_method", "device").gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });
  if (error) return json({ ok: false, error: "読み込みに失敗しました: " + error.message }, 500);
  return json({
    ok: true,
    currentAuthMethod: me.authMethod,
    devices: (data || []).map((d) => ({
      id: d.id, deviceLabel: d.device_label || "（名前なし）", registeredBy: d.auth_email || "",
      createdAt: d.created_at, expiresAt: d.expires_at, isThisDevice: d.id === me.id,
    })),
  });
}

async function revokeDevice(me: CurrentSession, body: Record<string, unknown>, ip: string): Promise<Response> {
  if (!isUuid(body.id)) return json({ ok: false, error: "対象が不正です" }, 400);
  // auth_method='device' の行だけ消す（id を書き換えて他のセッションを消されないように）
  const { data, error } = await supabaseAdmin.from("sessions")
    .delete().eq("id", body.id).eq("auth_method", "device").select("id, device_label");
  if (error) return json({ ok: false, error: "取り消しに失敗しました: " + error.message }, 500);
  if (!data || data.length === 0) return json({ ok: false, error: "見つかりません（すでに取り消し済みかもしれません）" }, 404);
  // 誰が取り消したか：Googleで入っていればそのメール、それ以外は方法だけ（共用アカウント s5 のため）
  const actor = me.authEmail || `(${me.authMethod || "unknown"})`;
  await audit("success", actor, `device_revoke:${data[0].device_label || ""}`, ip, me.staffId, "device");
  return json({ ok: true, wasThisDevice: data[0].id === me.id });
}

// ── 入口 ──
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(clientIp)) {
    return json({ ok: false, error: "操作が多すぎます。1分ほど待ってからもう一度お試しください" }, 429);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ ok: false, error: "リクエストが不正です" }, 400);
    const action = (body as Record<string, unknown>).action;

    // クライアントIDは公開情報（Googleのボタンに埋め込むもの）。許可メールは返さない
    if (action === "get_config") return json({ ok: true, clientId: await getSetting("google_client_id") });
    if (action === "login") return await login(clientIp, body as Record<string, unknown>);

    // [2026-09-30] ここから下は管理者セッション必須（role は DB で確認）
    if (action === "register_device" || action === "list_devices" || action === "revoke_device") {
      const b = body as Record<string, unknown>;
      const me = await currentAdminSession(b.token);
      if (!me) return json({ ok: false, error: "セッションが切れました。ログインし直してください" }, 401);
      if (action === "register_device") return await registerDevice(me, b, clientIp);
      if (action === "list_devices") return await listDevices(me);
      return await revokeDevice(me, b, clientIp);
    }
    return json({ ok: false, error: "不明な操作です" }, 400);
  } catch (e) {
    console.error("auth-google error:", e);
    return json({ ok: false, error: "サーバーエラー" }, 500);
  }
});
