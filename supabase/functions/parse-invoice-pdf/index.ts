// supabase/functions/parse-invoice-pdf/index.ts
// 材料屋（関東ロックウール）の請求書PDFをClaude APIで解析してJSONを返す
// admin ロールのみ利用可

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY") || "";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function verifySession(token: string) {
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

// 関東ロックウール 月次請求書 抽出プロンプト（短縮キーで出力量を圧縮）
const SYSTEM_PROMPT = `関東ロックウール→シンセイ工業の月次請求書PDFを解析します。**各物件の【物件計】の金額だけ**抽出してください。明細（個々の品目）は**不要**です。JSONのみ返してください（\`\`\`不要）。

## 出力JSON（超シンプル）
{
 "d":"YYYY-MM-DD",   // 発行日（右上「2026/02/28」）
 "ps":"YYYY-MM-DD",  // 請求期間開始（「自2026年02月01日」）
 "pe":"YYYY-MM-DD",  // 請求期間終了（「至2026年02月28日」）
 "sub":0,            // 請求分10%対象の税抜合計
 "tax":0,            // 消費税
 "tot":0,            // 税込合計（今回御買上額）
 "p":[
  {"n":"吉川市学校給食センター","s":false,"total":5850},
  {"n":"オーバルコート大崎","s":false,"total":160270},
  {"n":"在庫","s":true,"total":32400}
 ]
}

## 抽出ルール
- PDF内の各「【物件名】XXX」の下にある「【物件計】」行の金額を **total** として取得
- 【物件計】は既に【物件値引計】を差し引いた最終金額なので、そのまま1つの値として抽出
- 物件名「在庫」なら s:true、それ以外は s:false
- 物件名はPDFに書かれている通りに正確に
- 金額はカンマ除去した整数。PDFに明確に書かれていない値は 0
- 【総合計】の値は tot ではなく、**請求分の税抜合計を sub** に、消費税を tax に、税込合計を tot に

## 重要
- 明細の読み取りはしない。【物件計】の1数値だけ
- 全ての物件を漏らさず出力（在庫含む）
- 物件数は通常5〜12個`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { token, pdfBase64 } = body as { token?: string; pdfBase64?: string };

    // 認証（admin のみ）
    const session = await verifySession(token || "");
    if (!session) {
      return new Response(JSON.stringify({ ok: false, error: "認証が必要です" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (session.role !== "admin") {
      return new Response(JSON.stringify({ ok: false, error: "権限がありません" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "pdfBase64 が必要です" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (pdfBase64.length > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ ok: false, error: "PDFが大きすぎます（10MB上限）" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`parse-invoice-pdf: size=${pdfBase64.length} (staff=${session.staffId})`);
    if (!CLAUDE_API_KEY) {
      console.error("CLAUDE_API_KEY is empty");
      return new Response(JSON.stringify({ ok: false, error: "Claude APIキー未設定" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Claude API 呼び出し（PDF document input）— 130秒タイムアウト（Supabase wall-clock 150秒弱を考慮）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 130_000);
    let r: Response;
    try {
      r = await fetch(CLAUDE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          // [2026-04-20] Aモード：Opusで最高精度（物件計のみなので軽量・月1枚ならコスト数十円）
          // [2026-06-19] 旧 claude-opus-4-20250514 が退役しAPIが404を返していたため現行 Opus 4.8 に更新
          model: "claude-opus-4-8",
          max_tokens: 3000,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
                { type: "text", text: "このPDFを解析してJSONのみを返してください。説明文やコードフェンスは不要です。" },
              ],
            },
            // [2026-06-19] Opus 4.8 は assistant プリフィル非対応(400)のため削除。
            // JSON強制は system プロンプトの指示と下流のフェンス除去フォールバックで担保。
          ],
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      const isAbort = (fetchErr as Error)?.name === "AbortError";
      console.error("fetch to Claude API failed:", fetchErr);
      return new Response(JSON.stringify({
        ok: false,
        error: isAbort ? "Claude APIタイムアウト(130秒)" : `Claude API接続エラー: ${(fetchErr as Error)?.message}`,
      }), { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    clearTimeout(timeoutId);
    console.log(`Claude API responded: ${r.status}`);

    if (!r.ok) {
      const errTxt = await r.text();
      console.error("Claude API error:", r.status, errTxt);
      return new Response(JSON.stringify({ ok: false, error: `Claude APIエラー ${r.status}: ${errTxt.slice(0, 300)}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeRes = await r.json();
    const text = claudeRes?.content?.[0]?.text || "";
    const stopReason = claudeRes?.stop_reason;
    console.log(`Claude stop_reason=${stopReason}, text length=${text.length}`);

    // [2026-06-19] プリフィル廃止後はモデルが完全なJSON("{"始まり)を返す。
    // 念のためコードフェンス除去 → 先頭が "{" でなければ補完（後方互換のフォールバック）
    let jsonText = text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "").trim();
    }
    if (!jsonText.startsWith("{")) {
      jsonText = "{" + jsonText;
    }
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      console.error("JSON parse error:", e, "text:", text.slice(0, 500));
      const errMsg = stopReason === "max_tokens"
        ? "応答が長すぎて途切れました。明細数の多いPDFは分割してアップロードしてください（max_tokens上限）"
        : `解析結果のJSON変換に失敗 (stop_reason=${stopReason})`;
      return new Response(JSON.stringify({ ok: false, error: errMsg, raw: text.slice(0, 2000), stopReason }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 短縮キー → 標準キー（クライアントは既存の形式を期待しているため）
    // deno-lint-ignore no-explicit-any
    const expand = (raw: any) => ({
      invoiceDate: raw?.d || raw?.invoiceDate || null,
      periodStart: raw?.ps || raw?.periodStart || null,
      periodEnd: raw?.pe || raw?.periodEnd || null,
      subtotal: Number(raw?.sub ?? raw?.subtotal ?? 0),
      tax: Number(raw?.tax ?? 0),
      totalWithTax: Number(raw?.tot ?? raw?.totalWithTax ?? 0),
      // [2026-04-20] Aモード：物件計だけ取得 → 1物件=1明細として保存
      // deno-lint-ignore no-explicit-any
      projects: (raw?.p || raw?.projects || []).map((pr: any) => {
        const total = Math.round(Number(pr?.total ?? pr?.amount ?? 0));
        return {
          projectNameOnInvoice: pr?.n || pr?.projectNameOnInvoice || "",
          isStock: !!(pr?.s ?? pr?.isStock),
          items: [{
            itemDate: null,
            invoiceNo: "",
            itemName: "材料費合計",
            spec: "",
            quantity: 1,
            unit: "",
            unitPrice: total,
            amount: total,
            isDiscount: false,
          }],
        };
      }),
    });
    const normalized = expand(parsed);
    return new Response(JSON.stringify({ ok: true, parsed: normalized, usage: claudeRes?.usage }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-invoice-pdf error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
