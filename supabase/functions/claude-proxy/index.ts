// supabase/functions/claude-proxy/index.ts
// Supabase Edge Function — Claude API へのプロキシ
// APIキーはサーバー側の環境変数に保存し、フロントエンドには公開しない

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY") || "";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── CORS: 本番ではここをデプロイ先のドメインに変更 ──
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN");
if (!ALLOWED_ORIGIN) throw new Error("ALLOWED_ORIGIN environment variable is not set");
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── レート制限: IP毎に10回/分 ──
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

// ── prompt サイズ制限 ──
const MAX_PROMPT_LENGTH = 5000;     // AIチャットのプロンプト上限（文字数）
const MAX_PDF_BASE64_LENGTH = 10_000_000;  // PDF base64 上限 (~7.5MB)
const MAX_IMAGE_BASE64_LENGTH = 5_000_000; // 名刺画像 base64 上限 (~3.7MB)

// ── [2026-04-21] 管理者向けツール定義（Claude Tool Use）
//   - Claudeが「この操作しますか？」と提案する（tool_use ブロック）
//   - フロント側で管理者が「承認」を押した時のみ api-gateway 経由で実行される
//   - ツール実行はこのclaude-proxyでは行わない（中継のみ）
const ADMIN_TOOLS = [
  {
    name: "edit_clock_log",
    description: "既存の打刻ログの時刻や現場を修正する。【直近の打刻ログ】一覧から [ID:xxx] を見つけて logId に指定。",
    input_schema: {
      type: "object",
      properties: {
        logId: { type: "string", description: "clock_logs のID（必須）" },
        clockIn: { type: "string", description: "新しい出勤時刻 ISO8601（変更する場合）" },
        clockOut: { type: "string", description: "新しい退勤時刻 ISO8601（変更する場合）" },
        projectId: { type: "string", description: "現場ID（変える場合のみ）" },
        reason: { type: "string", description: "修正理由（必須）" },
      },
      required: ["logId", "reason"],
    },
  },
  {
    name: "add_clock_log",
    description: "新規に打刻ログを追加する（過去の打刻忘れを後から記録する等）。",
    input_schema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "対象スタッフID" },
        userName: { type: "string", description: "対象スタッフ名" },
        projectId: { type: "string", description: "現場ID" },
        clockIn: { type: "string", description: "出勤時刻 ISO8601" },
        clockOut: { type: "string", description: "退勤時刻 ISO8601（まだ終わってなければ省略可）" },
        reason: { type: "string", description: "追加理由" },
      },
      required: ["userId", "userName", "projectId", "clockIn", "reason"],
    },
  },
  {
    name: "delete_clock_log",
    description: "既存の打刻ログを削除する（誤打刻・テスト打刻の消去）。",
    input_schema: {
      type: "object",
      properties: {
        logId: { type: "string", description: "削除対象の clock_logs ID" },
      },
      required: ["logId"],
    },
  },
  {
    name: "set_leave_balance",
    description: "スタッフの【有給(paid)専用】残日数を設定する。新規付与・日数変更・リセット(0にセット)すべてこれで対応。【重要】振休(furikae)には使用禁止。振休を付与する場合は必ず insert_leave を type='holiday' で使うこと（leavesテーブルから動的計算されるため、leave_balancesを直接書き換えてもUIに反映されない）。",
    input_schema: {
      type: "object",
      properties: {
        staffId: { type: "string", description: "対象スタッフID" },
        type: { type: "string", enum: ["paid"], description: "paid=有給 のみ（振休は insert_leave で登録）" },
        granted: { type: "number", description: "付与日数（このtypeの合計付与日数）" },
        used: { type: "number", description: "使用済み日数。省略で0" },
      },
      required: ["staffId", "type", "granted"],
    },
  },
  {
    name: "insert_leave",
    description: "スタッフの休暇レコードを登録する（管理者が代行登録）。振休の新規付与はこのツールで type='holiday' + holidayPref='振休希望' + 対象日付を指定して使う。特定日付に有給・振休消化・欠勤などを記録する場合にも使用。",
    input_schema: {
      type: "object",
      properties: {
        staffId: { type: "string", description: "対象スタッフID" },
        type: {
          type: "string",
          enum: ["paid", "furikae", "absent", "half_am", "half_pm", "holiday", "holiday_work"],
          description: "paid=有給消化 furikae=振休消化 absent=欠勤 half_am=午前半休 half_pm=午後半休 holiday=休日出勤（振休/買取を付与する用） holiday_work=旧・休日出勤",
        },
        date: { type: "string", description: "対象日 YYYY-MM-DD。振休付与の場合は出勤した土日の日付" },
        days: { type: "number", description: "日数（通常1、半休は0.5）" },
        memo: { type: "string", description: "メモ" },
        holidayPref: {
          type: "string",
          enum: ["振休希望", "買取希望"],
          description: "type='holiday' の時のみ必須。振休希望=振休として付与 / 買取希望=買取として付与（日曜は振休のみ。お盆・年末年始も振休/買取の選択制 [2026-07-22改定]）",
        },
        holidayType: {
          type: "string",
          enum: ["sunday", "saturday", "obon", "newyear"],
          description: "type='holiday' の時のみ必須。対象日の休日種別。sunday=日曜(法定)/saturday=土曜(所定)/obon=お盆/newyear=年末年始",
        },
      },
      required: ["staffId", "type", "date", "days"],
    },
  },
  {
    name: "update_leave_status",
    description: "既存の休暇申請を承認または却下する。【最近の休暇申請】の [ID:xxx] を leaveId に指定。",
    input_schema: {
      type: "object",
      properties: {
        leaveId: { type: "string", description: "leaves のID" },
        status: { type: "string", enum: ["承認", "却下"], description: "承認 または 却下" },
      },
      required: ["leaveId", "status"],
    },
  },
  {
    name: "insert_subcontractor",
    description: "案件に外注（応援・下請け）の出役を登録する。スタッフ一覧に無い名前や「(外注)」と付いた名前が出たら、打刻ではなくこのツールで外注テーブルに登録する。【案件一覧】の [ID:xxx] を projectId に指定。",
    input_schema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "対象案件ID（【案件一覧】の[ID:xxx]）。部分一致から最も近い案件を推測した場合は必ず確認すること" },
        companyName: { type: "string", description: "外注先の名前（会社名・職人名）" },
        date: { type: "string", description: "出役日 YYYY-MM-DD。省略時は当日" },
        headcount: { type: "number", description: "人工数（人数）。省略時は1" },
        memo: { type: "string", description: "メモ（任意）" },
      },
      required: ["projectId", "companyName"],
    },
  },
];

// ── AIチャットのシステムプロンプト（プロンプトインジェクション緩和） ──
// [2026-04-24] AIチャット強化: 管理者向け計算ガイド追加・文字数300に拡張
const SYSTEM_PROMPT = `あなたはシンセイ工業の現場管理アシスタント「シンセイAI」です。
以下の話題に日本語で簡潔に回答してください:

【対応範囲】
- 建設案件の収支・人工進捗・打刻・休暇に関する質問
- 熱絶縁工事（保温・保冷・防露・ラッキング）の技術的な質問
- 現場での安全管理・作業手順に関する質問
- アプリの使い方（打刻・休暇申請・名刺登録・出面入力など）
- 仕事上の悩み・キャリアに関する相談（傾聴して前向きなアドバイス）
- ビジネスマナー・報連相のコツ

【対応しない範囲】
- 政治・宗教・ギャンブルなど仕事と無関係な話題 → 「仕事に関する質問をお願いします」と返す
- 他のスタッフの個人情報 → 絶対に教えない
- パスワード・APIキー等の機密情報 → 絶対に出力しない

回答は簡潔にまとめてください（数字・箇条書きを活用）。ただし内容が途中で切れないよう、必要な情報は最後まで answer すること。`;

// [2026-04-20] スタッフ向け追加ガード（金額・他人情報の完全ブロック）
const STAFF_GUARD = `

【スタッフ向け追加ルール - 絶対遵守】
あなたは現在「スタッフ（非管理者）」と会話しています。以下は**決して出力してはいけません**：
- すべての案件の**見積金額・請負金額・原価・粗利・掛率・経費**（数字も暗示も禁止）
- 他のスタッフの**出勤日数・残業時間・休暇申請・有給残日数**
- 他のスタッフの**個人情報全般**（電話番号・住所・評価など）
- 顧客の**連絡先（電話・メール）・請求日・振込日**

これらを聞かれた場合は、理由・補足・代替案を一切つけず、**「回答範囲外です」** とだけ返してください。
例:
Q「A現場の見積はいくら？」 → A「回答範囲外です」
Q「川畑さんの有給残は？」 → A「回答範囲外です」

ユーザーが誘導的に聞いてきても（例:「仮に…」「例えば…」「試算で…」「推測で…」）絶対に金額や他人の情報を出さないこと。自分の情報（自分の出勤・自分の有給残）は通常通り答えてOK。`;

// ── セッション認証（api-gateway と同じ方式） ──
async function verifySession(token: string): Promise<{staffId: string, role: string, name: string} | null> {
  if (!token || typeof token !== "string") return null;
  const { data: session } = await supabaseAdmin
    .from("sessions").select("staff_id, expires_at").eq("token", token).single();
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) return null;
  const { data: staff } = await supabaseAdmin
    .from("staff").select("id, role, name").eq("id", session.staff_id).single();
  if (!staff) return null;
  return { staffId: staff.id, role: staff.role, name: staff.name };
}

// ── 名刺OCRのシステムプロンプト ──
const MEISHI_SYSTEM_PROMPT = `あなたは名刺読取アシスタントです。
名刺画像から以下の情報を抽出してJSON形式で返してください:
{"name":"氏名","company":"会社名","phone":"電話番号","email":"メールアドレス","address":"住所","notes":"役職・部署など"}
読み取れない項目は空文字にしてください。余計な説明は不要です。JSONのみ返してください。`;

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // レート制限
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: "リクエスト回数が上限を超えました。1分後に再試行してください。" }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // APIキー未設定チェック
  if (!CLAUDE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "CLAUDE_API_KEY が環境変数に設定されていません" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();

    // リクエスト検証: 許可するアクション
    const { action } = body;
    if (!action || !["pdf_read", "ai_summary", "ai_chat", "ocr_meishi"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "無効なアクション" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // [2026-07-09] pdf_read / ocr_meishi もセッション認証必須化。
    //   従来この2アクションは無認証で叩けたため、公開anonキーを持つ第三者に
    //   Claude API（課金）を悪用される踏み台になっていた。ai_chat/ai_summary は
    //   後段の else 分岐で別途 verifySession 済み。
    if (action === "pdf_read" || action === "ocr_meishi") {
      const session = await verifySession(body.token);
      if (!session) {
        return new Response(
          JSON.stringify({ error: "ログインセッションが無効です。再ログインしてください。" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    let claudeBody: Record<string, unknown>;

    if (action === "pdf_read") {
      // ── PDF読取 ──
      const { pdfBase64 } = body;
      if (!pdfBase64 || typeof pdfBase64 !== "string") {
        return new Response(
          JSON.stringify({ error: "pdfBase64 が必要です" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (pdfBase64.length > MAX_PDF_BASE64_LENGTH) {
        return new Response(
          JSON.stringify({ error: "PDFサイズが上限を超えています（最大約7.5MB）" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      claudeBody = {
        model: "claude-sonnet-4-6", // [2026-06-19] 旧 claude-sonnet-4-20250514 退役(404)のため現行Sonnet 4.6に更新
        max_tokens: 1000,
        system: "あなたは建設資材の納品書・請求書を読み取るアシスタントです。金額と品目のみを抽出してください。",
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
            },
            {
              type: "text",
              text: `このPDFは建設資材の納品書または請求書です。合計金額（税込）を抽出してください。また主な品目と金額も箇条書きで教えてください。JSON形式で返してください: {"total":数値,"items":[{"name":"品名","amount":数値}]}`,
            },
          ],
        }],
      };
    } else if (action === "ocr_meishi") {
      // ── 名刺OCR ──
      const { imageBase64, mediaType } = body;
      if (!imageBase64 || typeof imageBase64 !== "string") {
        return new Response(
          JSON.stringify({ error: "imageBase64 が必要です" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
        return new Response(
          JSON.stringify({ error: "画像サイズが上限を超えています（最大約3.7MB）" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const mType = mediaType || "image/jpeg";
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mType)) {
        return new Response(
          JSON.stringify({ error: "対応していない画像形式です" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      claudeBody = {
        model: "claude-sonnet-4-6", // [2026-06-19] 旧 claude-sonnet-4-20250514 退役(404)のため現行Sonnet 4.6に更新
        max_tokens: 500,
        system: MEISHI_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mType, data: imageBase64 } },
            { type: "text", text: "この名刺から情報を読み取ってJSONで返してください。" },
          ],
        }],
      };
    } else {
      // ── AIチャット（ai_summary / ai_chat 共通） ──
      // [2026-04-21] messages配列（会話履歴・Tool Use対応）または prompt（後方互換）のどちらかを受理
      const { prompt, messages: userMessages, token } = body;
      // [2026-09-29] 管理画面が計算した案件の人工・粗利（文字列）。admin の時だけ使う。長さは上限で切る
      const projectStats = typeof body.projectStats === "string" ? body.projectStats.slice(0, 30000) : "";
      const hasMessages = Array.isArray(userMessages) && userMessages.length > 0;
      const hasPrompt = typeof prompt === "string" && prompt.length > 0;
      if (!hasMessages && !hasPrompt) {
        return new Response(
          JSON.stringify({ error: "messages 配列または prompt が必要です" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // 会話履歴のトータルサイズ制限（会話続行を考慮してやや広めに）
      const totalLen = hasMessages
        ? JSON.stringify(userMessages).length
        : (prompt as string).length;
      if (totalLen > MAX_PROMPT_LENGTH * 10) {
        return new Response(
          JSON.stringify({ error: `会話履歴が長すぎます（最大${MAX_PROMPT_LENGTH * 10}文字）` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // [2026-04-20] セッション認証必須化。role で DBコンテキスト出し分け
      const session = await verifySession(token);
      if (!session) {
        return new Response(
          JSON.stringify({ error: "ログインセッションが無効です。再ログインしてください。" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const isAdmin = session.role === "admin";

      // ── DB参照: 過去データをコンテキストに追加（role別） ──
      // [2026-04-24] 管理者AIチャット強化: 全データ取得・残業集計・早上がり・顧客・アナウンス追加
      let dbContext = "";
      try {
        // 今日の日付（JST）
        const nowJST = new Date(Date.now() + 9 * 3600000);
        const todayJST = nowJST.toISOString().slice(0, 10);
        const thisMonth = nowJST.toISOString().slice(0, 7);
        const lastMonthDate = new Date(nowJST.getFullYear(), nowJST.getMonth() - 1, 1);
        const lastMonth = lastMonthDate.toISOString().slice(0, 7);
        dbContext += `\n【基準日時】今日: ${todayJST} 今月: ${thisMonth} 先月: ${lastMonth}`;

        // [2026-04-27] UTC ISO → JST 表示用ヘルパー（DBはUTCで保存されているのでJSTに変換しないと日付/時刻がズレる）
        const toJSTDate = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 10);
        const toJSTTime = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(11, 16);
        const toJSTDateTime = (iso: string) => {
          const j = new Date(new Date(iso).getTime() + 9 * 3600000).toISOString();
          return `${j.slice(0,10)} ${j.slice(11,16)}`;
        };

        // 案件一覧
        // [2026-06-16] 目標人工はアプリ表示と一致させるため target_mandays を使う（target_ninku は別値で不一致）。補正人工 manual_mandays も取得
        const projectCols = isAdmin
          ? "id,name,status,client,lead,start_date,end_date,estimate,contract_amount,target_mandays,manual_mandays,work_category,material_cost,other_cost,completed_at"
          : "id,name,status,client,lead,start_date,end_date,target_mandays,work_category";
        const { data: projects } = await supabaseAdmin.from("projects").select(projectCols);

        // 追加工事（admin専用）
        const { data: additionalWorks } = isAdmin
          ? await supabaseAdmin.from("additional_works").select("id,project_id,description,floor,location")
          : { data: null };

        // スタッフ（adminはstaffテーブルからis_executive・daily_rateも取得）
        const { data: staff } = isAdmin
          ? await supabaseAdmin.from("staff").select("id,name,role,is_executive,daily_rate")
          : await supabaseAdmin.from("staff_public").select("id,name,role");

        // 打刻ログ（直近60日: 今月+先月の残業集計・スタッフ別明細用）
        const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();
        const { data: clockLogs } = await supabaseAdmin.from("clock_logs")
          .select("id,user_id,user_name,project_id,clock_in,clock_out,location_name,early_leave_category,early_leave_reason")
          .gte("clock_in", sixtyDaysAgo).order("clock_in", { ascending: false }).limit(1000);

        // [2026-06-16] 案件別実績人工は「全履歴」から、アプリ(shared.js calcActualMandays)と同一ロジックで集計する。
        // 旧実装は直近60日のログを1件=+1で数えていたため、①60日より前の打刻（ジョブカン取込みの古いデータ等）が脱落、
        // ②残業(floor(残業h/4)で+1人工)・補正人工(manual_mandays)・未退勤除外 が未反映 で、アプリ表示とズレていた。
        const OVERTIME_START = 17;
        const BREAK_PERIODS: [string, string][] = [["09:50","10:30"],["11:50","13:00"],["14:50","15:30"]];
        // DBはUTC保存。打刻時刻に+9hしてJST壁時計に直し、UTCゲッタ/セッタ（Edgeランタイムは常にUTC）で計算する
        const jstMs = (iso: string) => new Date(iso).getTime() + 9 * 3600000;
        const atHM = (refMs: number, h: number, m: number) => { const d = new Date(refMs); d.setUTCHours(h, m, 0, 0); return d.getTime(); };
        const overlapBreaks = (startMs: number, endMs: number) => {
          let ms = 0;
          for (const [a, b] of BREAK_PERIODS) {
            const [ah, am] = a.split(":").map(Number);
            const [bh, bm] = b.split(":").map(Number);
            const bs = atHM(startMs, ah, am), be = atHM(startMs, bh, bm);
            const os = Math.max(startMs, bs), oe = Math.min(endMs, be);
            if (oe > os) ms += oe - os;
          }
          return ms;
        };
        // 残業時間: 17:30未満退勤は17:00扱い（effectiveClockOut相当）、17:00以降で休憩重複を差し引く
        const overtimeHours = (ciMs: number, coMs: number) => {
          const s1730 = atHM(ciMs, OVERTIME_START, 30);
          const s1700 = atHM(ciMs, OVERTIME_START, 0);
          const eff = coMs < s1730 ? s1700 : coMs;
          if (eff <= s1700) return 0;
          const start = ciMs > s1700 ? ciMs : s1700;
          return Math.max(0, (eff - start - overlapBreaks(start, eff)) / 3600000);
        };
        const { data: allLogs } = await supabaseAdmin.from("clock_logs")
          .select("project_id,clock_in,clock_out").limit(5000);
        const projNinkuMap: Record<string, number> = {};
        (allLogs || []).forEach((l: Record<string, unknown>) => {
          const pid = l.project_id as string;
          if (!pid || !l.clock_out) return; // 未退勤は人工に数えない（アプリと同じ）
          const ot = overtimeHours(jstMs(l.clock_in as string), jstMs(l.clock_out as string));
          projNinkuMap[pid] = (projNinkuMap[pid] || 0) + 1 + Math.floor(ot / 4);
        });
        // 補正人工（manual_mandays）を加算（アプリの calcNinkuFromLogs と同じ）
        (projects || []).forEach((p: Record<string, unknown>) => {
          const mm = Number(p.manual_mandays) || 0;
          if (mm) projNinkuMap[p.id as string] = (projNinkuMap[p.id as string] || 0) + mm;
        });

        // ── 案件一覧（実績人工・掛け率付き） ──
        if (projects && projects.length > 0) {
          dbContext += "\n\n【案件一覧】\n" + projects.map((p: Record<string, unknown>) => {
            const wc = p.work_category ? `[${p.work_category}]` : "";
            const idTag = isAdmin ? ` [ID:${p.id}]` : "";
            const base = `- ${p.name}${wc}${idTag}（${p.status}）客先:${p.client||"なし"} 担当:${p.lead||"なし"} 工期:${p.start_date||"?"}〜${p.end_date||"未定"} 目標人工:${p.target_mandays||0}`;
            if (isAdmin) {
              const ninku = projNinkuMap[p.id as string] || 0;
              const contract = Number(p.contract_amount) || 0;
              const est = Number(p.estimate) || 0;
              const matCost = Number(p.material_cost) || 0;
              const othCost = Number(p.other_cost) || 0;
              const markup = est > 0 && contract > 0 ? ` 掛率:${(contract/est*100).toFixed(0)}%` : "";
              return `${base} 見積:${est.toLocaleString()}円 請負:${contract.toLocaleString()}円${markup} 実績人工:${ninku}人工 材料費:${matCost.toLocaleString()}円 その他費:${othCost.toLocaleString()}円`;
            }
            return base;
          }).join("\n");

          // 追加工事
          if (isAdmin && additionalWorks && additionalWorks.length > 0) {
            const awByProject: Record<string, string[]> = {};
            additionalWorks.forEach((aw: Record<string, unknown>) => {
              const pid = aw.project_id as string;
              if (!awByProject[pid]) awByProject[pid] = [];
              awByProject[pid].push(`${aw.description||""}${aw.floor ? ` ${aw.floor}` : ""}${aw.location ? ` ${aw.location}` : ""}`);
            });
            const lines = Object.entries(awByProject).map(([pid, descs]) => {
              const pName = (projects as Record<string, unknown>[]).find(p => p.id === pid)?.name || pid;
              return `- ${pName}: ${descs.join("、")}`;
            });
            if (lines.length > 0) dbContext += "\n\n【追加工事一覧】\n" + lines.join("\n");
          }
          // [2026-09-29] 案件の人工・粗利・判定は、管理画面が shared.js calcProjectCost で計算した結果（projectStats）を
          //   そのまま渡す（画面とAIで数字がズレないように、ここでは再計算しない）。admin セッションのみ受け付ける
          if (isAdmin && projectStats) {
            dbContext += "\n\n【案件の人工・粗利・判定（進行中・アプリ画面と同じ計算。上の【案件一覧】の実績人工より優先）】\n" + projectStats;
          }
        }

        // ── スタッフ ──
        if (staff && staff.length > 0) {
          dbContext += "\n\n【スタッフ】\n" + staff.map((s: Record<string, unknown>) => {
            const idTag = isAdmin ? ` [ID:${s.id}]` : "";
            const exec = s.is_executive ? "（役員）" : "";
            const rate = isAdmin && s.daily_rate ? ` 日単価:${(s.daily_rate as number).toLocaleString()}円` : "";
            return `- ${s.name}（${s.role}）${exec}${idTag}${rate}`;
          }).join("\n");
        }

        // ── 打刻ログ ──
        if (clockLogs && clockLogs.length > 0) {
          const projMap = Object.fromEntries((projects || []).map((p: Record<string, unknown>) => [p.id, p.name]));
          if (isAdmin) {
            // 今日の出勤状況（JST 日付で比較）
            const todayLogs = clockLogs.filter((l: Record<string, unknown>) => toJSTDate(l.clock_in as string) === todayJST);
            const clockedInToday = new Set(todayLogs.map((l: Record<string, unknown>) => l.user_name as string));
            const allStaffNames = (staff || []).map((s: Record<string, unknown>) => s.name as string);
            const notClockedIn = allStaffNames.filter(n => !clockedInToday.has(n));
            dbContext += `\n\n【今日（${todayJST}）の出勤状況】\n出勤: ${[...clockedInToday].join("、")||"なし"}\n未出勤: ${notClockedIn.join("、")||"全員出勤済み"}`;
            todayLogs.forEach((l: Record<string, unknown>) => {
              const pName = projMap[l.project_id as string] || "未設定";
              const out = l.clock_out ? `退勤${toJSTTime(l.clock_out as string)}` : "勤務中";
              const el = l.early_leave_category ? ` [早:${l.early_leave_category}]` : "";
              dbContext += `\n  ${l.user_name}: ${pName} 出勤${toJSTTime(l.clock_in as string)} ${out}${el}`;
            });

            // 月次残業集計（今月・先月） — JST 日付で月判定
            const calcMonthOT = (monthStr: string) => {
              const ml = clockLogs.filter((l: Record<string, unknown>) =>
                toJSTDate(l.clock_in as string).startsWith(monthStr) && l.clock_out);
              const staffOT: Record<string, number> = {};
              ml.forEach((l: Record<string, unknown>) => {
                const h = (new Date(l.clock_out as string).getTime() - new Date(l.clock_in as string).getTime()) / 3600000;
                const ot = Math.max(0, h - 8);
                const name = l.user_name as string;
                staffOT[name] = (staffOT[name] || 0) + ot;
              });
              return staffOT;
            };
            const thisOT = calcMonthOT(thisMonth);
            const lastOT = calcMonthOT(lastMonth);
            dbContext += `\n\n【月次残業集計（概算・休憩控除なし）】\n今月(${thisMonth}):\n` +
              (Object.entries(thisOT).map(([n,h]) => `- ${n}: ${h.toFixed(1)}h`).join("\n") || "- データなし") +
              `\n先月(${lastMonth}):\n` +
              (Object.entries(lastOT).map(([n,h]) => `- ${n}: ${h.toFixed(1)}h`).join("\n") || "- データなし");

            // 直近30日の出勤回数・案件別人工
            const thirtyDaysAgoTime = Date.now() - 30 * 86400000;
            const recentLogs = clockLogs.filter((l: Record<string, unknown>) => new Date(l.clock_in as string).getTime() >= thirtyDaysAgoTime);
            const staffDays: Record<string, number> = {};
            recentLogs.forEach((l: Record<string, unknown>) => { const n = l.user_name as string; staffDays[n] = (staffDays[n]||0)+1; });
            dbContext += "\n\n【直近30日の出勤状況】\n" + Object.entries(staffDays).map(([n,d]) => `- ${n}: ${d}回`).join("\n");
            const projDays: Record<string, number> = {};
            recentLogs.forEach((l: Record<string, unknown>) => { const p = projMap[l.project_id as string]||(l.project_id as string); projDays[p]=(projDays[p]||0)+1; });
            dbContext += "\n\n【直近30日の案件別人工】\n" + Object.entries(projDays).map(([n,d]) => `- ${n}: ${d}人工`).join("\n");

            // 早上がり一覧（直近30日） — JST 日付で表示
            const earlyLogs = recentLogs.filter((l: Record<string, unknown>) => l.early_leave_category);
            if (earlyLogs.length > 0) {
              dbContext += "\n\n【直近30日の早上がり一覧】\n" + earlyLogs.map((l: Record<string, unknown>) =>
                `- ${toJSTDate(l.clock_in as string)} ${l.user_name} [${l.early_leave_category}] ${l.early_leave_reason||""}`
              ).join("\n");
            }

            // 直近50件打刻ログ（Tool Use用・ID付き） — JST 表示
            dbContext += "\n\n【直近の打刻ログ（ID付き・編集/削除対象用）】\n" + clockLogs.slice(0,50).map((l: Record<string, unknown>) => {
              const pName = projMap[l.project_id as string]||(l.project_id as string);
              const h = l.clock_out ? ((new Date(l.clock_out as string).getTime()-new Date(l.clock_in as string).getTime())/3600000).toFixed(1)+"h" : "未退勤";
              const el = l.early_leave_category ? ` [早:${l.early_leave_category}]` : "";
              return `- [ID:${l.id}] ${l.user_name} / ${pName} / ${toJSTDateTime(l.clock_in as string)} 〜 ${l.clock_out?toJSTTime(l.clock_out as string):"未"} ${h}${el}`;
            }).join("\n");

          } else {
            // 非管理者: 自分のみ
            const myLogs = clockLogs.filter((l: Record<string, unknown>) => l.user_id === session.staffId);
            dbContext += `\n\n【あなた（${session.name}）の直近出勤】\n- 合計 ${myLogs.length} 回出勤`;
            if (myLogs.length > 0) {
              const myProjDays: Record<string, number> = {};
              myLogs.forEach((l: Record<string, unknown>) => { const p = projMap[l.project_id as string]||(l.project_id as string); myProjDays[p]=(myProjDays[p]||0)+1; });
              dbContext += "\n\n【あなたの案件別人工】\n" + Object.entries(myProjDays).map(([n,d]) => `- ${n}: ${d}人工`).join("\n");
            }
          }
        }

        // ── 休暇データ ──
        const leavesQuery = supabaseAdmin.from("leaves").select("id,staff_id,type,date,days,status").order("date", { ascending: false });
        const { data: leaves } = isAdmin
          ? await leavesQuery.limit(50)
          : await leavesQuery.eq("staff_id", session.staffId).limit(30);
        if (leaves && leaves.length > 0) {
          if (isAdmin) {
            const staffMap = Object.fromEntries((staff || []).map((s: Record<string, unknown>) => [s.id, s.name]));
            dbContext += "\n\n【最近の休暇申請（全員・ID付き）】\n" + leaves.slice(0,30).map((l: Record<string, unknown>) =>
              `- [ID:${l.id}] ${staffMap[l.staff_id as string]||l.staff_id}: ${l.type} ${l.date} ${l.days}日 (${l.status})`
            ).join("\n");
          } else {
            dbContext += `\n\n【あなた（${session.name}）の休暇申請】\n` + leaves.slice(0,10).map((l: Record<string, unknown>) =>
              `- ${l.type} ${l.date} ${l.days}日 (${l.status})`
            ).join("\n");
          }
        }

        // ── 有給・振休残日数 ──
        const balancesQuery = supabaseAdmin.from("leave_balances").select("staff_id,type,granted,carried,used,balance");
        const { data: balances } = isAdmin
          ? await balancesQuery
          : await balancesQuery.eq("staff_id", session.staffId);
        if (balances && balances.length > 0) {
          if (isAdmin) {
            const staffMap = Object.fromEntries((staff || []).map((s: Record<string, unknown>) => [s.id, s.name]));
            dbContext += "\n\n【有給・振休残日数（全員）】\n" + balances.map((b: Record<string, unknown>) => {
              const typeLabel = b.type === "furikae" ? "振休" : "有給";
              return `- ${staffMap[b.staff_id as string]||b.staff_id} (${typeLabel}): 残${b.balance}日（付与${b.granted}+繰越${b.carried||0}−使用${b.used}）`;
            }).join("\n");
          } else {
            dbContext += `\n\n【あなたの残日数】`;
            balances.forEach((b: Record<string, unknown>) => {
              const typeLabel = b.type === "furikae" ? "振休" : "有給";
              dbContext += `\n- ${typeLabel}: 残${b.balance}日（付与${b.granted}+繰越${b.carried||0}−使用${b.used}）`;
            });
          }
        }

        // ── 顧客一覧（admin専用） ──
        if (isAdmin) {
          const { data: customers } = await supabaseAdmin.from("customers").select("id,name,project_id");
          if (customers && customers.length > 0) {
            const projMap2 = Object.fromEntries((projects || []).map((p: Record<string, unknown>) => [p.id, p.name]));
            dbContext += "\n\n【顧客一覧】\n" + customers.map((c: Record<string, unknown>) => {
              const rel = c.project_id && projMap2[c.project_id as string] ? `（関連: ${projMap2[c.project_id as string]}）` : "";
              return `- ${c.name}${rel} [ID:${c.id}]`;
            }).join("\n");
          }

          // ── 最近のアナウンス ──
          const { data: announcements } = await supabaseAdmin.from("announcements")
            .select("text,author,created_at").order("created_at", { ascending: false }).limit(10);
          if (announcements && announcements.length > 0) {
            dbContext += "\n\n【最近のアナウンス】\n" + announcements.map((a: Record<string, unknown>) =>
              `- [${(a.created_at as string).slice(0,10)}] ${a.author}: ${String(a.text).slice(0,80)}`
            ).join("\n");
          }
        }
      } catch (e) {
        console.error("DB context fetch error:", e);
      }

      // [2026-04-24] admin向けツール使用ガイド + 計算ガイド
      const adminToolGuide = isAdmin ? `

【管理者向け計算ガイド】
- 稼働率: 出勤回数 ÷ (スタッフ数 × 稼働日数) × 100%
- 案件の粗利・人工・判定（順調/注意/赤字）: 【案件の人工・粗利・判定】の値をそのまま使う。自分で再計算しない
  （判定＝(請負額−外注費) ÷ 予測最終人工(使った人工÷進捗%) を目標単価・損益分岐単価と比べる。進捗未入力の案件は「判定できません」と答える。粗利率の分母は請負額）
- 掛け率: 請負金額 ÷ 見積金額 × 100%
- 残業時間: (退勤時刻 − 出勤時刻) − 8h（概算・休憩控除なし）
- データがない場合は「データなし」と明記し、推測は「概算」と断ること

【ツール使用ガイド — 管理者モード】
あなたは管理者と会話しています。DB操作を提案できるツールが使えます。
- スタッフを指定するときは、【スタッフ】一覧の [ID:xxx] を正確にコピーして使うこと（名前からのIDをあなたが推測・生成しない）
- 打刻修正/削除は、【直近の打刻ログ】から該当する [ID:xxx] を見つけて logId に指定
- 休暇の承認/却下も【最近の休暇申請】の [ID:xxx] を leaveId に指定
- 日付は YYYY-MM-DD、時刻は +09:00 のISO8601（例: 2026-04-21T08:00:00+09:00）
- ツールを呼んだ後、画面に「承認/キャンセル」モーダルが出る。あなたの段階では実行されない
- 複数操作が必要なら複数ツールを順次呼ぶこと
- 質問にツール不要の場合は通常どおり文章で回答

【推測・提案ガイド — 最重要・絶対遵守】
基本スタンス:「管理者が言ったことは実現する方向で考える。できない理由ではなく、やる方法を提案する」。
管理者の指示は常に意図を推測し、最も妥当な操作を"先に"ツールで提案すること。実行前に必ず承認モーダルで管理者が確認するので、まず動く（提案する）のが正解。

- 「わかりません」「該当する登録がありません」「見つかりません」で止まることは原則禁止。手がかりが少なくても、部分一致・あいまい検索・文脈から最有力候補を組み立てて提案する
- 案件名は部分一致で積極マッチ。【案件一覧】から最も近い案件を選んで projectId に使う（例:「神奈川総合」→「神奈川総合高等学校 空調設備改修工事」を自動マッチ）。候補が複数あるときは第一候補で提案しつつ、他候補名も一言添える
- 名前は【スタッフ】一覧とあいまい照合する（姓だけ・名だけ・表記ゆれOK）。例:「川畑を6/1に出勤にして」→ 川畑(該当スタッフID)の 6/1 の打刻を add_clock_log で追加する提案を即組み立てる
- スタッフ一覧に無い名前は「外注」とみなす。まず外注テーブル(insert_subcontractor)に似た名前があるか部分一致で探し、近いものがあればそれ、なければ"新規外注として"登録を提案する（例:「一心断熱」→ 既存外注を検索し、無ければ新規外注名「一心断熱」で提案）
- 名前に「(外注)」「外注」と付いていたら、打刻ではなく外注登録(insert_subcontractor)を優先
- 省略された項目は常識的な既定値で補う（日付→当日 or 文脈の日付、人工数/日数→1、出勤時刻→その現場の通常時刻や08:00など）。空欄で止めず、仮の値を入れて提案する
- 推測・補完した箇所は提案メッセージで「〜と解釈しました/推測しました」と一言添えて承認を促す。聞き返すのは、人物・案件が全く特定できない等どうしても推測材料が無い時だけ。その場合も「○○のことですか？」と候補を示して確認する
- 削除や大きな金額の操作だけは特に慎重に内容を明示して確認する（それ以外は積極的に提案して前に進める）` : "";

      const baseSystem = isAdmin ? SYSTEM_PROMPT : SYSTEM_PROMPT + STAFF_GUARD;
      const systemWithDB = baseSystem + adminToolGuide + (dbContext ? "\n\n--- 以下は社内データベースの情報です。質問に関連する情報があれば参照して回答してください ---" + dbContext : "");

      const messages = hasMessages ? userMessages : [{ role: "user", content: prompt }];

      claudeBody = {
        model: "claude-sonnet-4-6",
        // [2026-06-16] 管理者は回答が切れないよう 4000、スタッフは従来通り 2000
        max_tokens: isAdmin ? 4000 : 2000,
        system: systemWithDB,
        messages,
      };
      if (isAdmin) {
        (claudeBody as Record<string, unknown>).tools = ADMIN_TOOLS;
      }
    }

    // Claude API呼び出し
    const claudeResp = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(claudeBody),
    });

    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      console.error("Claude API error:", claudeResp.status, errText);
      return new Response(
        JSON.stringify({ error: `Claude API エラー (${claudeResp.status})`, detail: errText }),
        { status: claudeResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await claudeResp.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(
      JSON.stringify({ error: "サーバーエラー" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
