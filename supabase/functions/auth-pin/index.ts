// supabase/functions/auth-pin/index_v2.ts
// PIN認証 Edge Function — [v2] セッショントークン発行機能追加
//
// リクエスト: POST { pin: "1234" }
// レスポンス: { ok: true, user: { id, name, role, dailyRate }, sessionToken: "uuid-..." }
//           or { ok: false, error: "..." }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// レート制限: IP毎に10回/分
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
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

// [2026-04-15] 連続失敗ロック: IP毎に5回失敗→30分ロック (DB永続化版)
// 旧: in-memory Map → Edge Function再起動でリセットされる問題対応
const MAX_FAILURES = 5;
const LOCK_DURATION_MS = 30 * 60_000; // 30分
// [2026-09-25] セキュリティ監査 A-2 対応：失敗回数は「最初の失敗から30分」で自然に消える方式に変更。
//   旧実装はログイン成功で失敗カウントを消していたため、「4回はずす→自分のPINで成功」を繰り返すと
//   ロックされずに他人（管理者）のPINを試し続けられた。成功してもカウントは消さない。
//   30分あれば普段の打ち間違い（1〜2回）は次のログインまでに消えるので、スタッフの通常利用には影響しない。
const FAIL_WINDOW_MS = 30 * 60_000;

// [2026-09-25] A-2 対応：全IP合計の失敗回数の上限。
//   PINだけでログインする方式（ID不要）なのでアカウント単位のロックができず、IPを変えられると
//   IP単位のロックだけでは総当たりを止められない。全体で「15分に30回」失敗したら15分間は全員ログイン停止。
//   値の理由：スタッフ約6名が1日数回ログインする程度なら、打ち間違いは15分で数回が上限。30回は攻撃時しか出ない。
//   ※ 攻撃を受けている間は正規スタッフも最大15分ログインできない（ログイン済みの人はそのまま使える）。
const GLOBAL_MAX_FAILURES = 30;
const GLOBAL_WINDOW_MS = 15 * 60_000;
const GLOBAL_LOCK_DURATION_MS = 15 * 60_000;
// 全体カウンタの行キー。clientIp は x-forwarded-for を "," で区切った先頭なので "," を含むことはなく、
// ヘッダ偽装でこの行を上書き（リセット）されることはない。
const GLOBAL_KEY = "global,all";

// pin_fail_locks の1行の意味（テーブル定義は変えない）：
//   failures >= 上限 かつ locked_until が未来 → ロック中（locked_until まで）
//   failures <  上限 かつ locked_until が未来 → 失敗カウント有効期間中（locked_until を過ぎたら 0 扱い）
//   locked_until が過去 or NULL                → カウントなし
async function checkFailLock(key: string, max: number): Promise<{ locked: boolean; remaining?: number }> {
  const { data } = await supabaseAdmin
    .from("pin_fail_locks")
    .select("failures, locked_until")
    .eq("ip", key)
    .maybeSingle();
  if (!data?.locked_until) return { locked: false };
  const lu = new Date(data.locked_until).getTime();
  const now = Date.now();
  if (lu > now) {
    if ((data.failures || 0) >= max) return { locked: true, remaining: Math.ceil((lu - now) / 60_000) };
    return { locked: false };
  }
  // 期限切れ: 削除
  await supabaseAdmin.from("pin_fail_locks").delete().eq("ip", key);
  return { locked: false };
}

async function recordFailure(key: string, max: number, windowMs: number, lockMs: number): Promise<void> {
  const { data } = await supabaseAdmin
    .from("pin_fail_locks")
    .select("failures, locked_until")
    .eq("ip", key)
    .maybeSingle();
  const now = Date.now();
  const lu = data?.locked_until ? new Date(data.locked_until).getTime() : 0;
  const active = lu > now; // 有効期間中のカウントだけ引き継ぐ（期限切れは 0 から数え直す）
  const next = (active ? (data?.failures || 0) : 0) + 1;
  if (next >= max) {
    await supabaseAdmin.from("pin_fail_locks").upsert({
      ip: key, failures: next, locked_until: new Date(now + lockMs).toISOString(),
    });
  } else {
    // 期間は最初の失敗から数える（失敗のたびに延長はしない）
    const until = active ? new Date(lu).toISOString() : new Date(now + windowMs).toISOString();
    await supabaseAdmin.from("pin_fail_locks").upsert({ ip: key, failures: next, locked_until: until });
  }
}

// [2026-05-21] role別セッション期限：admin 12時間 / その他（スタッフ） 30分
// ポーリング廃止に伴い、再ログインで最新データ反映する設計に変更
const SESSION_TTL_MINUTES_ADMIN = 12 * 60;  // 12時間
const SESSION_TTL_MINUTES_STAFF = 30;        // 30分

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ ok: false, error: "認証試行回数が上限を超えました。1分後に再試行してください。" }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { pin } = body;

    if (!pin || typeof pin !== "string" || pin.length < 4 || pin.length > 6 || !/^\d{4,6}$/.test(pin)) {
      return new Response(
        JSON.stringify({ ok: false, error: "PINは4〜6桁の数字で入力してください" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 連続失敗ロックチェック
    const lockCheck = await checkFailLock(clientIp, MAX_FAILURES);
    if (lockCheck.locked) {
      return new Response(
        JSON.stringify({ ok: false, error: `ログインがロックされています。${lockCheck.remaining}分後に再試行してください。` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // [2026-09-25] A-2 対応：全体の失敗上限チェック（総当たり攻撃を受けている間は全員一時停止）
    const globalCheck = await checkFailLock(GLOBAL_KEY, GLOBAL_MAX_FAILURES);
    if (globalCheck.locked) {
      return new Response(
        JSON.stringify({ ok: false, error: `ログインを一時停止しています。${globalCheck.remaining}分後に再試行してください。` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: staffRows, error } = await supabaseAdmin
      .from("staff")
      .select("id, name, pin, pin_hash, role, daily_rate, is_executive");

    if (error || !staffRows) {
      return new Response(
        JSON.stringify({ ok: false, error: "DB接続エラー" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let matched = null;
    for (const s of staffRows) {
      if (s.pin_hash) {
        const { data: hashCheck } = await supabaseAdmin.rpc("verify_pin", {
          input_pin: pin,
          stored_hash: s.pin_hash,
        });
        if (hashCheck === true) {
          matched = s;
          break;
        }
      } else if (s.pin === pin) {
        matched = s;
        break;
      }
    }

    if (!matched) {
      await recordFailure(clientIp, MAX_FAILURES, FAIL_WINDOW_MS, LOCK_DURATION_MS);
      await recordFailure(GLOBAL_KEY, GLOBAL_MAX_FAILURES, GLOBAL_WINDOW_MS, GLOBAL_LOCK_DURATION_MS);
      return new Response(
        JSON.stringify({ ok: false, error: "PINが一致しません" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // [2026-09-25] A-2 対応：認証成功しても失敗カウントはリセットしない（時間経過でのみ消える）

    // [2026-09-26] パスキー段階2用：staff.require_passkey=true の人は PIN ではログインさせない（auth-passkey を使う）。
    //   既定は全員 false なので、フラグを立てるまで何も変わらない。
    //   上の select に列を足さず別クエリにしているのは、migration 091 の適用前にこの関数を出しても
    //   「列が無い」エラーで全員のPINログインが止まる事故を防ぐため（列が無い・読めない時は false 扱い）。
    const { data: pkFlag, error: pkErr } = await supabaseAdmin
      .from("staff").select("require_passkey").eq("id", matched.id).maybeSingle();
    if (pkErr) console.error("auth-pin: require_passkey read failed (false扱い):", pkErr.message);
    // [2026-09-29] 管理者の入口をGoogleログインに切り替えたため、案内文を「Googleでログイン」に変更。
    //   フラグ名は require_passkey のままだが、意味は「このアカウントはPINで入れない」スイッチとして使う（s5 に true でPIN停止）
    if (pkFlag?.require_passkey === true) {
      return new Response(
        JSON.stringify({ ok: false, error: "このアカウントはPINではログインできません。管理者画面（/admin）を開いて「Googleでログイン」を押してください" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── [v2] セッショントークン発行 ──
    // 期限切れセッションをクリーンアップ
    try { await supabaseAdmin.rpc("cleanup_expired_sessions"); } catch (_) { /* ignore */ }

    const sessionToken = crypto.randomUUID();
    const ttlMinutes = matched.role === "admin" ? SESSION_TTL_MINUTES_ADMIN : SESSION_TTL_MINUTES_STAFF;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    const { error: sessionError } = await supabaseAdmin
      .from("sessions")
      .insert({
        staff_id: matched.id,
        token: sessionToken,
        expires_at: expiresAt,
      });

    if (sessionError) {
      return new Response(
        JSON.stringify({ ok: false, error: "セッション作成エラー" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: matched.id,
          name: matched.name,
          role: matched.role,
          dailyRate: matched.daily_rate,
          isExecutive: matched.is_executive || false,
        },
        sessionToken,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("auth-pin error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: "サーバーエラー" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
