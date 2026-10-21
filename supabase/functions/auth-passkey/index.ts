// supabase/functions/auth-passkey/index.ts
// [2026-09-26] 管理者向けパスキー（WebAuthn）ログイン 段階1（追加のみ。PINログインは auth-pin で今まで通り使える）
//
// リクエスト: POST { action, ... }
//   register_start  { token }                              → { ok, options, challengeId }   ※管理者セッション必須
//   register_finish { token, challengeId, response, deviceLabel } → { ok, credential }      ※管理者セッション必須
//   login_start     {}                                     → { ok, options, challengeId }
//   login_finish    { challengeId, response }              → auth-pin と同じ形 { ok, user, sessionToken }
//   list            { token }                              → { ok, credentials, requirePasskey } ※自分の分だけ
//   rename          { token, id, deviceLabel }             → { ok }
//   delete          { token, id }                          → { ok, remaining }
//
// 方針：
//   ・署名検証は @simplewebauthn/server（バージョン固定）に任せる。自前で検証を書かない
//   ・rpID は本番ドメイン固定、origin も完全一致で検証。userVerification は required（Windows HelloのPIN・顔・指紋など）
//   ・チャレンジは DELETE ... RETURNING で取り出す＝1回限り。5分で失効
//   ・ログイン失敗は auth-pin と同じ pin_fail_locks テーブルで回数制限（キーは "passkey," で始めて PIN 側と別カウント）
//   ・ログインできるのは role=admin だけ（DBで確認）。発行するセッションは auth-pin と同じ形式・同じ期限（12時間）

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "npm:@simplewebauthn/server@13.3.3";
import { isoBase64URL } from "npm:@simplewebauthn/server@13.3.3/helpers";

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

// ── WebAuthn の設定 ──
// rpID は本番ドメインで固定（プレビュー用の xxx.shinsei-field-app.pages.dev からは origin 不一致で弾く）
const RP_ID = "shinsei-field-app.pages.dev";
const EXPECTED_ORIGIN = `https://${RP_ID}`;
const RP_NAME = "シンセイ工業 現場管理アプリ";
const CHALLENGE_TTL_MS = 5 * 60_000; // 5分
const MAX_CREDENTIALS_PER_STAFF = 10;

// セッション期限は auth-pin と同じ（admin 12時間）
const SESSION_TTL_MINUTES_ADMIN = 12 * 60;

// ── レート制限（インスタンス内メモリ・IP毎 20回/分）──
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

// ── ログイン失敗の回数制限（auth-pin と同じ考え方・同じテーブル）──
//   IP毎：最初の失敗から30分で5回失敗 → 30分ロック。成功してもカウントは消さない
//   全体：15分で30回失敗 → 15分停止（パスキーだけ停止。PINログインには影響しない）
//   キーは "passkey," で始める。auth-pin の IP キーは x-forwarded-for の先頭（"," を含まない）なので衝突しない
const MAX_FAILURES = 5;
const FAIL_WINDOW_MS = 30 * 60_000;
const LOCK_DURATION_MS = 30 * 60_000;
const GLOBAL_MAX_FAILURES = 30;
const GLOBAL_WINDOW_MS = 15 * 60_000;
const GLOBAL_LOCK_DURATION_MS = 15 * 60_000;
const GLOBAL_KEY = "passkey,global";
const ipKey = (ip: string) => `passkey,${ip}`;

// auth-pin の checkFailLock / recordFailure と同じ処理（テーブルの意味も同じ）
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

async function recordLoginFailure(ip: string): Promise<void> {
  await recordFailure(ipKey(ip), MAX_FAILURES, FAIL_WINDOW_MS, LOCK_DURATION_MS);
  await recordFailure(GLOBAL_KEY, GLOBAL_MAX_FAILURES, GLOBAL_WINDOW_MS, GLOBAL_LOCK_DURATION_MS);
}

// ── セッション検証（api-gateway の verifySession と同じ。role は毎回DBから取り直す）──
interface SessionInfo { staffId: string; role: string; name: string; }
async function verifySession(token: unknown): Promise<SessionInfo | null> {
  if (!token || typeof token !== "string") return null;
  const { data: session, error } = await supabaseAdmin
    .from("sessions").select("staff_id, expires_at").eq("token", token).single();
  if (error || !session) return null;
  if (new Date(session.expires_at) < new Date()) return null;
  const { data: staff, error: staffErr } = await supabaseAdmin
    .from("staff").select("id, role, name").eq("id", session.staff_id).single();
  if (staffErr || !staff) return null;
  return { staffId: staff.id, role: staff.role, name: staff.name || "" };
}

// ── 小物 ──
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
const TRANSPORTS = new Set(["ble", "cable", "hybrid", "internal", "nfc", "smart-card", "usb"]);

// 端末名：制御文字を除いて前後の空白を取り、30文字まで。空なら「端末」
function cleanLabel(v: unknown): string {
  const s = typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, "").trim() : "";
  return (s || "端末").slice(0, 30);
}

// WebAuthn の user.id（userHandle）。staff.id（s5 など）をそのまま UTF-8 にする
const userIdBytes = (staffId: string) => new TextEncoder().encode(staffId);

// チャレンジを1回限りで取り出す（DELETE ... RETURNING。期限切れ・用途違い・他人の分は取れない）
async function consumeChallenge(id: unknown, purpose: "register" | "login", staffId: string | null): Promise<string | null> {
  if (!isUuid(id)) return null;
  let q = supabaseAdmin.from("webauthn_challenges").delete()
    .eq("id", id).eq("purpose", purpose).gt("expires_at", new Date().toISOString());
  q = staffId ? q.eq("staff_id", staffId) : q.is("staff_id", null);
  const { data, error } = await q.select("challenge");
  if (error) { console.error("consumeChallenge:", error.message); return null; }
  return data && data.length === 1 ? data[0].challenge : null;
}

async function saveChallenge(purpose: "register" | "login", staffId: string | null, challenge: string) {
  // ついでに期限切れを掃除（テーブルを小さく保つ）
  await supabaseAdmin.from("webauthn_challenges").delete().lt("expires_at", new Date().toISOString());
  return await supabaseAdmin.from("webauthn_challenges").insert({
    purpose, staff_id: staffId, challenge,
    expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  }).select("id").single();
}

// ── 登録開始（管理者セッション必須）──
async function registerStart(me: SessionInfo): Promise<Response> {
  const { data: creds, error } = await supabaseAdmin
    .from("webauthn_credentials").select("credential_id, transports").eq("staff_id", me.staffId);
  if (error) return json({ ok: false, error: "登録情報の読み込みに失敗しました: " + error.message }, 500);
  if ((creds || []).length >= MAX_CREDENTIALS_PER_STAFF) {
    return json({ ok: false, error: `登録できるのは${MAX_CREDENTIALS_PER_STAFF}台までです。使っていない端末を削除してください` }, 400);
  }
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: userIdBytes(me.staffId),
    userName: me.name || me.staffId,
    userDisplayName: me.name || me.staffId,
    attestationType: "none",
    // 同じ端末の二重登録を防ぐ（端末側で「登録済み」エラーになる）
    excludeCredentials: (creds || []).map((c) => ({
      id: c.credential_id,
      transports: (c.transports || []).filter((t: string) => TRANSPORTS.has(t)),
    })),
    // residentKey=required：ログイン時に名前を選ばずに使えるようにする（パスキー）
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
    supportedAlgorithmIDs: [-7, -257], // ES256・RS256（Windows Hello は RS256 のことがある）
  });
  const { data: row, error: insErr } = await saveChallenge("register", me.staffId, options.challenge);
  if (insErr || !row) return json({ ok: false, error: "準備に失敗しました: " + (insErr?.message || "") }, 500);
  return json({ ok: true, options, challengeId: row.id });
}

// ── 登録完了（管理者セッション必須）──
async function registerFinish(me: SessionInfo, body: Record<string, unknown>): Promise<Response> {
  const challenge = await consumeChallenge(body.challengeId, "register", me.staffId);
  if (!challenge) return json({ ok: false, error: "時間切れです。もう一度「登録」を押してください" }, 400);
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      // deno-lint-ignore no-explicit-any
      response: body.response as any,
      expectedChallenge: challenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });
  } catch (e) {
    console.error("registerFinish verify error:", (e as Error).message);
    return json({ ok: false, error: "登録を確認できませんでした: " + (e as Error).message }, 400);
  }
  if (!verification.verified || !verification.registrationInfo) {
    return json({ ok: false, error: "登録を確認できませんでした" }, 400);
  }
  const { credential } = verification.registrationInfo;
  const { data: ins, error } = await supabaseAdmin.from("webauthn_credentials").insert({
    staff_id: me.staffId,
    credential_id: credential.id,
    public_key: isoBase64URL.fromBuffer(credential.publicKey),
    sign_count: credential.counter,
    transports: (credential.transports || []).filter((t) => TRANSPORTS.has(t)),
    device_label: cleanLabel(body.deviceLabel),
  }).select("id, device_label, created_at, last_used_at").single();
  if (error) {
    if (error.code === "23505") return json({ ok: false, error: "この端末はもう登録されています" }, 409);
    return json({ ok: false, error: "登録の保存に失敗しました: " + error.message }, 500);
  }
  return json({ ok: true, credential: {
    id: ins.id, deviceLabel: ins.device_label, createdAt: ins.created_at, lastUsedAt: ins.last_used_at,
  } });
}

// ── ログイン開始（誰でも呼べる。どのパスキーを使うかは端末側で選ぶ）──
async function loginStart(ip: string): Promise<Response> {
  const lock = await checkLocks(ip);
  if (lock) return lock;
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: [], // 空＝端末に保存されたパスキーから選ぶ（名前やPINの入力なし）
    userVerification: "required",
  });
  const { data: row, error } = await saveChallenge("login", null, options.challenge);
  if (error || !row) return json({ ok: false, error: "準備に失敗しました。もう一度押してください" }, 500);
  return json({ ok: true, options, challengeId: row.id });
}

async function checkLocks(ip: string): Promise<Response | null> {
  const l = await checkFailLock(ipKey(ip), MAX_FAILURES);
  if (l.locked) return json({ ok: false, error: `失敗が続いたため止めています。${l.remaining}分後にもう一度お試しください` }, 403);
  const g = await checkFailLock(GLOBAL_KEY, GLOBAL_MAX_FAILURES);
  if (g.locked) return json({ ok: false, error: `ただいま一時停止中です。${g.remaining}分後にもう一度お試しください（PINでのログインは使えます）` }, 403);
  return null;
}

// ── ログイン完了 → auth-pin と同じ形でセッション発行 ──
async function loginFinish(ip: string, body: Record<string, unknown>): Promise<Response> {
  const lock = await checkLocks(ip);
  if (lock) return lock;
  const fail = async (logMsg: string, userMsg = "ログインできませんでした。もう一度お試しください") => {
    console.error("loginFinish:", logMsg);
    await recordLoginFailure(ip);
    return json({ ok: false, error: userMsg }, 401);
  };

  const challenge = await consumeChallenge(body.challengeId, "login", null);
  if (!challenge) return await fail("challenge not found/expired", "時間切れです。もう一度ボタンを押してください");

  // deno-lint-ignore no-explicit-any
  const resp = body.response as any;
  if (!resp || typeof resp.id !== "string" || resp.id.length > 1024) return await fail("bad response");

  const { data: cred, error: credErr } = await supabaseAdmin
    .from("webauthn_credentials")
    .select("id, staff_id, credential_id, public_key, sign_count, transports")
    .eq("credential_id", resp.id).maybeSingle();
  if (credErr) return json({ ok: false, error: "サーバーエラー: " + credErr.message }, 500);
  if (!cred) {
    return await fail("unknown credential",
      "この端末は登録されていないか、登録が削除されています。PINでログインしてから登録し直してください");
  }
  // 端末が返した userHandle が登録時の staff と違えば拒否（念のための二重チェック）
  const uh = resp.response?.userHandle;
  if (uh && uh !== isoBase64URL.fromBuffer(userIdBytes(cred.staff_id))) return await fail("userHandle mismatch");

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: resp,
      expectedChallenge: challenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
      credential: {
        id: cred.credential_id,
        publicKey: isoBase64URL.toBuffer(cred.public_key),
        counter: Number(cred.sign_count) || 0,
        transports: cred.transports || [],
      },
    });
  } catch (e) {
    // 署名不一致・origin 違い・カウンタ逆戻り（複製の疑い）など
    return await fail("verify error: " + (e as Error).message);
  }
  if (!verification.verified) return await fail("not verified");

  // role は DB で確認（パスキーでログインできるのは管理者だけ）
  const { data: staff, error: staffErr } = await supabaseAdmin
    .from("staff").select("id, name, role, daily_rate, is_executive").eq("id", cred.staff_id).single();
  if (staffErr || !staff) return await fail("staff not found");
  if (staff.role !== "admin") return await fail("not admin", "この方法でログインできるのは管理者だけです");

  // 署名カウンタと最終利用日時を更新
  const { error: upErr } = await supabaseAdmin.from("webauthn_credentials").update({
    sign_count: verification.authenticationInfo.newCounter,
    last_used_at: new Date().toISOString(),
  }).eq("id", cred.id);
  if (upErr) console.error("loginFinish: sign_count update failed:", upErr.message);

  // セッション発行（auth-pin と同じ）
  try { await supabaseAdmin.rpc("cleanup_expired_sessions"); } catch (_) { /* ignore */ }
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES_ADMIN * 60_000).toISOString();
  const { error: sessErr } = await supabaseAdmin.from("sessions").insert({
    staff_id: staff.id, token: sessionToken, expires_at: expiresAt, auth_method: "passkey",
  });
  if (sessErr) return json({ ok: false, error: "セッション作成エラー: " + sessErr.message }, 500);

  return json({
    ok: true,
    user: {
      id: staff.id, name: staff.name, role: staff.role,
      dailyRate: staff.daily_rate, isExecutive: staff.is_executive || false,
    },
    sessionToken,
  });
}

// ── 一覧・名前変更・削除（管理者セッション必須・自分の分だけ）──
async function listCredentials(me: SessionInfo): Promise<Response> {
  const { data, error } = await supabaseAdmin
    .from("webauthn_credentials").select("id, device_label, created_at, last_used_at")
    .eq("staff_id", me.staffId).order("created_at", { ascending: true });
  if (error) return json({ ok: false, error: "読み込みに失敗しました: " + error.message }, 500);
  const { data: st } = await supabaseAdmin.from("staff").select("require_passkey").eq("id", me.staffId).maybeSingle();
  return json({
    ok: true,
    requirePasskey: st?.require_passkey === true,
    credentials: (data || []).map((c) => ({
      id: c.id, deviceLabel: c.device_label, createdAt: c.created_at, lastUsedAt: c.last_used_at,
    })),
  });
}

async function renameCredential(me: SessionInfo, body: Record<string, unknown>): Promise<Response> {
  if (!isUuid(body.id)) return json({ ok: false, error: "対象が不正です" }, 400);
  const { data, error } = await supabaseAdmin.from("webauthn_credentials")
    .update({ device_label: cleanLabel(body.deviceLabel) })
    .eq("id", body.id).eq("staff_id", me.staffId).select("id");
  if (error) return json({ ok: false, error: "保存に失敗しました: " + error.message }, 500);
  if (!data || data.length === 0) return json({ ok: false, error: "見つかりません" }, 404);
  return json({ ok: true });
}

async function deleteCredential(me: SessionInfo, body: Record<string, unknown>): Promise<Response> {
  if (!isUuid(body.id)) return json({ ok: false, error: "対象が不正です" }, 400);
  const { count, error: cntErr } = await supabaseAdmin.from("webauthn_credentials")
    .select("id", { count: "exact", head: true }).eq("staff_id", me.staffId);
  if (cntErr) return json({ ok: false, error: "読み込みに失敗しました: " + cntErr.message }, 500);
  // 段階2（require_passkey=true）の間は最後の1台を消させない（消すとPINでも入れず締め出される）
  if ((count || 0) <= 1) {
    const { data: st } = await supabaseAdmin.from("staff").select("require_passkey").eq("id", me.staffId).maybeSingle();
    if (st?.require_passkey === true) {
      return json({ ok: false, error: "最後の1台は削除できません（PINでのログインが止まっているため）。先に別の端末を登録してください" }, 400);
    }
  }
  const { data, error } = await supabaseAdmin.from("webauthn_credentials")
    .delete().eq("id", body.id).eq("staff_id", me.staffId).select("id");
  if (error) return json({ ok: false, error: "削除に失敗しました: " + error.message }, 500);
  if (!data || data.length === 0) return json({ ok: false, error: "見つかりません" }, 404);
  return json({ ok: true, remaining: Math.max(0, (count || 1) - 1) });
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

    if (action === "login_start") return await loginStart(clientIp);
    if (action === "login_finish") return await loginFinish(clientIp, body);

    // ここから下は管理者セッション必須（role は DB で確認）
    const me = await verifySession((body as Record<string, unknown>).token);
    if (!me) return json({ ok: false, error: "セッションが切れました。ログインし直してください" }, 401);
    if (me.role !== "admin") return json({ ok: false, error: "管理者だけが使える機能です" }, 403);

    switch (action) {
      case "register_start": return await registerStart(me);
      case "register_finish": return await registerFinish(me, body);
      case "list": return await listCredentials(me);
      case "rename": return await renameCredential(me, body);
      case "delete": return await deleteCredential(me, body);
      default: return json({ ok: false, error: "不明な操作です" }, 400);
    }
  } catch (e) {
    console.error("auth-passkey error:", e);
    return json({ ok: false, error: "サーバーエラー" }, 500);
  }
});
