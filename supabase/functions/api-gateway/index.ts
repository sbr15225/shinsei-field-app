// supabase/functions/api-gateway/index.ts
// 統合 API ゲートウェイ v14 — 画面分離 + 休暇管理 + 経費 + アンケート + AIチャット
// 更新日: 2026-03-24

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

// レート制限: IP毎に50回/分（v14: アクション増加に対応）
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 50;
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

// ── セッション検証 ──
interface SessionInfo {
  staffId: string;
  role: string;
  // [2026-09-25] 監査 A-5/H-5：監査ログの実行者名はクライアントの値を使わず、ここ（DBの staff.name）で確定する
  name: string;
}

async function verifySession(token: string): Promise<SessionInfo | null> {
  if (!token || typeof token !== "string") return null;

  const { data: session, error } = await supabaseAdmin
    .from("sessions")
    .select("staff_id, expires_at")
    .eq("token", token)
    .single();

  if (error || !session) return null;
  if (new Date(session.expires_at) < new Date()) return null;

  const { data: staff, error: staffErr } = await supabaseAdmin
    .from("staff")
    .select("id, role, name")
    .eq("id", session.staff_id)
    .single();

  if (staffErr || !staff) return null;
  return { staffId: staff.id, role: staff.role, name: staff.name || "" };
}

// ── バリデーションヘルパー ──
function isStr(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}
function isNum(v: unknown): v is number {
  return typeof v === "number" && isFinite(v);
}
// [2026-09-04] JSTの今日（YYYY-MM-DD）。Edge Function は UTC で動くので、
//   日本時間の日付で期限判定するために +9h してから切り出す。
function jstToday(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// [2026-05-29] 住所→座標変換（国土地理院 住所検索API・無料/キー不要）
// 退勤打刻のズレ判定に使う現場座標を取得。失敗時は null（警告判定はフォールバックする）
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = "https://msearch.gsi.go.jp/address-search/AddressSearch?q=" +
      encodeURIComponent(address);
    const res = await fetch(url);
    if (!res.ok) return null;
    const arr = await res.json();
    const c = Array.isArray(arr) && arr[0]?.geometry?.coordinates;
    if (!Array.isArray(c) || c.length < 2) return null;
    const lng = Number(c[0]), lat = Number(c[1]);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    return { lat, lng };
  } catch (_) {
    return null;
  }
}

// ── [2026-04-21] 振休残チェック（借り越し禁止）──
// UIと同じく leaves テーブルから動的計算
async function checkFurikaeWouldGoNegative(staffId: string, additionalDays: number):
  Promise<{ ok: boolean; balance: number; projected: number }>
{
  const { data: grants } = await supabaseAdmin
    .from("leaves").select("days")
    .eq("staff_id", staffId).eq("type", "holiday")
    .eq("holiday_pref", "振休希望").eq("status", "承認");
  const { data: used } = await supabaseAdmin
    .from("leaves").select("days")
    .eq("staff_id", staffId).eq("type", "furikae").eq("status", "承認");
  const grantedSum = (grants || []).reduce((a, l: Record<string, unknown>) => a + (Number(l.days) || 0), 0);
  const usedSum = (used || []).reduce((a, l: Record<string, unknown>) => a + (Number(l.days) || 0), 0);
  const balance = grantedSum - usedSum;
  const projected = balance - additionalDays;
  return { ok: projected >= 0, balance, projected };
}

// ── [2026-04-21] leave_balances.used 自動同期ヘルパー ──
// 有給(paid) / 振休(furikae) の承認済み休暇だけが残日数に反映される
async function adjustLeaveBalanceUsed(staffId: string, type: string, delta: number) {
  if (delta === 0) return;
  if (!["paid", "furikae"].includes(type)) return;
  const { data: existing } = await supabaseAdmin
    .from("leave_balances")
    .select("id, used")
    .eq("staff_id", staffId).eq("type", type).maybeSingle();
  if (existing) {
    const newUsed = Math.max(0, Number(existing.used || 0) + delta);
    await supabaseAdmin.from("leave_balances")
      .update({ used: newUsed, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else if (delta > 0) {
    // balances行が無い場合は新規作成（granted=0で used だけ入る＝残マイナス）
    await supabaseAdmin.from("leave_balances").insert({
      staff_id: staffId, type, granted: 0, used: delta, carried: 0,
      updated_at: new Date().toISOString(),
    });
  }
}

// 休暇レコード新規登録時: 承認済みなら used += days
async function syncLeaveBalanceUsed(staffId: string, type: string, days: number, status: string) {
  if (status === "承認" && days > 0) {
    await adjustLeaveBalanceUsed(staffId, type, days);
  }
}

// 休暇ステータス変更時: 承認状態が変わった分だけ used を調整
async function syncLeaveBalanceOnStatusChange(
  staffId: string, type: string, days: number, oldStatus: string, newStatus: string
) {
  if (days <= 0 || oldStatus === newStatus) return;
  const wasApproved = oldStatus === "承認";
  const isApproved = newStatus === "承認";
  let delta = 0;
  if (!wasApproved && isApproved) delta = days;       // 承認外 → 承認
  else if (wasApproved && !isApproved) delta = -days; // 承認 → 却下/申請中
  if (delta !== 0) await adjustLeaveBalanceUsed(staffId, type, delta);
}

// ── [2026-06-17] 追加見積は「収入側（元請からもらう追加受注額）」。
// 外注費(subcontract_cost)とは別物のため、追加見積からの自動反映は廃止。
// 受注額合計はフロント側で請負金額に加算して「トータル受注額」として表示する。

// ── [2026-06-29] 経費追加の外注費(expense_items.category='subcontract')合計を
//   案件の subcontract_cost(外注費・支出側) に自動反映する。
//   insert_expense_item / delete_expense_item の後に projectId 単位で再計算して書き込む。
//   subcontract_cost が変わると目標人工((請負−外注費)÷単価)も自動で再計算される。
async function recalcSubcontractCost(projectId: string): Promise<void> {
  if (!isStr(projectId)) return;
  const { data: rows, error } = await supabaseAdmin
    .from("expense_items")
    .select("amount")
    .eq("project_id", projectId)
    .eq("category", "subcontract");
  if (error) { console.error("recalcSubcontractCost select:", error.message); return; }
  const total = (rows || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const { error: upErr } = await supabaseAdmin
    .from("projects")
    .update({ subcontract_cost: total })
    .eq("id", projectId);
  if (upErr) console.error("recalcSubcontractCost update:", upErr.message);
}

// [2026-07-09] 認証済み読み取りプロキシ rest_read が読み出してよいテーブル/ビューの許可リスト。
//   shared.js の sb() が読むもの全てを網羅（いずれも非機密。staff は含めず staff_public のみ）。
//   sessions / staff（pinハッシュ）/ pin_fail_locks 等の機密テーブルは意図的に除外。
// [2026-09-29] アプリ（rest_read / update_app_setting）から読み書きさせない app_settings のキー。値はDBで直接入れる
const LOCKED_SETTING_KEYS = new Set(["admin_google_emails", "google_client_id"]);

const READ_WHITELIST = new Set([
  "staff_public", "projects", "entries", "attachments", "clock_modifications", "clock_logs",
  "leaves", "handover_memos", "announcements", "customers", "expense_items", "subcontractors",
  "additional_works", "additional_estimates", "contacts", "leave_balances", "project_expenses",
  "company_info", "surveys", "survey_responses", "ai_chat_logs", "vehicles", "vehicle_troubles",
  "vehicle_oil_changes", "invoice_uploads", "material_costs", "app_settings", "annual_backups",
  "project_specs", "progress_reports", "instagram_settings",
  "finance_data", // [2026-10-02] お金タブ（管理者のみ。下の ADMIN_ONLY_READ）
]);

// [2026-07-14] 上記 whitelist のうち、金額・請求・全社ログ等の機密で「一般スタッフのアプリが読まない」テーブル。
//   rest_read では admin セッションのみ許可する（user.jsx はこれらを一切ロードしていないことを確認済み）。
//   ※ expense_items / customers / leave_balances 等はスタッフアプリが表示に使うため対象外（別途カラム制御が要る）。
const ADMIN_ONLY_READ = new Set([
  "material_costs", "invoice_uploads", "additional_estimates",
  "project_expenses", "ai_chat_logs", "annual_backups",
  "finance_data",
]);

// [2026-09-25] セキュリティ監査 A-1 対応：rest_read の path を検証し、URL を組み立て直す。
//   旧実装は path を文字列のまま `${SUPABASE_URL}/rest/v1/${path}` に連結していたため、
//   "projects/../sessions" のような `..` で許可外テーブル（sessions・staff 等）へ到達できた。
//   新方式：「テーブル名（許可リストと完全一致）」＋「クエリパラメータ」に分解し、
//   new URL() で組み立て直してから、最終的な pathname が /rest/v1/<テーブル名> であることを二重確認する。
//   ※ 正規の呼び出しは shared.js の sb("テーブル名?select=...&order=...") のみ。
//     loadClockLogs は clock_in=gte.<encodeURIComponent(ISO日時)> を渡すため、%3A（:）は許可する。
function buildRestReadUrl(path: string): { url: URL; table: string } | { error: string } {
  if (path.length > 2000) return { error: "不正なクエリです" };
  // # ・ \ ・ 制御文字・ ? の二重指定は拒否
  if (/[#\\\x00-\x1f]/.test(path) || (path.match(/\?/g) || []).length > 1) {
    return { error: "不正なクエリです" };
  }
  // エンコードされた . / \ ? # ( ) や NUL も拒否（デコード後に意味が変わるのを防ぐ）
  if (/%(2e|2f|5c|3f|23|28|29|00)/i.test(path)) {
    return { error: "不正なクエリです" };
  }
  // 埋め込み(foreign table embedding)や関数呼び出しで許可外テーブルを覗くのを防止（従来どおり）
  if (path.includes("(") || path.includes(")")) {
    return { error: "不正なクエリです" };
  }
  const qIdx = path.indexOf("?");
  const table = qIdx >= 0 ? path.slice(0, qIdx) : path;
  const query = qIdx >= 0 ? path.slice(qIdx + 1) : "";
  // テーブル名は英小文字と _ だけ、かつ許可リストと完全一致（/ や .. を含む時点で不一致）
  if (!/^[a-z_]+$/.test(table) || !READ_WHITELIST.has(table)) {
    return { error: `読み取り不可のリソースです: ${table.slice(0, 40)}` };
  }
  const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);
  for (const [k, v] of new URLSearchParams(query)) {
    // キーは select / order / limit / 列名 などの識別子のみ
    if (!/^[a-z_][a-z0-9_]*$/.test(k)) return { error: "不正なクエリです" };
    // デコード後の値にパス区切り・親ディレクトリ・埋め込み構文が混ざっていたら拒否
    if (/[\/\\()#?]/.test(v) || v.includes("..")) return { error: "不正なクエリです" };
    url.searchParams.append(k, v);
  }
  // 二重チェック：組み立て後の宛先が自分の Supabase の /rest/v1/<テーブル名> そのものか
  if (url.origin !== new URL(SUPABASE_URL).origin || url.pathname !== `/rest/v1/${table}`) {
    return { error: "不正なクエリです" };
  }
  return { url, table };
}

// [2026-09-25] 監査 A-6/H-3 残り：削除は「作成者本人か admin」だけ。
//   お知らせ・引継ぎメモは author（名前）で記録されている（staff_id 列が無い）ため、
//   セッションの本人名（DB の staff.name）と照合する。insert 側も author をサーバで確定させている。
function isOwnerOrAdmin(session: SessionInfo, author: unknown): boolean {
  if (session.role === "admin") return true;
  return isStr(session.name) && author === session.name;
}

// [2026-10-02] 打刻修正申請の外注（なし／応援／請負＋人数）
const SUPPORT_UNIT_PRICE = 35000; // shared.js と同じ（応援1人あたり）
function normOsType(v: unknown): "support" | "subcontract" | null {
  return v === "support" || v === "subcontract" ? v : null;
}
function normOsCount(v: unknown): number | null {
  const n = Math.floor(Number(v));
  return n >= 1 && n <= 20 ? n : null;
}
// 承認時に clock_logs へ書く outsource_*。応援＝単価×人数、請負＝元も請負なら金額を残す（管理者が入力済みのため）、それ以外は未入力
function osUpdateFields(type: unknown, count: unknown, cur: { outsource_type?: string | null; outsource_amount?: number | null } | null) {
  const t = normOsType(type), n = normOsCount(count);
  if (!t || !n) return { outsource_type: null, outsource_count: null, outsource_amount: null };
  if (t === "support") return { outsource_type: t, outsource_count: n, outsource_amount: SUPPORT_UNIT_PRICE * n };
  return { outsource_type: t, outsource_count: n, outsource_amount: cur?.outsource_type === "subcontract" ? (cur.outsource_amount ?? null) : null };
}

// [2026-10-05] 打刻修正を clock_logs に反映する（管理者の承認・スタッフ申請の自動承認で共通）。失敗時はエラー文を返す
// deno-lint-ignore no-explicit-any
async function applyClockMod(mod: any): Promise<string | null> {
  if (mod.type === "edit" && mod.clock_log_id) {
    const upd: Record<string, unknown> = {};
    if (mod.requested_clock_in) upd.clock_in = mod.requested_clock_in;
    if (mod.requested_clock_out) upd.clock_out = mod.requested_clock_out;
    if (mod.project_id) upd.project_id = mod.project_id;
    // [2026-10-14] 早出（null＝変えない）
    if (typeof mod.requested_early_start === "boolean") upd.early_start = mod.requested_early_start;
    // [2026-10-02] 外注の修正
    if (mod.outsource_changed) {
      const { data: cur } = await supabaseAdmin.from("clock_logs").select("outsource_type, outsource_amount").eq("id", mod.clock_log_id).single();
      Object.assign(upd, osUpdateFields(mod.requested_outsource_type, mod.requested_outsource_count, cur));
    }
    // [2026-04-27] エラーチェック追加: サイレント失敗を防止
    const { error: clkErr } = await supabaseAdmin.from("clock_logs").update(upd).eq("id", mod.clock_log_id);
    if (clkErr) return "打刻ログ更新失敗: " + clkErr.message;
  } else if (mod.type === "new") {
    // [2026-04-27] エラーチェック追加
    const { error: insErr } = await supabaseAdmin.from("clock_logs").insert({
      id: mod.id + "_log",
      user_id: mod.user_id,
      user_name: mod.user_name,
      project_id: mod.project_id,
      clock_in: mod.requested_clock_in,
      clock_out: mod.requested_clock_out || null,
      coords_in: null, coords_out: null,
      remarks: "", location_name: "",
      note: "修正による追加: " + (mod.reason || ""),
      early_start: mod.requested_early_start === true,
      ...(mod.outsource_changed ? osUpdateFields(mod.requested_outsource_type, mod.requested_outsource_count, null) : {}),
    });
    if (insErr) return "打刻ログ追加失敗: " + insErr.message;
  }
  return null;
}

// ── アクションハンドラー ──
type ActionHandler = (data: Record<string, unknown>, session: SessionInfo) => Promise<{ ok: boolean; result?: unknown; error?: string }>;

const actions: Record<string, ActionHandler> = {
  // [2026-07-09] 認証済み読み取りプロキシ。
  //   ディスパッチャがこのアクションの前に必ず verifySession 済み＝ログイン必須。
  //   従来 anon キーで直接 PostgREST を叩いていた読み取り（shared.js の sb()）を全部この経路へ集約し、
  //   RLS で anon SELECT を止めても正規ユーザーだけが読めるようにする。
  //   path 例: "projects?select=*&order=created_at"。テーブル名を許可リストと完全一致で照合し service_role で取得。
  async rest_read(data, session) {
    const path = typeof data.path === "string" ? data.path : "";
    if (!path) return { ok: false, error: "path が必要です" };
    // [2026-09-25] A-1 対応：path を検証してテーブル名＋許可クエリから URL を組み立て直す（buildRestReadUrl 参照）
    const built = buildRestReadUrl(path);
    if ("error" in built) return { ok: false, error: built.error };
    const { url, table } = built;
    // [2026-07-14] 機密テーブル（金額・請求・全社AIログ等）は admin セッションのみ許可
    if (ADMIN_ONLY_READ.has(table) && session?.role !== "admin") {
      return { ok: false, error: `管理者のみ閲覧できます: ${table}` };
    }
    const r = await fetch(url, {
      headers: {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
    });
    if (!r.ok) {
      const msg = await r.text().catch(() => "");
      return { ok: false, error: `読み取り失敗 (${r.status}) ${msg.slice(0, 120)}` };
    }
    let rows = await r.json().catch(() => null);
    // [2026-09-29] 管理者Googleログインの許可メールは誰にも返さない（DBで直接管理）
    if (table === "app_settings" && Array.isArray(rows)) {
      rows = rows.filter((x: { key?: string }) => !LOCKED_SETTING_KEYS.has(String(x?.key ?? "")));
    }
    return { ok: true, result: rows };
  },

  // ──────────────────────────────
  // entries
  // ──────────────────────────────
  async insert_entry(data) {
    const { projectId, entry } = data as { projectId: string; entry: Record<string, unknown> };
    if (!isStr(projectId) || !entry || !isStr(entry.id)) {
      return { ok: false, error: "無効なパラメータ" };
    }
    const { error } = await supabaseAdmin.from("entries").insert({
      id: entry.id,
      project_id: projectId,
      date: entry.date,
      worker: entry.worker,
      qty: entry.qty,
      memo: entry.memo || "",
    });
    return error ? { ok: false, error: "登録失敗" } : { ok: true };
  },

  // ──────────────────────────────
  // projects
  // ──────────────────────────────
  async insert_project(data, session) {
    const p = data.project as Record<string, unknown>;
    if (!p || !isStr(p.id) || !isStr(p.name)) {
      return { ok: false, error: "無効なパラメータ" };
    }
    // [2026-07-09] 金額系フィールドは admin のみ設定可。スタッフは案件の器は作れるが
    //   見積・請負・原価・外注費・目標人工/単価は 0/null に強制する（改ざん防止）。
    //   金額の後付けは admin が update_project_fields（adminAllowed 隔離済み）で行う。
    const isAdmin = session?.role === "admin";
    // [2026-05-29] 住所があれば座標化（退勤打刻のズレ判定用）
    const addr = isStr(p.address) ? p.address : "";
    const geo = addr ? await geocodeAddress(addr) : null;
    const { error } = await supabaseAdmin.from("projects").insert({
      id: p.id,
      name: p.name,
      client: p.client || "",
      status: p.status || "準備中",
      lead: p.lead || "",
      start_date: p.startDate || null,
      end_date: p.endDate || null,
      estimate: isAdmin ? (p.estimate || 0) : 0,
      target_ninku: isAdmin ? (p.targetNinku || 0) : 0,
      material_cost: isAdmin ? (p.materialCost || 0) : 0,
      other_cost: isAdmin ? (p.otherCost || 0) : 0,
      contract_type: p.contractType || "",
      address: addr,
      site_lat: geo?.lat ?? null,
      site_lng: geo?.lng ?? null,
      target_mandays: isAdmin ? (p.targetMandays || 0) : 0, // [v14]
      ninku_rate: isAdmin ? (p.ninkuRate || null) : null, // [2026-06-29] 案件ごとの人工単価（NULL=会社デフォルト）
      contract_amount: isAdmin ? (p.contractAmount || 0) : 0, // [v14]
      subcontract_cost: isAdmin ? (p.subcontractCost || 0) : 0, // [2026-06-16] 外注費（請負外注の金額・円）
      work_category: p.workCategory || "", // [2026-04-20] 案件区分（新築/改修）
      work_details: p.workDetails || "", // [2026-04-22] 工事詳細
    });
    return error ? { ok: false, error: "登録失敗" } : { ok: true };
  },

  // [v13] 案件削除（adminのみ）
  async delete_project(data, session) {
    if (session.role !== "admin") {
      return { ok: false, error: "権限がありません（admin のみ実行可能）" };
    }
    const { projectId } = data as { projectId: string };
    if (!isStr(projectId)) return { ok: false, error: "無効なパラメータ" };

    // 関連データを順番に削除
    await supabaseAdmin.from("entries").delete().eq("project_id", projectId);
    await supabaseAdmin.from("attachments").delete().eq("project_id", projectId);
    await supabaseAdmin.from("subcontractors").delete().eq("project_id", projectId);
    await supabaseAdmin.from("additional_works").delete().eq("project_id", projectId);
    await supabaseAdmin.from("handover_memos").delete().eq("project_id", projectId);
    await supabaseAdmin.from("project_drawings").delete().eq("project_id", projectId);
    const { error } = await supabaseAdmin.from("projects").delete().eq("id", projectId);
    return error ? { ok: false, error: "削除失敗" } : { ok: true };
  },

  // 顧客削除（adminのみ）
  async delete_customer(data, session) {
    if (session.role !== "admin") {
      return { ok: false, error: "権限がありません（admin のみ実行可能）" };
    }
    const { customerId } = data as { customerId: string };
    if (!isStr(customerId)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("customers").delete().eq("id", customerId);
    return error ? { ok: false, error: "削除失敗" } : { ok: true };
  },

  // [v13] プロジェクトステータス更新
  // [2026-04-22] スタッフも現場進行に応じてステータス変更する運用のため admin制限を撤廃
  async update_project_status(data) {
    const { projectId, status } = data as { projectId: string; status: string };
    if (!isStr(projectId) || !isStr(status)) return { ok: false, error: "無効なパラメータ" };
    const allowed = ["進行中", "準備中", "未定", "完了", "中止"];
    if (!allowed.includes(status)) return { ok: false, error: "無効なステータス" };
    const { error } = await supabaseAdmin
      .from("projects")
      .update({ status })
      .eq("id", projectId);
    return error ? { ok: false, error: "更新失敗" } : { ok: true };
  },

  async update_project_cost(data, session) {
    // [2026-07-09] 原価（材料費・その他原価）の更新は admin のみ。
    if (session?.role !== "admin") {
      return { ok: false, error: "権限がありません（admin のみ実行可能）" };
    }
    const { projectId, materialCost, otherCost } = data as {
      projectId: string; materialCost: number; otherCost: number;
    };
    if (!isStr(projectId)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin
      .from("projects")
      .update({ material_cost: materialCost || 0, other_cost: otherCost || 0 })
      .eq("id", projectId);
    return error ? { ok: false, error: "更新失敗" } : { ok: true };
  },

  // ──────────────────────────────
  // clock_logs（v13: location_name 対応）
  // ──────────────────────────────
  // [2026-05-07] Codex指摘#2: payload の userId/userName を信用せず、session.staffId から導出。
  // admin は任意の staff の打刻を代理登録できる（管理者画面の手動追加用）。
  async insert_clock_log(data, session) {
    const log = data.log as Record<string, unknown>;
    if (!log || !isStr(log.id)) return { ok: false, error: "無効なパラメータ" };
    if (!session) return { ok: false, error: "認証が必要です" };
    // 通常スタッフ: 自分の打刻のみ。payload userId は無視
    let userId = session.staffId;
    let userName = "";
    if (session.role === "admin" && isStr(log.userId)) {
      userId = log.userId as string;
    }
    // 名前は DB から確定（payload の改ざん不可）
    const { data: staffRow } = await supabaseAdmin
      .from("staff").select("name").eq("id", userId).single();
    userName = staffRow?.name || "";
    if (!userName) return { ok: false, error: "スタッフが存在しません" };
    const { error } = await supabaseAdmin.from("clock_logs").insert({
      id: log.id,
      user_id: userId,
      user_name: userName,
      project_id: log.projectId,
      clock_in: log.clockIn,
      clock_out: log.clockOut || null,
      coords_in: log.coordsIn || null,
      coords_out: log.coordsOut || null,
      remarks: log.remarks || "",
      location_name: log.locationName || "",
      note: log.note || "", // [v14] GPS理由・一般備考
      // [2026-06-05] 通勤方法。許可リスト以外は null（v147 で company_car_shared 追加）
      commute_method: (["company_car", "company_car_shared", "train", "own_car"].includes(log.commuteMethod as string))
        ? log.commuteMethod : null,
      // [2026-07-13] 夜勤フラグ。true のみ受理、それ以外は false（日勤扱い）
      is_night_shift: log.isNightShift === true,
    });
    return error ? { ok: false, error: "登録失敗: " + error.message } : { ok: true };
  },

  // [2026-05-07] Codex指摘#2: 所有者縛りを追加。通常スタッフは自分の打刻のみ更新可。
  async update_clock_out(data, session) {
    const HOURLY_LEAVE_MAX_H = 35;   // [2026-10-19] 時間単位年休の上限（1年5日×1日7時間）
    const { logId, clockOut, coordsOut, locationName, earlyLeaveCategory, earlyLeaveReason, hourlyUsed,
      outsourceType, outsourceCount, outsourceAmount, outDistanceM, earlyLeavePay, breakShortMin, breakShortReason } = data as {
      logId: string; clockOut: string; coordsOut: string; locationName?: string;
      earlyLeaveCategory?: string; earlyLeaveReason?: string; hourlyUsed?: number;
      outsourceType?: string | null; outsourceCount?: number | null; outsourceAmount?: number | null;
      outDistanceM?: number | null;
      earlyLeavePay?: string | null; breakShortMin?: number | null; breakShortReason?: string | null;
    };
    if (!isStr(logId)) return { ok: false, error: "無効なパラメータ" };
    if (!session) return { ok: false, error: "認証が必要です" };
    const update: Record<string, unknown> = {
      clock_out: clockOut,
      coords_out: coordsOut || null,
    };
    // [2026-05-29] 現場からのズレ距離(m)。現場座標が無い日は null
    if (outDistanceM !== undefined) {
      update.out_distance_m = (outDistanceM === null || !isFinite(Number(outDistanceM)))
        ? null : Math.round(Number(outDistanceM));
    }
    if (locationName !== undefined) update.location_name = locationName;
    if (earlyLeaveCategory) update.early_leave_category = earlyLeaveCategory;
    if (earlyLeaveReason) update.early_leave_reason = earlyLeaveReason;
    // [2026-10-19] 本人都合の早上がり：本人が選んだ扱い（時間有給／欠勤）。それ以外の値は受け付けない
    const payChoice = (earlyLeavePay === "paid_leave" || earlyLeavePay === "absence") ? earlyLeavePay : null;
    if (earlyLeaveCategory === "本人都合") update.early_leave_pay = payChoice;
    // [2026-10-19] 17時を過ぎた退勤で「休憩が取れなかった」分（1〜300分）と理由。働いた時間として残業に足す
    const shortMin = Math.floor(Number(breakShortMin));
    if (isFinite(shortMin) && shortMin > 0) {
      if (shortMin > 300) return { ok: false, error: "休憩が取れなかった時間が長すぎます" };
      if (!isStr(breakShortReason) || !breakShortReason.trim()) return { ok: false, error: "休憩が取れなかった理由を入力してください" };
      update.break_short_min = shortMin;
      update.break_short_reason = String(breakShortReason).trim().slice(0, 200);
    }
    // [2026-10-19] 時間有給は年35時間（5日×7時間、時間単位年休の協定 第2条・第3条）まで。超えるなら保存しない
    const useHourly = earlyLeaveCategory === "本人都合" && payChoice === "paid_leave" && Number(hourlyUsed) > 0 && session?.staffId;
    if (useHourly) {
      const { data: lb0 } = await supabaseAdmin.from("leave_balances").select("hourly_used_this_year")
        .eq("staff_id", session.staffId).eq("type", "paid").maybeSingle();
      if ((Number(lb0?.hourly_used_this_year) || 0) + Number(hourlyUsed) > HOURLY_LEAVE_MAX_H) {
        return { ok: false, error: `時間有給は1年に${HOURLY_LEAVE_MAX_H}時間までです。残りが足りないので「欠勤」を選んでください` };
      }
    }
    // [2026-05-14] 外注情報。type は support/subcontract のみ許可
    if (outsourceType === "support" || outsourceType === "subcontract") {
      update.outsource_type = outsourceType;
      update.outsource_count = Number(outsourceCount) > 0 ? Math.floor(Number(outsourceCount)) : null;
      update.outsource_amount = (outsourceAmount === null || outsourceAmount === undefined) ? null : Math.floor(Number(outsourceAmount));
    } else if (outsourceType === null) {
      // 明示的に「外注なし」→ クリア
      update.outsource_type = null;
      update.outsource_count = null;
      update.outsource_amount = null;
    }
    // [2026-10-14] 8時前に出勤して8時前に退勤した記録（早朝の立ち寄り）は、出勤が8:00に置き換わって
    // 退勤より後になってしまう。退勤が出勤より前なら、出勤を実際に押した時刻（created_at）に戻す。夜勤は対象外
    {
      let cur = supabaseAdmin.from("clock_logs").select("clock_in, created_at, is_night_shift").eq("id", logId);
      if (session.role !== "admin") cur = cur.eq("user_id", session.staffId);
      const { data: row } = await cur.maybeSingle();
      if (row && !row.is_night_shift && row.clock_in && isStr(clockOut)) {
        const outMs = new Date(clockOut).getTime();
        const inMs = new Date(row.clock_in).getTime();
        if (isFinite(outMs) && isFinite(inMs) && outMs < inMs) {
          const createdMs = row.created_at ? new Date(row.created_at).getTime() : NaN;
          update.clock_in = (isFinite(createdMs) && createdMs <= outMs) ? row.created_at : clockOut;
        }
      }
    }
    // 通常スタッフは user_id 一致を必須。admin は任意の打刻を更新できる
    let q = supabaseAdmin.from("clock_logs").update(update).eq("id", logId);
    if (session.role !== "admin") q = q.eq("user_id", session.staffId);
    const { error, count } = await q.select("id", { count: "exact" });
    if (error) return { ok: false, error: "更新失敗: " + error.message };
    if (count === 0) return { ok: false, error: "対象の打刻が見つからない、または権限がありません" };
    // 「本人都合」で本人が「時間有給を使う」を選んだときだけ、時間有給を控除（hourly_used_this_year に加算）
    // [2026-10-19] 以前は本人都合なら自動で控除していた。協定 第5条（会社が勝手に充てない）に合わせて、本人の選択がある時だけ
    if (useHourly) {
      const { data: lb } = await supabaseAdmin
        .from("leave_balances")
        .select("hourly_used_this_year")
        .eq("staff_id", session.staffId)
        .eq("type", "paid")
        .single();
      const currentUsed = Number(lb?.hourly_used_this_year) || 0;
      await supabaseAdmin.from("leave_balances")
        .update({ hourly_used_this_year: currentUsed + hourlyUsed })
        .eq("staff_id", session.staffId)
        .eq("type", "paid");
    }
    return { ok: true };
  },

  // [2026-07-01] 退勤写真を clock_logs に紐づけて保存。退勤フローで添付（任意）。
  // 通常スタッフは自分の打刻のみ。photoUrl は field-photos の公開URL文字列。null でクリア可。
  async set_clock_out_photo(data, session) {
    const { logId, photoUrl } = data as { logId: string; photoUrl: string | null };
    if (!isStr(logId)) return { ok: false, error: "無効なパラメータ" };
    if (!session) return { ok: false, error: "認証が必要です" };
    let url: string | null = null;
    if (photoUrl !== null && photoUrl !== undefined && photoUrl !== "") {
      if (!isStr(photoUrl) || !/^https?:\/\//.test(photoUrl) || photoUrl.length > 2000) {
        return { ok: false, error: "写真URLが不正です" };
      }
      url = photoUrl;
    }
    let q = supabaseAdmin.from("clock_logs").update({ clock_out_photo: url }).eq("id", logId);
    if (session.role !== "admin") q = q.eq("user_id", session.staffId);
    const { error, count } = await q.select("id", { count: "exact" });
    if (error) return { ok: false, error: "更新失敗: " + error.message };
    if (count === 0) return { ok: false, error: "対象の打刻が見つからない、または権限がありません" };
    return { ok: true };
  },

  // ──────────────────────────────
  // clock_modifications (v16)
  // ──────────────────────────────
  // [2026-05-07] Codex指摘#2: 通常スタッフは payload の userId を session.staffId 強制。
  // admin は他人の代理申請可。userName は DB から確定。
  async submit_clock_modification(data, session) {
    const mod = data.mod as Record<string, unknown>;
    if (!mod || !isStr(mod.id)) return { ok: false, error: "無効なパラメータ" };
    if (!session) return { ok: false, error: "認証が必要です" };
    const userId = session.role === "admin" && isStr(mod.userId) ? (mod.userId as string) : session.staffId;
    const { data: staffRow } = await supabaseAdmin
      .from("staff").select("name").eq("id", userId).single();
    const userName = staffRow?.name || "";
    if (!userName) return { ok: false, error: "スタッフが存在しません" };
    // [2026-10-05] 自動承認にしたので、修正対象の打刻が申請者本人のものか必ず確認する
    if (mod.type === "edit") {
      if (!isStr(mod.clockLogId)) return { ok: false, error: "修正する打刻が指定されていません" };
      const { data: target } = await supabaseAdmin.from("clock_logs").select("user_id").eq("id", mod.clockLogId).single();
      if (!target || target.user_id !== userId) return { ok: false, error: "自分の打刻だけ修正できます" };
    } else if (mod.type !== "new") return { ok: false, error: "無効な種別" };
    if (!isStr(mod.requestedClockIn) || isNaN(Date.parse(mod.requestedClockIn as string))) return { ok: false, error: "出勤時刻が不正です" };
    if (mod.requestedClockOut && (isNaN(Date.parse(mod.requestedClockOut as string)) || Date.parse(mod.requestedClockOut as string) <= Date.parse(mod.requestedClockIn as string))) return { ok: false, error: "退勤時刻は出勤より後にしてください" };
    // [2026-10-14] 早出は「8:00より前の出勤」のときだけ（日本時間で判定）
    const earlyStart = typeof mod.earlyStart === "boolean" ? (mod.earlyStart as boolean) : null;
    if (earlyStart === true) {
      const jstHour = new Date(Date.parse(mod.requestedClockIn as string) + 9 * 3600000).getUTCHours();
      if (jstHour >= 8) return { ok: false, error: "早出は8:00より前の出勤時刻を入れてください" };
    }
    const osChanged = mod.outsourceChanged === true;
    const osType = normOsType(mod.requestedOutsourceType);
    if (osChanged && osType && !normOsCount(mod.requestedOutsourceCount)) return { ok: false, error: "外注の人数を入れてください" };
    const { error } = await supabaseAdmin.from("clock_modifications").insert({
      id: mod.id,
      type: mod.type,
      clock_log_id: mod.clockLogId || null,
      user_id: userId,
      user_name: userName,
      project_id: mod.projectId || null,
      project_name: mod.projectName || "",
      original_clock_in: mod.originalClockIn || null,
      original_clock_out: mod.originalClockOut || null,
      requested_clock_in: mod.requestedClockIn || null,
      requested_clock_out: mod.requestedClockOut || null,
      reason: mod.reason || "",
      status: "pending",
      requested_by: userName, // 改ざん不可な確定値
      // [2026-10-02] 外注の有無・人数の修正（金額は受け取らない。承認時にサーバで決める）
      outsource_changed: osChanged,
      original_outsource_type: osChanged ? normOsType(mod.originalOutsourceType) : null,
      original_outsource_count: osChanged ? normOsCount(mod.originalOutsourceCount) : null,
      requested_outsource_type: osChanged ? osType : null,
      requested_outsource_count: osChanged && osType ? normOsCount(mod.requestedOutsourceCount) : null,
      requested_early_start: earlyStart,
    });
    if (error) return { ok: false, error: "申請登録失敗: " + error.message };
    // [2026-10-05] 自動承認：申請を記録したうえで、すぐ clock_logs に反映して approved にする。反映に失敗したら pending のまま（管理者が見る）
    const { data: saved } = await supabaseAdmin.from("clock_modifications").select("*").eq("id", mod.id).single();
    if (!saved) return { ok: false, error: "申請の再取得に失敗しました" };
    const applyErr = await applyClockMod(saved);
    if (applyErr) return { ok: true, result: { autoApproved: false, error: applyErr } };
    await supabaseAdmin.from("clock_modifications")
      .update({ status: "approved", reviewed_by: "自動承認", reviewed_at: new Date().toISOString() }).eq("id", mod.id);
    return { ok: true, result: { autoApproved: true } };
  },

  async review_clock_modification(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    // [2026-09-25] 監査 H-5：reviewedBy はクライアントの値を信用せず、セッションの本人名（DB）で記録する
    const { modId, status } = data as { modId: string; status: string };
    const reviewedBy = session.name || session.staffId;
    if (!isStr(modId) || !isStr(status)) return { ok: false, error: "無効なパラメータ" };
    // 申請情報を取得
    const { data: mod } = await supabaseAdmin.from("clock_modifications").select("*").eq("id", modId).single();
    if (!mod) return { ok: false, error: "申請が見つかりません" };
    // ステータス更新
    const { error: upErr } = await supabaseAdmin.from("clock_modifications")
      .update({ status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
      .eq("id", modId);
    if (upErr) return { ok: false, error: "更新失敗" };
    // 承認の場合、clock_logsに反映（[2026-10-05] 自動承認と共通の applyClockMod に切り出し）
    if (status === "approved") {
      const err = await applyClockMod(mod);
      if (err) return { ok: false, error: err };
    }
    return { ok: true };
  },

  // [2026-05-14] 管理者が請負外注の金額を後から入力
  async set_outsource_amount(data, session) {
    if (!session || session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { logId, amount } = data as { logId: string; amount: number | null };
    if (!isStr(logId)) return { ok: false, error: "無効なパラメータ" };
    const amt = (amount === null || amount === undefined || amount === "") ? null : Math.floor(Number(amount));
    if (amt !== null && (isNaN(amt) || amt < 0)) return { ok: false, error: "金額が不正です" };
    const { error, count } = await supabaseAdmin
      .from("clock_logs")
      .update({ outsource_amount: amt })
      .eq("id", logId)
      .select("id", { count: "exact" });
    if (error) return { ok: false, error: "更新失敗: " + error.message };
    if (count === 0) return { ok: false, error: "対象の打刻が見つかりません" };
    return { ok: true };
  },

  async admin_edit_clock_log(data, session) {
    // [2026-07-27] recordModification=false で修正履歴(clock_modifications)を残さず時刻だけ変更できる
    // [2026-09-07] note を追加。出勤簿の備考を後から直す/消す手段が無く、打刻を削除して
    //   入れ直すしか方法がなかった。string の時だけ更新し、省略時は既存値を維持する。
    // [2026-09-25] 監査 H-5：adminName はクライアントの値を信用せず、セッションの本人名（DB）で記録する
    const { logId, clockIn, clockOut, projectId, reason, isNightShift, recordModification, note, earlyStart } = data as {
      logId: string; clockIn: string; clockOut: string; projectId?: string; reason: string; isNightShift?: boolean; recordModification?: boolean; note?: string; earlyStart?: boolean;
    };
    if (!isStr(logId)) return { ok: false, error: "無効なパラメータ" };
    if (!session || session.role !== "admin") return { ok: false, error: "権限がありません" };
    const adminName = session.name || session.staffId;
    // [2026-07-14] 退勤は出勤より後であること（夜勤の日跨ぎ入力もISOで比較すれば成立する）
    if (clockIn && clockOut && new Date(clockOut).getTime() <= new Date(clockIn).getTime()) {
      return { ok: false, error: "退勤時刻は出勤時刻より後にしてください" };
    }
    // 変更前の値を取得
    const { data: orig } = await supabaseAdmin.from("clock_logs").select("*").eq("id", logId).single();
    if (!orig) return { ok: false, error: "打刻ログが見つかりません" };
    // clock_logsを更新
    const upd: Record<string, unknown> = {};
    if (clockIn) upd.clock_in = clockIn;
    if (clockOut) upd.clock_out = clockOut;
    if (projectId) upd.project_id = projectId;
    // [2026-07-14] 夜勤フラグ。明示指定(true/false)された時のみ更新
    if (typeof isNightShift === "boolean") upd.is_night_shift = isNightShift;
    // [2026-09-07] 備考。空文字も正当な値（消す操作）なので typeof で判定する
    if (typeof note === "string") upd.note = note;
    // [2026-10-14] 早出。明示指定(true/false)された時のみ更新
    if (typeof earlyStart === "boolean") upd.early_start = earlyStart;
    const { error } = await supabaseAdmin.from("clock_logs").update(upd).eq("id", logId);
    if (error) return { ok: false, error: "更新失敗" };
    // 修正ログを記録（recordModification が明示的に false の時だけスキップ。省略時は従来通り記録）
    if (recordModification === false) return { ok: true };
    await supabaseAdmin.from("clock_modifications").insert({
      id: crypto.randomUUID(),
      type: "admin_edit",
      clock_log_id: logId,
      user_id: orig.user_id,
      user_name: orig.user_name,
      project_id: projectId || orig.project_id,
      original_clock_in: orig.clock_in,
      original_clock_out: orig.clock_out,
      requested_clock_in: clockIn || orig.clock_in,
      requested_clock_out: clockOut || orig.clock_out,
      reason: reason || "管理者による直接修正",
      requested_early_start: typeof earlyStart === "boolean" ? earlyStart : null,
      status: "applied",
      requested_by: adminName,
      reviewed_by: adminName,
      reviewed_at: new Date().toISOString(),
    });
    return { ok: true };
  },

  // [2026-04-15] 打刻削除UI追加: 管理者が誤打刻・テスト打刻を削除できる
  async admin_delete_clock_log(data, session) {
    // [2026-09-25] 監査 H-5：adminName はクライアントの値を信用せず、セッションの本人名（DB）で記録する
    const { logId } = data as { logId: string };
    if (!isStr(logId)) return { ok: false, error: "無効なパラメータ" };
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const adminName = session.name || session.staffId;
    // 削除前にスナップショットを clock_modifications に残す(監査用)
    const { data: orig } = await supabaseAdmin.from("clock_logs").select("*").eq("id", logId).single();
    if (!orig) return { ok: false, error: "打刻ログが見つかりません" };
    // [2026-05-07] Codex指摘#4: 監査 insert の error をチェックし、失敗したら本体 delete を実行しない
    const { error: auditErr } = await supabaseAdmin.from("clock_modifications").insert({
      id: crypto.randomUUID(),
      type: "admin_delete",
      clock_log_id: logId,
      user_id: orig.user_id,
      user_name: orig.user_name,
      project_id: orig.project_id,
      original_clock_in: orig.clock_in,
      original_clock_out: orig.clock_out,
      requested_clock_in: null,
      requested_clock_out: null,
      reason: "管理者による削除",
      status: "applied",
      requested_by: adminName,
      reviewed_by: adminName,
      reviewed_at: new Date().toISOString(),
    });
    if (auditErr) {
      console.error("admin_delete_clock_log audit insert failed:", auditErr);
      return { ok: false, error: "監査ログの記録に失敗しました（削除は中止）" };
    }
    const { error } = await supabaseAdmin.from("clock_logs").delete().eq("id", logId);
    if (error) return { ok: false, error: "削除失敗" };
    return { ok: true };
  },

  async admin_add_clock_log(data, session) {
    // [2026-09-25] 監査 H-5：adminName はクライアントの値を信用せず、セッションの本人名（DB）で記録する
    const { log, reason } = data as { log: Record<string, unknown>; reason: string };
    if (!log || !isStr(log.id)) return { ok: false, error: "無効なパラメータ" };
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const adminName = session.name || session.staffId;
    // [2026-07-14] 退勤は出勤より後であること（夜勤の日跨ぎ入力もISO比較で成立）
    if (log.clockIn && log.clockOut && new Date(log.clockOut as string).getTime() <= new Date(log.clockIn as string).getTime()) {
      return { ok: false, error: "退勤時刻は出勤時刻より後にしてください" };
    }
    // clock_logsに追加
    const { error } = await supabaseAdmin.from("clock_logs").insert({
      id: log.id,
      user_id: log.userId,
      user_name: log.userName,
      project_id: log.projectId,
      clock_in: log.clockIn,
      clock_out: log.clockOut || null,
      coords_in: null, coords_out: null,
      remarks: "", location_name: "",
      // [2026-09-07] 備考は理由欄に入力した文字をそのまま入れる（空なら空）。
      //   従来は「管理者による追加: 」が必ず前置され、出勤簿に「買取」等の区分を書きたいときに
      //   接頭辞が邪魔だった。誰が追加したかは下の clock_modifications
      //   (type:"admin_new" / requested_by / reason) に残るので、監査上の情報は失われない。
      note: reason || "",
      // [2026-07-14] 夜勤フラグ。true のみ受理
      is_night_shift: log.isNightShift === true,
    });
    if (error) return { ok: false, error: "登録失敗" };
    // 修正ログを記録
    await supabaseAdmin.from("clock_modifications").insert({
      id: crypto.randomUUID(),
      type: "admin_new",
      clock_log_id: log.id,
      user_id: log.userId as string,
      user_name: log.userName as string,
      project_id: log.projectId as string,
      requested_clock_in: log.clockIn as string,
      requested_clock_out: (log.clockOut as string) || null,
      reason: reason || "管理者による追加",
      status: "applied",
      requested_by: adminName,
      reviewed_by: adminName,
      reviewed_at: new Date().toISOString(),
    });
    return { ok: true };
  },

  // ──────────────────────────────
  // leaves
  // ──────────────────────────────
  // [2026-05-07] Codex指摘#2: 通常スタッフは payload の staffId を無視し、session.staffId 強制。
  // admin は任意の staffId に休暇登録できる（管理者代理申請用）。
  async insert_leave(data, session) {
    const raw = data as { staffId: string; entry: Record<string, unknown> };
    const entry = raw.entry;
    if (!session) return { ok: false, error: "認証が必要です" };
    // 通常スタッフ: 自分のみ。admin: payload を尊重
    const staffId = session.role === "admin" && isStr(raw.staffId) ? raw.staffId : session.staffId;
    if (!isStr(staffId) || !entry || !isStr(entry.id)) {
      return { ok: false, error: "無効なパラメータ" };
    }

    // ⑦ status検証: 自動承認できるのは paid / furikae / holiday
    // [2026-04-29] holiday も自動承認に追加（管理者には申請バナーで通知）
    const AUTO_APPROVE_TYPES = ["paid", "furikae", "holiday"];
    const requestedStatus = entry.status as string;
    const safeStatus = AUTO_APPROVE_TYPES.includes(entry.type as string) && requestedStatus === "承認"
      ? "承認"
      : "申請中";

    // [2026-04-29] 重複申請チェック（部分ユニークインデックス leaves_active_unique と二重防御）
    // 同一スタッフ・同日・同種別で「申請中」「承認」が既にあれば弾く（明示エラーで返却）
    // [2026-09-24] 種別一致だけだと、同じ日に有給と振休を両方登録できてしまい1日を二重消化する。
    //   丸一日休む種別（有給・振休・特別休暇・欠勤）は互いに排他にする。
    //   休日出勤(holiday)と遅刻・早退(late)は「休む」ではないので、このグループには入れない。
    const FULL_DAY_OFF = ["paid", "furikae", "special", "absence"];
    const typeLabel: Record<string, string> = {
      paid: "有給", furikae: "振替休日", holiday: "休日出勤",
      special: "特別休暇", absence: "欠勤", late: "遅刻・早退",
    };
    const conflictTypes = FULL_DAY_OFF.includes(entry.type as string)
      ? FULL_DAY_OFF
      : [entry.type as string];
    const { data: dupRows } = await supabaseAdmin
      .from("leaves")
      .select("id, status, type")
      .eq("staff_id", staffId)
      .eq("date", entry.date as string)
      .in("type", conflictTypes)
      .in("status", ["申請中", "承認"]);
    const dupRow = (dupRows || [])[0];
    if (dupRow) {
      const lbl = typeLabel[dupRow.type as string] || dupRow.type;
      const mine = typeLabel[entry.type as string] || entry.type;
      return dupRow.type === entry.type
        ? { ok: false, error: `${entry.date} の${lbl}は既に${dupRow.status}です（重複申請不可）` }
        : { ok: false, error: `${entry.date} は既に${lbl}が${dupRow.status}です。同じ日に${mine}は取れません` };
    }

    // ⑧ holiday_work_idの所有者チェック
    const workId = entry.holidayWorkId as string | null;
    if (workId) {
      const { data: workLeave, error: workErr } = await supabaseAdmin
        .from("leaves")
        .select("staff_id")
        .eq("id", workId)
        .single();
      if (workErr || !workLeave) {
        return { ok: false, error: "指定された休日出勤データが存在しません" };
      }
      if (workLeave.staff_id !== staffId) {
        return { ok: false, error: "他のスタッフの出勤データは使用できません" };
      }
    }

    // [2026-04-21] 振休は借り越し禁止: 承認で登録しようとしていて残が足りなければ reject
    if (entry.type === "furikae" && safeStatus === "承認" && Number(entry.days) > 0) {
      const check = await checkFurikaeWouldGoNegative(staffId, Number(entry.days));
      if (!check.ok) {
        return {
          ok: false,
          error: `振休残が不足しています（現在残${check.balance}日、この承認で${entry.days}日消化すると残${check.projected}日）。借り越しは禁止です。`,
        };
      }
    }

    // [2026-04-21] holiday_type × holiday_pref の組み合わせ検証（新ルール）
    // [2026-07-22] お盆・年末年始の有給繰越を廃止（休日に有給充当は法的に無効のため）→ 土曜と同じ振休/買取選択制
    // 日曜(法定休日)=振休のみ / 土曜・お盆・年末年始=振休 or 買取
    if (entry.type === "holiday") {
      const ht = entry.holidayType as string | null | undefined;
      const pref = entry.holidayPref as string | null | undefined;
      const allowedPrefs: Record<string, string[]> = {
        sunday: ["振休希望"],
        saturday: ["振休希望", "買取希望"],
        obon: ["振休希望", "買取希望"],
        newyear: ["振休希望", "買取希望"],
      };
      if (!ht || !(ht in allowedPrefs)) {
        return { ok: false, error: `休日出勤の種別(holidayType)が無効です: ${ht || "未指定"}` };
      }
      if (!pref || !allowedPrefs[ht].includes(pref)) {
        return {
          ok: false,
          error: `${ht}では「${pref || "未指定"}」は選択できません。許可: ${allowedPrefs[ht].join(", ")}`,
        };
      }
    }

    const { error } = await supabaseAdmin.from("leaves").insert({
      id: entry.id,
      staff_id: staffId,
      type: entry.type,
      date: entry.date,
      days: entry.days,
      memo: entry.memo || "",
      holiday_pref: entry.holidayPref || null,
      status: safeStatus,
      applied_at: entry.appliedAt,
      holiday_work_id: workId || null,
      holiday_type: entry.holidayType || null,
    });
    if (error) return { ok: false, error: "登録失敗" };

    // [2026-04-21] leave_balances.used 自動同期（承認済みの有給・振休のみ）
    await syncLeaveBalanceUsed(staffId, entry.type as string, Number(entry.days) || 0, safeStatus);
    return { ok: true };
  },

  async update_leave_status(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { leaveId, status } = data as { leaveId: string; status: string };
    if (!isStr(leaveId) || !isStr(status)) return { ok: false, error: "無効なパラメータ" };
    // [2026-04-21] used 同期のため旧データ取得
    const { data: orig } = await supabaseAdmin
      .from("leaves").select("staff_id,type,days,status").eq("id", leaveId).single();
    if (!orig) return { ok: false, error: "休暇が見つかりません" };
    // [2026-04-21] 振休の承認で借り越しになる場合は reject
    if (orig.type === "furikae" && status === "承認" && orig.status !== "承認" && Number(orig.days) > 0) {
      const check = await checkFurikaeWouldGoNegative(orig.staff_id as string, Number(orig.days));
      if (!check.ok) {
        return {
          ok: false,
          error: `承認できません: 振休残が不足しています（現在残${check.balance}日、この承認で${orig.days}日消化すると残${check.projected}日）。借り越しは禁止です。`,
        };
      }
    }
    const { error } = await supabaseAdmin
      .from("leaves")
      .update({ status })
      .eq("id", leaveId);
    if (error) return { ok: false, error: "更新失敗" };
    // 承認/却下の切り替えで used を調整
    await syncLeaveBalanceOnStatusChange(
      orig.staff_id as string,
      orig.type as string,
      Number(orig.days) || 0,
      orig.status as string,
      status
    );
    return { ok: true };
  },

  // ──────────────────────────────
  // [2026-06-16] AIチャット経由のDB操作（実行＋操作ログ＋取り消し）
  //   claude-proxy の ADMIN_TOOLS を管理者が承認後にここで実行する。
  //   既存アクションへ委譲しつつ、実行前に「逆操作(undo)」情報を ai_action_logs に保存。
  // ──────────────────────────────
  async ai_execute_tool(data, session) {
    if (!session || session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { tool, input } = data as { tool: string; input: Record<string, unknown> };
    if (!isStr(tool) || !input || typeof input !== "object") return { ok: false, error: "無効なパラメータ" };
    // [2026-09-25] session.name は verifySession で DB から取るようになった（従来は常に undefined で "admin" 記録）。
    //   委譲先の admin_* は data.adminName を無視して session.name で記録するので、ここの値は参考渡しのみ。
    const adminName = session.name || "admin";
    const inp = input as Record<string, any>;

    let message = "";
    let undo: Record<string, unknown> | null = null;

    try {
      if (tool === "edit_clock_log") {
        const { data: before } = await supabaseAdmin.from("clock_logs")
          .select("clock_in,clock_out,project_id").eq("id", inp.logId).single();
        if (!before) return { ok: false, error: "対象の打刻が見つかりません" };
        const r = await actions.admin_edit_clock_log(
          { logId: inp.logId, clockIn: inp.clockIn || "", clockOut: inp.clockOut || "",
            projectId: inp.projectId || "", reason: inp.reason || "", adminName }, session);
        if (!r.ok) return r;
        message = "打刻を修正しました";
        undo = { kind: "restore_clock_log", logId: inp.logId,
          clock_in: before.clock_in, clock_out: before.clock_out, project_id: before.project_id };

      } else if (tool === "add_clock_log") {
        const id = crypto.randomUUID();
        const r = await actions.admin_add_clock_log(
          { log: { id, userId: inp.userId, userName: inp.userName, projectId: inp.projectId,
            clockIn: inp.clockIn, clockOut: inp.clockOut || null }, reason: inp.reason || "", adminName }, session);
        if (!r.ok) return r;
        message = "打刻を追加しました";
        undo = { kind: "delete_clock_log", logId: id };

      } else if (tool === "delete_clock_log") {
        const { data: before } = await supabaseAdmin.from("clock_logs").select("*").eq("id", inp.logId).single();
        if (!before) return { ok: false, error: "対象の打刻が見つかりません" };
        const r = await actions.admin_delete_clock_log({ logId: inp.logId, adminName }, session);
        if (!r.ok) return r;
        message = "打刻を削除しました";
        undo = { kind: "reinsert_clock_log", row: before };

      } else if (tool === "set_leave_balance") {
        if (inp.type !== "paid") return { ok: false, error: "set_leave_balance は有給(paid)専用です。振休付与は insert_leave を使ってください。" };
        const { data: before } = await supabaseAdmin.from("leave_balances")
          .select("granted,used,carried").eq("staff_id", inp.staffId).eq("type", "paid").maybeSingle();
        const r = await actions.upsert_leave_balance(
          { staffId: inp.staffId, type: "paid", granted: Number(inp.granted) || 0, used: Number(inp.used) || 0 }, session);
        if (!r.ok) return r;
        message = "有給残日数を更新しました";
        undo = { kind: "restore_leave_balance", staffId: inp.staffId, type: "paid",
          existed: !!before, granted: before?.granted ?? 0, used: before?.used ?? 0, carried: before?.carried ?? 0 };

      } else if (tool === "insert_leave") {
        const id = crypto.randomUUID();
        const r = await actions.insert_leave(
          { staffId: inp.staffId, entry: { id, type: inp.type, date: inp.date, days: Number(inp.days) || 1,
            memo: inp.memo || "", holidayPref: inp.holidayPref || null, holidayType: inp.holidayType || null,
            status: "承認", appliedAt: new Date().toISOString() } }, session);
        if (!r.ok) return r;
        const { data: ins } = await supabaseAdmin.from("leaves").select("status").eq("id", id).single();
        message = "休暇を登録しました";
        undo = { kind: "delete_leave", leaveId: id, staffId: inp.staffId, type: inp.type,
          days: Number(inp.days) || 1, status: ins?.status || "申請中" };

      } else if (tool === "update_leave_status") {
        const { data: before } = await supabaseAdmin.from("leaves")
          .select("staff_id,type,days,status").eq("id", inp.leaveId).single();
        if (!before) return { ok: false, error: "対象の休暇が見つかりません" };
        const r = await actions.update_leave_status({ leaveId: inp.leaveId, status: inp.status }, session);
        if (!r.ok) return r;
        message = `${inp.status}しました`;
        undo = { kind: "restore_leave_status", leaveId: inp.leaveId, staffId: before.staff_id,
          type: before.type, days: before.days, oldStatus: before.status, newStatus: inp.status };

      } else if (tool === "insert_subcontractor") {
        const id = crypto.randomUUID();
        const r = await actions.insert_subcontractor(
          { subcontractor: { id, projectId: inp.projectId, companyName: inp.companyName,
            date: inp.date || new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10),
            headcount: Number(inp.headcount) || 1, memo: inp.memo || "" } }, session);
        if (!r.ok) return r;
        message = "外注を登録しました";
        undo = { kind: "delete_subcontractor", subcontractorId: id };

      } else {
        return { ok: false, error: "未知のツール: " + tool };
      }
    } catch (e) {
      return { ok: false, error: "実行エラー: " + (e instanceof Error ? e.message : String(e)) };
    }

    // 操作ログ記録（記録失敗はメイン処理を妨げない）
    const { error: logErr } = await supabaseAdmin.from("ai_action_logs").insert({
      staff_id: session.staffId,
      action_type: tool,
      action_detail: { input: inp, message, undo, success: true },
    });
    if (logErr) console.error("ai_action_logs insert failed:", logErr.message);

    return { ok: true, message };
  },

  // 取り消し可能な直近のAI操作を1件返す（取り消しボタンの確認表示用）
  async ai_last_action(_data, session) {
    if (!session || session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { data: rows } = await supabaseAdmin.from("ai_action_logs")
      .select("id,action_type,action_detail,created_at")
      .eq("undone", false).order("created_at", { ascending: false }).limit(10);
    const row = (rows || []).find((r: Record<string, any>) => r.action_detail?.undo);
    if (!row) return { ok: true, action: null };
    return { ok: true, action: { id: row.id, type: row.action_type,
      message: row.action_detail?.message || "", createdAt: row.created_at } };
  },

  // 直前のAI操作を1件取り消す（逆操作を実行）
  async ai_undo_last(_data, session) {
    if (!session || session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { data: rows } = await supabaseAdmin.from("ai_action_logs")
      .select("*").eq("undone", false).order("created_at", { ascending: false }).limit(10);
    const row = (rows || []).find((r: Record<string, any>) => r.action_detail?.undo);
    if (!row) return { ok: false, error: "取り消せるAI操作がありません" };
    const u = row.action_detail.undo as Record<string, any>;
    try {
      if (u.kind === "delete_clock_log") {
        const { error } = await supabaseAdmin.from("clock_logs").delete().eq("id", u.logId);
        if (error) return { ok: false, error: "取り消し失敗: " + error.message };
      } else if (u.kind === "restore_clock_log") {
        const { error } = await supabaseAdmin.from("clock_logs")
          .update({ clock_in: u.clock_in, clock_out: u.clock_out, project_id: u.project_id }).eq("id", u.logId);
        if (error) return { ok: false, error: "取り消し失敗: " + error.message };
      } else if (u.kind === "reinsert_clock_log") {
        const { error } = await supabaseAdmin.from("clock_logs").insert(u.row);
        if (error) return { ok: false, error: "取り消し失敗: " + error.message };
      } else if (u.kind === "restore_leave_balance") {
        if (u.existed) {
          await supabaseAdmin.from("leave_balances").upsert({
            staff_id: u.staffId, type: u.type, granted: u.granted, used: u.used, carried: u.carried,
            updated_at: new Date().toISOString() }, { onConflict: "staff_id,type" });
        } else {
          await supabaseAdmin.from("leave_balances").delete().eq("staff_id", u.staffId).eq("type", u.type);
        }
      } else if (u.kind === "delete_leave") {
        await supabaseAdmin.from("leaves").delete().eq("id", u.leaveId);
        if (u.status === "承認") await adjustLeaveBalanceUsed(u.staffId, u.type, -(Number(u.days) || 0));
      } else if (u.kind === "restore_leave_status") {
        await supabaseAdmin.from("leaves").update({ status: u.oldStatus }).eq("id", u.leaveId);
        await syncLeaveBalanceOnStatusChange(u.staffId, u.type, Number(u.days) || 0, u.newStatus, u.oldStatus);
      } else if (u.kind === "delete_subcontractor") {
        await supabaseAdmin.from("subcontractors").delete().eq("id", u.subcontractorId);
      } else {
        return { ok: false, error: "未対応の取り消し種別です" };
      }
    } catch (e) {
      return { ok: false, error: "取り消しエラー: " + (e instanceof Error ? e.message : String(e)) };
    }
    await supabaseAdmin.from("ai_action_logs")
      .update({ undone: true, undone_at: new Date().toISOString() }).eq("id", row.id);
    return { ok: true, message: `取り消しました（${row.action_detail?.message || row.action_type}）` };
  },

  // ──────────────────────────────
  // attachments
  // ──────────────────────────────
  async insert_attachment(data, session) {
    const { projectId, attachment } = data as {
      projectId: string; attachment: Record<string, unknown>;
    };
    if (!isStr(projectId) || !attachment || !isStr(attachment.id)) {
      return { ok: false, error: "無効なパラメータ" };
    }
    const dataStr = (attachment.data as string) || "";
    const fileUrl = (attachment.fileUrl as string) || "";
    if (dataStr.length > 10_000_000) {
      return { ok: false, error: "ファイルサイズが大きすぎます（上限 約7.5MB）" };
    }
    // [2026-07-09] author は payload を信用せず、セッションの本人名で確定（なりすまし防止）
    const { data: meRow } = await supabaseAdmin
      .from("staff").select("name").eq("id", session.staffId).single();
    const author = meRow?.name || "";
    // [2026-05-21] file_url（Storage URL）を優先運用。新規保存は data 空・file_url 入りが推奨
    const { error } = await supabaseAdmin.from("attachments").insert({
      id: attachment.id,
      project_id: projectId,
      type: attachment.type || "",
      text: attachment.text || "",
      name: attachment.name || "",
      data: dataStr,
      file_url: fileUrl,
      author,
      created_at: attachment.createdAt,
    });
    return error ? { ok: false, error: "登録失敗" } : { ok: true };
  },

  async delete_attachment(data, session) {
    const { attachmentId } = data as { attachmentId: string };
    if (!isStr(attachmentId)) return { ok: false, error: "無効なパラメータ" };
    // [2026-07-09] 投稿者本人 or admin のみ削除可（従来は誰でも任意の添付を削除できた）。
    //   attachments は uploaded_by 列を持たず author（名前）で記録されるため名前で照合する。
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("attachments").select("author").eq("id", attachmentId).single();
    if (fetchErr || !row) return { ok: false, error: "添付が見つかりません" };
    if (session.role !== "admin") {
      const { data: meRow } = await supabaseAdmin
        .from("staff").select("name").eq("id", session.staffId).single();
      if (!meRow?.name || meRow.name !== row.author) {
        return { ok: false, error: "権限がありません" };
      }
    }
    const { error } = await supabaseAdmin
      .from("attachments")
      .delete()
      .eq("id", attachmentId);
    return error ? { ok: false, error: "削除失敗" } : { ok: true };
  },

  // ──────────────────────────────
  // [2026-06-17] project_drawings（図面データ）
  //   画像/PDF を base64(data URL) で file_data に保持。
  //   アップロードは全ログインユーザー可。削除は投稿者本人 or admin のみ。
  // ──────────────────────────────
  async insert_project_drawing(data, session) {
    if (!session) return { ok: false, error: "セッションが必要です" };
    const d = data.drawing as Record<string, unknown>;
    if (!d || !isStr(d.id) || !isStr(d.projectId)) {
      return { ok: false, error: "無効なパラメータ（id/projectId 必須）" };
    }
    const fileData = (d.fileData as string) || "";
    if (fileData.length > 10_000_000) {
      return { ok: false, error: "ファイルサイズが大きすぎます（上限 約7.5MB）" };
    }
    const fileType = d.fileType === "pdf" ? "pdf" : "image";
    const { error } = await supabaseAdmin.from("project_drawings").insert({
      id: d.id,
      project_id: d.projectId,
      file_name: d.fileName || "",
      file_type: fileType,
      file_data: fileData,
      uploaded_by: session.staffId,
      created_at: d.createdAt || new Date().toISOString(),
    });
    return error ? { ok: false, error: "登録失敗: " + error.message } : { ok: true };
  },

  async list_project_drawings(data, session) {
    if (!session) return { ok: false, error: "セッションが必要です" };
    const { projectId } = data as { projectId: string };
    if (!isStr(projectId)) return { ok: false, error: "無効なパラメータ" };
    const { data: rows, error } = await supabaseAdmin
      .from("project_drawings")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    if (error) return { ok: false, error: "取得失敗: " + error.message };
    // [2026-07-09] Storage移行済み（storage_path あり・file_data 空）の図面は、
    //   非公開バケットの署名付きURL（1時間有効）を発行して file_data に載せて返す。
    //   未移行（DB内base64）はそのまま返す。フロントは file_data をそのまま表示するだけでよい。
    const out = await Promise.all((rows || []).map(async (r) => {
      if (r.storage_path && !r.file_data) {
        const { data: signed } = await supabaseAdmin.storage
          .from("project-drawings")
          .createSignedUrl(r.storage_path, 3600);
        return { ...r, file_data: signed?.signedUrl || "" };
      }
      return r;
    }));
    return { ok: true, rows: out };
  },

  async delete_project_drawing(data, session) {
    if (!session) return { ok: false, error: "セッションが必要です" };
    const { drawingId } = data as { drawingId: string };
    if (!isStr(drawingId)) return { ok: false, error: "無効なパラメータ" };
    // 投稿者本人 or admin のみ削除可
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("project_drawings")
      .select("uploaded_by, storage_path")
      .eq("id", drawingId)
      .single();
    if (fetchErr || !row) return { ok: false, error: "図面が見つかりません" };
    if (session.role !== "admin" && row.uploaded_by !== session.staffId) {
      return { ok: false, error: "権限がありません" };
    }
    // [2026-07-09] Storage移行済みなら実ファイルも削除（消し忘れ防止）
    if (row.storage_path) {
      await supabaseAdmin.storage.from("project-drawings").remove([row.storage_path]);
    }
    const { error } = await supabaseAdmin
      .from("project_drawings")
      .delete()
      .eq("id", drawingId);
    return error ? { ok: false, error: "削除失敗: " + error.message } : { ok: true };
  },

  // ──────────────────────────────
  // handover_memos
  // ──────────────────────────────
  async insert_handover_memo(data, session) {
    const memo = data.memo as Record<string, unknown>;
    if (!memo || !isStr(memo.id)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("handover_memos").insert({
      id: memo.id,
      project_id: memo.projectId,
      // [2026-09-25] author は payload を信用せずセッションの本人名で確定（なりすまし防止・削除権限の判定に使う）
      author: session.name || "",
      text: memo.text || "",
      image_url: memo.imageUrl || "",
      created_at: memo.createdAt,
      read_by: [],
    });
    return error ? { ok: false, error: "登録失敗" } : { ok: true };
  },

  // [2026-09-09] 管理者による現場情報の編集（管理者画面の「現場編集」タブ用）。
  //   進捗報告・引継ぎメモは登録しかできず、誤報告や誤字を直す手段が無かった
  //   （メモは削除して入れ直すしかなく、進捗に至っては消すことすらできなかった）。
  //   いずれも admin 限定。現場スタッフからは呼べない。
  async admin_update_progress_report(data, session) {
    if (session?.role !== "admin") return { ok: false, error: "権限がありません" };
    const { reportId, percent, comment } = data as { reportId: string; percent?: number; comment?: string };
    if (!isStr(reportId)) return { ok: false, error: "無効なパラメータ" };
    const patch: Record<string, unknown> = {};
    if (isNum(percent)) patch.percent = Math.min(Math.max(Math.round(percent as number), 0), 100);
    if (typeof comment === "string") patch.comment = comment;   // 空文字も正当な値（消す操作）として扱う
    if (Object.keys(patch).length === 0) return { ok: false, error: "変更内容がありません" };
    const { error } = await supabaseAdmin.from("progress_reports").update(patch).eq("id", reportId);
    return error ? { ok: false, error: "更新失敗: " + error.message } : { ok: true };
  },

  async admin_delete_progress_report(data, session) {
    if (session?.role !== "admin") return { ok: false, error: "権限がありません" };
    const { reportId } = data as { reportId: string };
    if (!isStr(reportId)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("progress_reports").delete().eq("id", reportId);
    return error ? { ok: false, error: "削除失敗: " + error.message } : { ok: true };
  },

  async admin_update_handover_memo(data, session) {
    if (session?.role !== "admin") return { ok: false, error: "権限がありません" };
    const { memoId, text } = data as { memoId: string; text: string };
    if (!isStr(memoId) || typeof text !== "string") return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("handover_memos").update({ text }).eq("id", memoId);
    return error ? { ok: false, error: "更新失敗: " + error.message } : { ok: true };
  },

  async mark_handover_read(data, session) {
    const { memoId } = data as { memoId: string };
    // [2026-07-09] 既読対象は自分自身に固定。payload の userId を信用すると他人を既読化できるため session.staffId を使う。
    const userId = session.staffId;
    if (!isStr(memoId) || !isStr(userId)) return { ok: false, error: "無効なパラメータ" };

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("handover_memos")
      .select("read_by")
      .eq("id", memoId)
      .single();
    if (fetchErr || !row) return { ok: false, error: "メモが見つかりません" };

    const readBy: string[] = row.read_by || [];
    if (readBy.includes(userId)) return { ok: true };

    const { error } = await supabaseAdmin
      .from("handover_memos")
      .update({ read_by: [...readBy, userId] })
      .eq("id", memoId);
    return error ? { ok: false, error: "更新失敗" } : { ok: true };
  },

  async delete_handover_memo(data, session) {
    const { memoId } = data as { memoId: string };
    if (!isStr(memoId)) return { ok: false, error: "無効なパラメータ" };
    // [2026-09-25] 監査 H-3 残り：作成者本人か admin のみ削除可（従来は誰でも他人のメモを消せた）
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("handover_memos").select("author").eq("id", memoId).single();
    if (fetchErr || !row) return { ok: false, error: "メモが見つかりません" };
    if (!isOwnerOrAdmin(session, row.author)) return { ok: false, error: "権限がありません（作成者か管理者のみ削除できます）" };
    const { error } = await supabaseAdmin
      .from("handover_memos")
      .delete()
      .eq("id", memoId);
    return error ? { ok: false, error: "削除失敗" } : { ok: true };
  },

  // ──────────────────────────────
  // announcements
  // ──────────────────────────────
  async insert_announcement(data, session) {
    const ann = data.announcement as Record<string, unknown>;
    if (!ann || !isStr(ann.id)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("announcements").insert({
      id: ann.id,
      // [2026-09-25] author / role は payload を信用せずセッション（DB）で確定（なりすまし防止・削除権限の判定に使う）
      author: session.name || "",
      role: session.role || "",
      text: ann.text || "",
      created_at: ann.createdAt,
      read_by: [],
    });
    if (error) return { ok: false, error: "登録失敗" };
    // Push通知をバックグラウンドで送信（失敗しても本体に影響しない）
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
      body: JSON.stringify({ title: "📢 お知らせ", body: String(ann.text || "").slice(0, 100), url: "/user" }),
    }).catch(() => {});
    return { ok: true };
  },

  // [2026-10-19] アナウンスを自分の画面から消す（読んだ人が自分だけ非表示。ほかの人には残る）。既読にもする
  async hide_announcement(data, session) {
    const { announcementId } = data as { announcementId: string };
    const userId = session?.staffId;
    if (!isStr(announcementId) || !isStr(userId)) return { ok: false, error: "無効なパラメータ" };
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("announcements").select("read_by, hidden_by").eq("id", announcementId).single();
    if (fetchErr || !row) return { ok: false, error: "お知らせが見つかりません" };
    const readBy: string[] = row.read_by || [];
    const hiddenBy: string[] = row.hidden_by || [];
    if (hiddenBy.includes(userId)) return { ok: true };
    const { error } = await supabaseAdmin.from("announcements")
      .update({ hidden_by: [...hiddenBy, userId], read_by: readBy.includes(userId) ? readBy : [...readBy, userId] })
      .eq("id", announcementId);
    return error ? { ok: false, error: "更新失敗: " + error.message } : { ok: true };
  },

  async mark_announcement_read(data, session) {
    const { announcementId } = data as { announcementId: string };
    // [2026-07-09] 既読対象は自分自身に固定。payload の userId を信用すると他人を既読化できるため session.staffId を使う。
    const userId = session.staffId;
    if (!isStr(announcementId) || !isStr(userId)) return { ok: false, error: "無効なパラメータ" };

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("announcements")
      .select("read_by")
      .eq("id", announcementId)
      .single();
    if (fetchErr || !row) return { ok: false, error: "お知らせが見つかりません" };

    const readBy: string[] = row.read_by || [];
    if (readBy.includes(userId)) return { ok: true };

    const { error } = await supabaseAdmin
      .from("announcements")
      .update({ read_by: [...readBy, userId] })
      .eq("id", announcementId);
    if (error) return { ok: false, error: "更新失敗" };
    // notification_reads にもタイムスタンプ付きで記録
    await supabaseAdmin.from("notification_reads").upsert({
      id: `${userId}_announcement_${announcementId}`,
      staff_id: userId,
      notification_type: "announcement",
      notification_id: announcementId,
      read_at: new Date().toISOString(),
    }, { onConflict: "staff_id,notification_type,notification_id" });
    return { ok: true };
  },

  async load_notification_reads(data) {
    const { data: rows, error } = await supabaseAdmin
      .from("notification_reads")
      .select("staff_id, notification_type, notification_id, read_at")
      .order("read_at", { ascending: false });
    return error ? { ok: false, reads: [] } : { ok: true, reads: rows || [] };
  },

  // ── Push通知 ──────────────────────────────────
  async get_vapid_public_key(_data) {
    return { ok: true, key: Deno.env.get("VAPID_PUBLIC_KEY") || "" };
  },

  async save_push_subscription(data, session) {
    const { endpoint, keys } = data as { endpoint: string; keys: { p256dh: string; auth: string } };
    if (!session?.staffId || !endpoint || !keys) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      { staff_id: session.staffId, endpoint, keys, created_at: new Date().toISOString() },
      { onConflict: "endpoint" }
    );
    return error ? { ok: false, error: error.message } : { ok: true };
  },

  async delete_push_subscription(data, session) {
    if (!session?.staffId) return { ok: false };
    await supabaseAdmin.from("push_subscriptions").delete().eq("staff_id", session.staffId);
    return { ok: true };
  },

  async send_push_to_all(data, session) {
    if (session?.role !== "admin") return { ok: false, error: "権限がありません" };
    const { title, body, staffIds } = data as { title: string; body: string; staffIds?: string[] };
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
      body: JSON.stringify({ title, body, staffIds }),
    });
    const json = await res.json();
    return json;
  },

  async delete_announcement(data, session) {
    const { announcementId } = data as { announcementId: string };
    if (!isStr(announcementId)) return { ok: false, error: "無効なパラメータ" };
    // [2026-09-25] 監査 A-6/H-3 残り：作成者本人か admin のみ削除可（従来はスタッフが管理者のお知らせも消せた）
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("announcements").select("author").eq("id", announcementId).single();
    if (fetchErr || !row) return { ok: false, error: "お知らせが見つかりません" };
    if (!isOwnerOrAdmin(session, row.author)) return { ok: false, error: "権限がありません（作成者か管理者のみ削除できます）" };
    const { error } = await supabaseAdmin
      .from("announcements")
      .delete()
      .eq("id", announcementId);
    return error ? { ok: false, error: "削除失敗" } : { ok: true };
  },

  // ──────────────────────────────
  // customers
  // ──────────────────────────────
  async insert_customer(data, session) {
    // [2026-07-09] 顧客情報の登録は admin 限定（連絡先・請求日などの管理情報のため）
    if (session?.role !== "admin") {
      return { ok: false, error: "権限がありません（admin のみ実行可能）" };
    }
    const c = data.customer as Record<string, unknown>;
    if (!c || !isStr(c.id)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("customers").insert({
      id: c.id,
      name: c.name || "",
      contact: c.contact || "",
      phone: c.phone || "",
      email: c.email || "",
      billing_date: c.billingDate || null,
      // [2026-04-16] 夜タスク ②: 請求日・振込日（1-31）
      closing_day: isNum(c.closingDay) ? (c.closingDay as number) : null,
      payment_day: isNum(c.paymentDay) ? (c.paymentDay as number) : null,
      // [2026-04-20] 進捗確認日（月2回）。day1=客先共有, day2=内部のみ
      progress_check_day1: isNum(c.progressCheckDay1) ? (c.progressCheckDay1 as number) : null,
      progress_check_day2: isNum(c.progressCheckDay2) ? (c.progressCheckDay2 as number) : null,
      // [2026-10-14] 請求の打診日（1-31、31＝月末）
      consult_day: isNum(c.consultDay) ? (c.consultDay as number) : null,
      project_id: c.projectId || null,
      progress: c.progress || 0,
      progress_responses: [],
      memo: c.memo || "",
      created_at: c.createdAt,
    });
    return error ? { ok: false, error: "登録失敗" } : { ok: true };
  },

  async update_customer(data, session) {
    // [2026-07-09] 顧客情報の編集は admin 限定（連絡先・請求日などの管理情報のため）
    if (session?.role !== "admin") {
      return { ok: false, error: "権限がありません（admin のみ実行可能）" };
    }
    const { customerId, updates } = data as {
      customerId: string; updates: Record<string, unknown>;
    };
    if (!isStr(customerId) || !updates) return { ok: false, error: "無効なパラメータ" };

    const allowed: Record<string, string> = {
      name: "name", contact: "contact", phone: "phone",
      email: "email", billingDate: "billing_date",
      projectId: "project_id", memo: "memo",
      // [2026-04-16] 夜タスク ②: 請求日・振込日
      closingDay: "closing_day", paymentDay: "payment_day",
      // [2026-04-20] 進捗確認日（月2回）
      progressCheckDay1: "progress_check_day1",
      progressCheckDay2: "progress_check_day2",
      // [2026-10-14] 請求の打診日（1-31、31＝月末）と、打診を済ませた月（'YYYY-MM'）
      consultDay: "consult_day",
      consultDoneMonth: "consult_done_month",
    };
    const dateCols = new Set(["billing_date"]);
    const intCols = new Set(["closing_day", "payment_day", "progress_check_day1", "progress_check_day2", "consult_day"]);
    const patch: Record<string, unknown> = {};
    for (const [key, col] of Object.entries(allowed)) {
      if (!(key in updates)) continue;
      let v = updates[key];
      if (dateCols.has(col) && (v === "" || v === undefined)) v = null;
      if (intCols.has(col) && (v === "" || v === undefined)) v = null;
      if (col === "consult_day" && v !== null && !(Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 31)) return { ok: false, error: "打診日は1〜31で入れてください" };
      if (col === "consult_done_month" && v !== null && !(typeof v === "string" && /^\d{4}-\d{2}$/.test(v))) return { ok: false, error: "打診済みの月が不正です" };
      patch[col] = v;
    }
    if (Object.keys(patch).length === 0) return { ok: false, error: "更新項目がありません" };

    const { error } = await supabaseAdmin
      .from("customers")
      .update(patch)
      .eq("id", customerId);
    return error ? { ok: false, error: `更新失敗: ${error.message}` } : { ok: true };
  },

  async update_customer_progress(data) {
    const { customerId, progress } = data as { customerId: string; progress: number };
    if (!isStr(customerId) || !isNum(progress)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin
      .from("customers")
      .update({ progress: Math.min(Math.max(progress, 0), 100) })
      .eq("id", customerId);
    return error ? { ok: false, error: "更新失敗" } : { ok: true };
  },

  async insert_progress_response(data) {
    const { customerId, response } = data as {
      customerId: string; response: Record<string, unknown>;
    };
    if (!isStr(customerId) || !response) return { ok: false, error: "無効なパラメータ" };

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("customers")
      .select("progress_responses")
      .eq("id", customerId)
      .single();
    if (fetchErr || !row) return { ok: false, error: "顧客が見つかりません" };

    const existing = (row.progress_responses as Record<string, unknown>[]) || [];
    const staffId = response.staffId as string;
    const updated = [...existing.filter((r: Record<string, unknown>) => r.staffId !== staffId), response];

    const { error } = await supabaseAdmin
      .from("customers")
      .update({ progress_responses: updated })
      .eq("id", customerId);
    return error ? { ok: false, error: "更新失敗" } : { ok: true };
  },

  // ──────────────────────────────
  // subcontractors
  // ──────────────────────────────
  async insert_subcontractor(data) {
    const s = data.subcontractor as Record<string, unknown>;
    if (!s || !isStr(s.id) || !isStr(s.projectId) || !isStr(s.companyName)) {
      return { ok: false, error: "無効なパラメータ" };
    }
    const { error } = await supabaseAdmin.from("subcontractors").insert({
      id: s.id,
      project_id: s.projectId,
      date: s.date || new Date().toISOString().slice(0, 10),
      company_name: s.companyName,
      headcount: s.headcount || 1,
      memo: s.memo || "",
      workers: s.workers || "",
    });
    return error ? { ok: false, error: "登録失敗" } : { ok: true };
  },

  async update_subcontractor_workers(data) {
    const { subcontractorId, workers } = data as { subcontractorId: string; workers: string };
    if (!isStr(subcontractorId) || typeof workers !== "string") return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("subcontractors").update({ workers }).eq("id", subcontractorId);
    return error ? { ok: false, error: "更新失敗" } : { ok: true };
  },

  async delete_subcontractor(data, session) {
    // [2026-09-25] 監査 A-6/H-3 残り：作成者を記録する列が無く、画面からの呼び出しも無い（AIの取り消しは直接DB削除）。admin のみに限定
    if (session?.role !== "admin") return { ok: false, error: "権限がありません（admin のみ実行可能）" };
    const { subcontractorId } = data as { subcontractorId: string };
    if (!isStr(subcontractorId)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin
      .from("subcontractors")
      .delete()
      .eq("id", subcontractorId);
    return error ? { ok: false, error: "削除失敗" } : { ok: true };
  },

  // ──────────────────────────────
  // additional_works
  // ──────────────────────────────
  async insert_additional_work(data) {
    const w = data.work as Record<string, unknown>;
    if (!w || !isStr(w.id) || !isStr(w.projectId) || !isStr(w.description)) {
      return { ok: false, error: "無効なパラメータ" };
    }
    const { error } = await supabaseAdmin.from("additional_works").insert({
      id: w.id,
      project_id: w.projectId,
      description: w.description,
      floor: w.floor || "",
      location: w.location || "",
      image_url: w.imageUrl || "",
    });
    // [2026-05-19] lessons_learned #1: 真因がトーストで見えるよう error.message を返す
    return error ? { ok: false, error: "登録失敗: " + error.message } : { ok: true };
  },

  async delete_additional_work(data, session) {
    // [2026-09-25] 監査 A-6/H-3 残り：作成者を記録する列が無く、画面からの呼び出しも無い。admin のみに限定
    if (session?.role !== "admin") return { ok: false, error: "権限がありません（admin のみ実行可能）" };
    const { workId } = data as { workId: string };
    if (!isStr(workId)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin
      .from("additional_works")
      .delete()
      .eq("id", workId);
    return error ? { ok: false, error: "削除失敗" } : { ok: true };
  },

  // ──────────────────────────────
  // [2026-06-16] 追加見積（案件レベル・収入側＝元請からの追加受注）
  //   [2026-06-17] 外注費とは分離。subcontract_cost への自動反映は廃止。
  //   受注額(contract_amount)の合計は請負金額に加算して「トータル受注額」表示（フロント側）。
  //   金額系のため admin のみ。
  // ──────────────────────────────
  async list_additional_estimates(data, session) {
    if (!session || session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { projectId } = data as { projectId: string };
    if (!isStr(projectId)) return { ok: false, error: "無効なパラメータ" };
    const { data: rows, error } = await supabaseAdmin
      .from("additional_estimates")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    if (error) return { ok: false, error: "取得失敗: " + error.message };
    return { ok: true, rows: rows || [] };
  },

  async insert_additional_estimate(data, session) {
    if (!session || session.role !== "admin") return { ok: false, error: "権限がありません" };
    const e = data.estimate as Record<string, unknown>;
    if (!e || !isStr(e.id) || !isStr(e.projectId) || !isStr(e.name)) {
      return { ok: false, error: "無効なパラメータ（id/projectId/name 必須）" };
    }
    const { error } = await supabaseAdmin.from("additional_estimates").insert({
      id: e.id,
      project_id: e.projectId,
      name: e.name,
      estimated_amount: Math.round(Number(e.estimatedAmount) || 0),
      contract_amount: Math.round(Number(e.contractAmount) || 0),
    });
    if (error) return { ok: false, error: "登録失敗: " + error.message };
    return { ok: true };
  },

  async update_additional_estimate(data, session) {
    if (!session || session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { estimateId, fields } = data as { estimateId: string; fields: Record<string, unknown> };
    if (!isStr(estimateId) || !fields) return { ok: false, error: "無効なパラメータ" };
    const patch: Record<string, unknown> = {};
    if ("name" in fields && isStr(fields.name)) patch.name = fields.name;
    if ("estimatedAmount" in fields) patch.estimated_amount = Math.round(Number(fields.estimatedAmount) || 0);
    if ("contractAmount" in fields) patch.contract_amount = Math.round(Number(fields.contractAmount) || 0);
    if (Object.keys(patch).length === 0) return { ok: false, error: "更新項目がありません" };
    const { error } = await supabaseAdmin
      .from("additional_estimates").update(patch).eq("id", estimateId);
    if (error) return { ok: false, error: "更新失敗: " + error.message };
    return { ok: true };
  },

  async delete_additional_estimate(data, session) {
    if (!session || session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { estimateId } = data as { estimateId: string };
    if (!isStr(estimateId)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin
      .from("additional_estimates").delete().eq("id", estimateId);
    if (error) return { ok: false, error: "削除失敗: " + error.message };
    return { ok: true };
  },

  // ──────────────────────────────
  // staff rates
  // ──────────────────────────────
  async update_rates(data, session) {
    if (session.role !== "admin") {
      return { ok: false, error: "権限がありません（admin のみ実行可能）" };
    }
    const updates = data.updates as Array<{ id: string; dailyRate: number }>;
    if (!Array.isArray(updates) || updates.length === 0 || updates.length > 20) {
      return { ok: false, error: "updates は1〜20件の配列で指定してください" };
    }
    const results = [];
    for (const u of updates) {
      if (!isStr(u.id)) {
        results.push({ id: u.id, ok: false, error: "無効なID" });
        continue;
      }
      if (!isNum(u.dailyRate) || u.dailyRate < 0 || u.dailyRate > 1_000_000) {
        results.push({ id: u.id, ok: false, error: "無効な単価（0〜1,000,000）" });
        continue;
      }
      const { error } = await supabaseAdmin
        .from("staff")
        .update({ daily_rate: u.dailyRate })
        .eq("id", u.id);
      results.push({ id: u.id, ok: !error, dailyRate: error ? null : u.dailyRate });
    }
    return { ok: results.every((r) => r.ok), result: results };
  },

  // [2026-07-09] スタッフ日給の取得（admin限定）。
  //   staff_public ビューから daily_rate を除外した（migration 056）ため、
  //   人件費計算・単価編集で日給が必要な admin だけがこの経路で取得する。
  async list_staff_rates(_data, session) {
    if (session.role !== "admin") {
      return { ok: false, error: "権限がありません（admin のみ実行可能）" };
    }
    const { data: rows, error } = await supabaseAdmin
      .from("staff")
      .select("id, daily_rate")
      .order("id");
    if (error) return { ok: false, error: "取得失敗: " + error.message };
    return { ok: true, rates: (rows || []).map((r) => ({ id: r.id, dailyRate: r.daily_rate })) };
  },

  // ──────────────────────────────
  // [v14] contacts（名刺管理 — 全ユーザー可）
  // ──────────────────────────────
  async insert_contact(data) {
    const c = data.contact as Record<string, unknown>;
    if (!c || !isStr(c.id)) return { ok: false, error: "無効なパラメータ" };
    // [2026-04-28] photoUrl（base64画像）と category（顧客/協力会社）を保存
    const { error } = await supabaseAdmin.from("contacts").insert({
      id: c.id,
      name: c.name || "",
      company: c.company || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      notes: c.notes || "",
      photo_url: c.photoUrl || "",
      category: c.category || "顧客",
      created_at: c.createdAt || new Date().toISOString(),
    });
    return error ? { ok: false, error: "登録失敗: " + error.message } : { ok: true };
  },

  async update_contact(data) {
    const { contactId, updates } = data as { contactId: string; updates: Record<string, unknown> };
    if (!isStr(contactId) || !updates) return { ok: false, error: "無効なパラメータ" };

    // [2026-04-28] photoUrl と category も更新可
    const allowed: Record<string, string> = {
      name: "name", company: "company", phone: "phone",
      email: "email", address: "address", notes: "notes",
      photoUrl: "photo_url", category: "category",
    };
    const patch: Record<string, unknown> = {};
    for (const [key, col] of Object.entries(allowed)) {
      if (key in updates) patch[col] = updates[key];
    }
    if (Object.keys(patch).length === 0) return { ok: false, error: "更新項目がありません" };

    const { error } = await supabaseAdmin
      .from("contacts")
      .update(patch)
      .eq("id", contactId);
    return error ? { ok: false, error: "更新失敗: " + error.message } : { ok: true };
  },

  async delete_contact(data, session) {
    // [2026-09-25] 監査 A-6/H-3 残り：作成者を記録する列が無く、削除ボタンは管理画面(admin.html)にしか無い。admin のみに限定
    if (session?.role !== "admin") return { ok: false, error: "権限がありません（admin のみ実行可能）" };
    const { contactId } = data as { contactId: string };
    if (!isStr(contactId)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin
      .from("contacts")
      .delete()
      .eq("id", contactId);
    return error ? { ok: false, error: "削除失敗" } : { ok: true };
  },

  // ──────────────────────────────
  // [v14] プロジェクトフィールド更新（target_mandays, contract_amount等）
  // ──────────────────────────────
  // [2026-10-15] 現場の住所の初回登録（退勤打刻の前）。交通費の計算の基準になるので、現場にいる時のスマホの位置を優先して使う。
  //   すでに位置がある現場は変えない（初回だけ）。位置が取れない時は住所から位置を出す。
  async register_site_location(data, session) {
    if (!session) return { ok: false, error: "ログインしてください" };
    const { projectId, address, lat, lng } = data as { projectId: string; address: string; lat?: number; lng?: number };
    const addr = isStr(address) ? (address as string).trim().slice(0, 200) : "";
    if (!isStr(projectId) || !addr) return { ok: false, error: "住所を入力してください" };
    const { data: cur, error: e1 } = await supabaseAdmin.from("projects").select("site_lat, site_lng, address").eq("id", projectId).maybeSingle();
    if (e1 || !cur) return { ok: false, error: "現場が見つかりません" };
    if (cur.site_lat != null && cur.site_lng != null) return { ok: true, already: true, address: cur.address, lat: cur.site_lat, lng: cur.site_lng };
    const hasGps = typeof lat === "number" && typeof lng === "number" && isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const geo = hasGps ? { lat: lat as number, lng: lng as number } : await geocodeAddress(addr);
    const patch: Record<string, unknown> = {
      address: addr,
      site_lat: geo?.lat ?? null,
      site_lng: geo?.lng ?? null,
      site_registered_by: session.staffId,
      site_registered_at: new Date().toISOString(),
      site_location_source: hasGps ? "gps" : (geo ? "address" : "none"),
    };
    const { error } = await supabaseAdmin.from("projects").update(patch).eq("id", projectId).is("site_lat", null);
    if (error) return { ok: false, error: "保存に失敗しました" };
    return { ok: true, address: addr, lat: patch.site_lat, lng: patch.site_lng, source: patch.site_location_source };
  },

  async update_project_fields(data, session) {
    const { projectId, fields } = data as { projectId: string; fields: Record<string, unknown> };
    if (!isStr(projectId) || !fields) return { ok: false, error: "無効なパラメータ" };
    // スタッフが変更できるフィールド（金額系はadminのみ）
    const staffAllowed: Record<string, string> = {
      lead: "lead", startDate: "start_date", endDate: "end_date",
      name: "name", client: "client", contractType: "contract_type", address: "address",
      customerContact: "customer_contact", internalOwner: "internal_owner",
      status: "status", workCategory: "work_category", workDetails: "work_details",
    };
    const adminAllowed: Record<string, string> = {
      ...staffAllowed,
      targetMandays: "target_mandays", contractAmount: "contract_amount", manualMandays: "manual_mandays",
      ninkuRate: "ninku_rate", // [2026-06-29] 案件ごとの人工単価（NULL=会社デフォルト）
      subcontractCost: "subcontract_cost", // [2026-06-16] 外注費（請負外注の金額・円）
      estimate: "estimate", targetNinku: "target_ninku",
      materialCost: "material_cost", otherCost: "other_cost",
      invoiceSettled: "invoice_settled",
    };
    const allowed: Record<string, string> = session.role === "admin" ? adminAllowed : staffAllowed;
    const patch: Record<string, unknown> = {};
    for (const [key, col] of Object.entries(allowed)) {
      if (key in fields) patch[col] = fields[key];
    }
    if (Object.keys(patch).length === 0) return { ok: false, error: "更新項目がありません" };
    // [2026-05-29] 住所が変更されたら座標を再取得（退勤打刻のズレ判定用）
    if ("address" in patch) {
      const addr = isStr(patch.address) ? patch.address as string : "";
      const geo = addr ? await geocodeAddress(addr) : null;
      patch.site_lat = geo?.lat ?? null;
      patch.site_lng = geo?.lng ?? null;
    }
    // [2026-04-20] ステータスが「完了」に変わった瞬間に completed_at を記録
    if (patch.status === "完了") {
      const { data: cur } = await supabaseAdmin
        .from("projects").select("status, completed_at, name").eq("id", projectId).single();
      if (cur && cur.status !== "完了" && !cur.completed_at) {
        patch.completed_at = new Date().toISOString();
        const { data: who } = await supabaseAdmin.from("staff").select("name").eq("id", session.staffId).single();
        await supabaseAdmin.from("announcements").insert({
          id: crypto.randomUUID(),
          author: who?.name || "システム",
          role: session.role,
          text: `🏁 現場「${cur.name}」が完了になりました`,
          created_at: new Date().toISOString(),
          read_by: [],
        });
      }
    }
    console.log("update_project_fields patch:", JSON.stringify(patch), "projectId:", projectId);
    const { error } = await supabaseAdmin.from("projects").update(patch).eq("id", projectId);
    if (error) {
      console.error("update_project_fields DB error:", error.message, error.code, error.details);
      return { ok: false, error: `更新失敗: ${error.message}` };
    }
    return { ok: true };
  },

  // ──────────────────────────────
  // [2026-04-20] 進捗報告（スタッフが担当案件の進捗を送る）
  // ──────────────────────────────
  async insert_progress_report(data, session) {
    const r = data.report as Record<string, unknown>;
    if (!r || !isStr(r.id) || !isStr(r.projectId) || !isNum(r.percent)) {
      return { ok: false, error: "無効なパラメータ" };
    }
    const pct = r.percent as number;
    if (pct < 0 || pct > 100) return { ok: false, error: "％は0-100の範囲" };
    // reporter_id は認証セッションから自動設定（なりすまし防止）
    const { data: staff } = await supabaseAdmin
      .from("staff").select("id, name").eq("id", session.staffId).single();
    const { error } = await supabaseAdmin.from("progress_reports").insert({
      id: r.id,
      project_id: r.projectId,
      customer_id: r.customerId || null,
      reporter_id: session.staffId,
      reporter_name: staff?.name || "",
      percent: Math.round(pct),
      comment: r.comment || "",
      reported_at: new Date().toISOString(),
    });
    if (error) return { ok: false, error: "登録失敗: " + error.message };
    // [2026-06-28] 進捗報告が来たら管理者へPush通知（失敗しても本体に影響させない）
    try {
      const { data: proj } = await supabaseAdmin
        .from("projects").select("name").eq("id", r.projectId).single();
      const { data: admins } = await supabaseAdmin
        .from("staff").select("id").eq("role", "admin");
      const adminIds = (admins || []).map((a: { id: string }) => a.id);
      if (adminIds.length > 0) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const reporter = staff?.name || "スタッフ";
        const projName = proj?.name || "現場";
        fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
          body: JSON.stringify({
            title: "📊 進捗報告",
            body: `${reporter}さんが${projName}の進捗を報告しました（${Math.round(pct)}%）`,
            url: "/admin",
            staffIds: adminIds,
          }),
        }).catch(() => {});
      }
    } catch (_) { /* Push失敗は無視 */ }
    return { ok: true };
  },

  // [2026-06-28] 進捗報告を「確認済み」にする（管理者のみ）。notification_reads を再利用
  async mark_progress_report_read(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { reportId, userId } = data as { reportId: string; userId: string };
    if (!isStr(reportId) || !isStr(userId)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("notification_reads").upsert({
      id: `${userId}_progress_report_${reportId}`,
      staff_id: userId,
      notification_type: "progress_report",
      notification_id: reportId,
      read_at: new Date().toISOString(),
    }, { onConflict: "staff_id,notification_type,notification_id" });
    return error ? { ok: false, error: "更新失敗" } : { ok: true };
  },

  // ──────────────────────────────
  // [v14] 追加工事更新（×ボタン廃止、編集のみ）
  // ──────────────────────────────
  async update_additional_work(data) {
    const { workId, fields } = data as { workId: string; fields: Record<string, unknown> };
    if (!isStr(workId) || !fields) return { ok: false, error: "無効なパラメータ" };
    const patch: Record<string, unknown> = {};
    if ("description" in fields) patch.description = fields.description;
    if ("floor" in fields) patch.floor = fields.floor;
    if ("location" in fields) patch.location = fields.location;
    if (Object.keys(patch).length === 0) return { ok: false, error: "更新項目がありません" };
    const { error } = await supabaseAdmin.from("additional_works").update(patch).eq("id", workId);
    return error ? { ok: false, error: "更新失敗: " + error.message } : { ok: true };
  },

  // ──────────────────────────────
  // [v14] 休暇残日数管理（adminのみ）
  // ──────────────────────────────
  async upsert_leave_balance(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { staffId, type, granted, used } = data as { staffId: string; type: string; granted: number; used: number };
    if (!isStr(staffId) || !isStr(type)) return { ok: false, error: "無効なパラメータ" };
    // [2026-04-22] 振休は leaves テーブルから動的計算するため、leave_balances.furikae への直接書き込みは禁止。
    // UI は leave_balances.furikae を参照しないため、ここを書き換えてもUIに反映されない（二重管理を防ぐ）。
    if (type === "furikae") {
      return {
        ok: false,
        error: "振休(furikae)は leave_balances への直接書き込み禁止。insert_leave で type='holiday', holidayPref='振休希望' を使って leaves テーブルに登録してください。",
      };
    }
    const { error } = await supabaseAdmin.from("leave_balances").upsert({
      staff_id: staffId, type, granted: granted || 0, used: used || 0, updated_at: new Date().toISOString(),
    }, { onConflict: "staff_id,type" });
    return error ? { ok: false, error: "更新失敗" } : { ok: true };
  },

  // ──────────────────────────────
  // 有給年度更新（adminのみ）
  // 毎年4/1: 残日数を繰越に移行、新規7日付与、used=0リセット
  // 2年消滅: 繰越は1年分のみ（前年度残のみ持ち越し）
  // ──────────────────────────────
  async renew_annual_leave(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { annualGrant } = data as { annualGrant?: number };
    const grant = annualGrant || 7;
    // 全スタッフのpaid有給を取得
    const { data: balances, error: fetchErr } = await supabaseAdmin
      .from("leave_balances").select("*").eq("type", "paid");
    if (fetchErr) return { ok: false, error: "取得失敗" };
    let updated = 0;
    for (const lb of (balances || [])) {
      const currentBalance = Number(lb.granted) + Number(lb.carried) - Number(lb.used);
      const newCarried = Math.max(0, currentBalance); // 前年度残を繰越（2年消滅: 1年分のみ）
      const { error } = await supabaseAdmin.from("leave_balances").update({
        carried: newCarried, granted: grant, used: 0,
        last_renewed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", lb.id);
      if (!error) updated++;
    }
    return { ok: true, updated, message: `${updated}名の有給を更新しました（付与${grant}日）` };
  },

  // ──────────────────────────────
  // [v14] 案件経費（adminのみ）
  // ──────────────────────────────
  async upsert_project_expense(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { projectId, dailyTransport, dailyParking } = data as { projectId: string; dailyTransport: number; dailyParking: number };
    if (!isStr(projectId)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("project_expenses").upsert({
      project_id: projectId, daily_transport: dailyTransport || 0, daily_parking: dailyParking || 0,
    }, { onConflict: "project_id" });
    return error ? { ok: false, error: "更新失敗" } : { ok: true };
  },

  // ──────────────────────────────
  // 経費項目の追加・削除
  // ──────────────────────────────
  async insert_expense_item(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { item } = data as { item: Record<string, unknown> };
    if (!item || !isStr(item.id) || !isStr(item.project_id)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("expense_items").insert({
      id: item.id, project_id: item.project_id, date: item.date,
      category: item.category, description: item.description || "",
      amount: item.amount || 0, staff_name: item.staff_name || "",
    });
    if (error) return { ok: false, error: "登録失敗" };
    // [2026-06-29] 外注費なら subcontract_cost を再計算
    if (item.category === "subcontract") await recalcSubcontractCost(item.project_id as string);
    return { ok: true };
  },

  async delete_expense_item(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { expenseId } = data as { expenseId: string };
    if (!isStr(expenseId)) return { ok: false, error: "無効なパラメータ" };
    // [2026-06-29] 削除前に project_id/category を取得し、外注費なら削除後に再計算
    const { data: target } = await supabaseAdmin
      .from("expense_items").select("project_id, category").eq("id", expenseId).single();
    const { error } = await supabaseAdmin.from("expense_items").delete().eq("id", expenseId);
    if (error) return { ok: false, error: "削除失敗" };
    if (target && target.category === "subcontract") await recalcSubcontractCost(target.project_id as string);
    return { ok: true };
  },

  // ──────────────────────────────
  // [v14] 会社情報・車両情報（adminのみ）
  // ──────────────────────────────
  async upsert_company_info(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const info = data.info as Record<string, unknown>;
    if (!info || !isStr(info.category) || !isStr(info.title)) return { ok: false, error: "無効なパラメータ" };
    if (isStr(info.id)) {
      const { error } = await supabaseAdmin.from("company_info").update({
        category: info.category, title: info.title, content: info.content || "",
        sort_order: info.sortOrder || 0, updated_at: new Date().toISOString(),
      }).eq("id", info.id);
      if (error) console.error("update company_info:", error);
      return error ? { ok: false, error: "更新失敗: " + (error.message || "") } : { ok: true };
    }
    const { error } = await supabaseAdmin.from("company_info").insert({
      category: info.category, title: info.title, content: info.content || "",
      sort_order: info.sortOrder || 0,
    });
    if (error) console.error("insert company_info:", error);
    return error ? { ok: false, error: "登録失敗: " + (error.message || "") } : { ok: true };
  },

  async delete_company_info(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { infoId } = data as { infoId: string };
    if (!isStr(infoId)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("company_info").delete().eq("id", infoId);
    return error ? { ok: false, error: "削除失敗" } : { ok: true };
  },

  // ──────────────────────────────
  // [v14] アンケート
  // ──────────────────────────────
  async upsert_survey(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const s = data.survey as Record<string, unknown>;
    if (!s || !isStr(s.title)) return { ok: false, error: "無効なパラメータ" };
    // [2026-04-27] DB実カラム名は `active`（is_activeではない）。created_byカラムも存在しない
    // id カラムは TEXT NOT NULL DEFAULT なし → INSERT時に必ず指定する
    // [2026-07-21] deadline（回答期限・任意）。YYYY-MM-DD のみ受理、それ以外は null
    const deadline = (isStr(s.deadline) && /^\d{4}-\d{2}-\d{2}$/.test(s.deadline)) ? s.deadline : null;
    if (isStr(s.id)) {
      const { error } = await supabaseAdmin.from("surveys").update({
        title: s.title, questions: s.questions || [], active: s.isActive ?? true, deadline,
      }).eq("id", s.id);
      return error ? { ok: false, error: "更新失敗: " + error.message } : { ok: true };
    }
    const newId = crypto.randomUUID();
    const { error } = await supabaseAdmin.from("surveys").insert({
      id: newId, title: s.title, questions: s.questions || [], active: true, deadline,
    });
    return error ? { ok: false, error: "登録失敗: " + error.message } : { ok: true, result: { id: newId } };
  },

  async submit_survey_response(data, session) {
    const { surveyId, answers } = data as { surveyId: string; answers: Record<string, unknown> };
    if (!isStr(surveyId) || !answers) return { ok: false, error: "無効なパラメータ" };
    // [2026-09-04] 期限日以降は「書き直し」を禁止（未回答者の新規回答は締切後も受け付ける）。
    //   クライアント側でもボタンを隠すが、期限は改ざんできない場所で判定する必要があるためここでも見る。
    const { data: sv } = await supabaseAdmin.from("surveys").select("deadline, questions").eq("id", surveyId).single();
    // [2026-09-04] 設問ごとの最低文字数(minChars)をサーバー側でも検証する。
    //   ブラウザの検証だけだと、DevTools や直接APIを叩けば空回答を通せてしまうため。
    const qs = Array.isArray(sv?.questions) ? sv.questions as Record<string, unknown>[] : [];
    for (let i = 0; i < qs.length; i++) {
      const min = Number(qs[i]?.minChars) || 0;
      if (min <= 0) continue;
      const val = String((answers as Record<string, unknown>)[String(i)] ?? "").trim();
      if (val.length < min) {
        return { ok: false, error: `Q${i + 1} は${min}文字以上で入力してください（現在${val.length}文字）` };
      }
    }
    if (sv?.deadline && jstToday() >= sv.deadline) {
      const { data: exist } = await supabaseAdmin.from("survey_responses")
        .select("id").eq("survey_id", surveyId).eq("staff_id", session.staffId).maybeSingle();
      if (exist) return { ok: false, error: "回答期限を過ぎているため書き直しできません" };
    }
    const { data: staff } = await supabaseAdmin.from("staff").select("name").eq("id", session.staffId).single();
    // [2026-04-28] id カラムは TEXT NOT NULL DEFAULT なし。UNIQUE(survey_id,staff_id) は migration 022 で追加済み
    const { error } = await supabaseAdmin.from("survey_responses").upsert({
      id: crypto.randomUUID(),
      survey_id: surveyId, staff_id: session.staffId, staff_name: staff?.name || "",
      answers, created_at: new Date().toISOString(),
    }, { onConflict: "survey_id,staff_id" });
    return error ? { ok: false, error: "回答失敗: " + error.message } : { ok: true };
  },

  // [2026-09-04] 自分の回答を取り消す（期限日より前のみ）。
  //   「一発勝負だと思うと当たり障りのないことを書いて終わる」ため、締切前は取り消し・書き直しを許す。
  async delete_my_survey_response(data, session) {
    const { surveyId } = data as { surveyId: string };
    if (!isStr(surveyId)) return { ok: false, error: "無効なパラメータ" };
    const { data: sv } = await supabaseAdmin.from("surveys").select("deadline").eq("id", surveyId).single();
    if (sv?.deadline && jstToday() >= sv.deadline) {
      return { ok: false, error: "回答期限を過ぎているため取り消しできません" };
    }
    const { error } = await supabaseAdmin.from("survey_responses")
      .delete().eq("survey_id", surveyId).eq("staff_id", session.staffId);
    return error ? { ok: false, error: "取り消し失敗: " + error.message } : { ok: true };
  },

  // ──────────────────────────────
  // [2026-09-05] 社内研修①
  //   設問・解説はサーバーが持ち、締切もサーバーが判定する。
  //   クライアントの時計は信用しない（端末の日付を変えれば締切を回避できてしまうため）。
  // ──────────────────────────────

  // 研修本体＋全設問＋自分の回答をまとめて返す。解説は設問と一緒に返す（1往復で済ませる）。
  async get_training(_data, session) {
    const { data: tr } = await supabaseAdmin
      .from("trainings").select("*").eq("active", true)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!tr) return { ok: true, result: null };

    // [2026-09-20] 対象外のスタッフ（管理者等）には研修そのものを返さない。
    //   null を返せばクライアント側は研修タブもモーダルもロックも出さない。
    if (((tr.exempt_staff_ids || []) as string[]).includes(session.staffId)) {
      return { ok: true, result: null };
    }

    // [2026-09-20] 試写モード。preview_staff_ids が空でなければ、入っている人にだけ研修を見せる。
    //   その人は最低文字数の制限も受けない（内容を一通り流して確認するため）。
    const previewIds = (tr.preview_staff_ids || []) as string[];
    // [2026-09-20] free_staff_ids = 見るだけの人。公開はそのままで、その人だけ文字数制限なし。
    const freeIds = (tr.free_staff_ids || []) as string[];
    const isPreview = previewIds.includes(session.staffId) || freeIds.includes(session.staffId);
    if (previewIds.length > 0 && !previewIds.includes(session.staffId)) return { ok: true, result: null };

    const { data: qs, error: qErr } = await supabaseAdmin
      .from("training_questions").select("*")
      .eq("training_id", tr.id).eq("active", true)   // 無効化した設問は出さない
      .order("sort_order", { ascending: true });
    if (qErr) return { ok: false, error: "設問の取得に失敗: " + qErr.message };

    const { data: rs } = await supabaseAdmin
      .from("training_responses").select("question_id, answer, confirmed, updated_at")
      .eq("training_id", tr.id).eq("staff_id", session.staffId);

    const { data: comp } = await supabaseAdmin
      .from("training_completions").select("completed_at")
      .eq("training_id", tr.id).eq("staff_id", session.staffId).maybeSingle();

    return {
      ok: true,
      result: {
        training: tr,
        questions: qs || [],
        responses: rs || [],
        completedAt: comp?.completed_at || null,
        preview: isPreview,   // true の人は文字数制限なし（クライアントの「次へ」判定に使う）
        // 締切判定はサーバーの時刻で行い、結果だけをクライアントに渡す
        pastDeadline: !!tr.deadline && Date.now() > new Date(tr.deadline).getTime(),
        serverNow: new Date().toISOString(),
      },
    };
  },

  // 1問分の保存。confirmed=false は入力途中の自動保存（文字数を満たさなくても保存する）。
  // confirmed=true は「次へ」を押した確定で、この時だけ最低文字数を検証する。
  async submit_training_response(data, session) {
    const { questionId, answer, confirmed } = data as
      { questionId: string; answer: string; confirmed?: boolean };
    if (!isStr(questionId)) return { ok: false, error: "無効なパラメータ" };
    const text = typeof answer === "string" ? answer : "";

    const { data: q } = await supabaseAdmin
      .from("training_questions").select("id, training_id, min_chars, code").eq("id", questionId).single();
    if (!q) return { ok: false, error: "設問が見つかりません" };

    const { data: tr } = await supabaseAdmin
      .from("trainings").select("deadline, active, preview_staff_ids, free_staff_ids").eq("id", q.training_id).single();
    if (!tr?.active) return { ok: false, error: "この研修は公開されていません" };
    // [2026-09-20] 試写モードの人は最低文字数を検証しない。試写対象外の人からの書き込みは受け付けない。
    const previewIds = (tr.preview_staff_ids || []) as string[];
    const freeIds = (tr.free_staff_ids || []) as string[];   // 見るだけの人も文字数制限なし
    const isPreview = previewIds.includes(session.staffId) || freeIds.includes(session.staffId);
    if (previewIds.length > 0 && !previewIds.includes(session.staffId)) return { ok: false, error: "この研修は公開されていません" };

    // 締切後も「未回答者の新規回答」は受け付ける（回答しないとロックが解けないため）。
    // 禁止するのは確定済みの回答の書き直しだけ。
    const past = !!tr.deadline && Date.now() > new Date(tr.deadline).getTime();
    if (past) {
      const { data: exist } = await supabaseAdmin
        .from("training_responses").select("confirmed")
        .eq("question_id", questionId).eq("staff_id", session.staffId).maybeSingle();
      if (exist?.confirmed) return { ok: false, error: "締切を過ぎているため書き直しできません" };
    }

    // [2026-09-20] 下書き保存(confirmed=false)で、確定済みの回答を未確定に戻さない。
    //   自動保存は入力停止の800ms後に飛ぶため、「次へ」をすぐ押すと確定の後から届いて上書きし、
    //   全問答えても complete_training が通らなくなっていた。書き直しは確定(confirmed=true)でしか保存しない。
    if (confirmed !== true) {
      const { data: cur } = await supabaseAdmin
        .from("training_responses").select("confirmed")
        .eq("question_id", questionId).eq("staff_id", session.staffId).maybeSingle();
      if (cur?.confirmed) return { ok: true };
    }

    if (confirmed === true && !isPreview) {
      const min = Number(q.min_chars) || 0;
      if (text.trim().length < min) {
        return { ok: false, error: `${q.code} は${min}文字以上で入力してください（現在${text.trim().length}文字）` };
      }
    }

    const { data: staff } = await supabaseAdmin
      .from("staff").select("name").eq("id", session.staffId).single();

    const { error } = await supabaseAdmin.from("training_responses").upsert({
      id: crypto.randomUUID(),
      training_id: q.training_id, question_id: questionId,
      staff_id: session.staffId, staff_name: staff?.name || "",
      answer: text, confirmed: confirmed === true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "question_id,staff_id" });
    return error ? { ok: false, error: "保存に失敗: " + error.message } : { ok: true };
  },

  // 自分の回答一覧（再開時・見直し用）
  async get_training_responses(data, session) {
    const { trainingId } = data as { trainingId: string };
    if (!isStr(trainingId)) return { ok: false, error: "無効なパラメータ" };
    const { data: rs, error } = await supabaseAdmin
      .from("training_responses").select("*")
      .eq("training_id", trainingId).eq("staff_id", session.staffId);
    return error ? { ok: false, error: "取得に失敗: " + error.message } : { ok: true, result: rs || [] };
  },

  // 自分の回答を1問取り消す（締切前のみ）。取り消すと完了記録も外す。
  async delete_training_response(data, session) {
    const { questionId } = data as { questionId: string };
    if (!isStr(questionId)) return { ok: false, error: "無効なパラメータ" };
    const { data: q } = await supabaseAdmin
      .from("training_questions").select("training_id").eq("id", questionId).single();
    if (!q) return { ok: false, error: "設問が見つかりません" };
    const { data: tr } = await supabaseAdmin
      .from("trainings").select("deadline").eq("id", q.training_id).single();
    if (tr?.deadline && Date.now() > new Date(tr.deadline).getTime()) {
      return { ok: false, error: "締切を過ぎているため取り消しできません" };
    }
    const { error } = await supabaseAdmin.from("training_responses")
      .delete().eq("question_id", questionId).eq("staff_id", session.staffId);
    if (error) return { ok: false, error: "取り消しに失敗: " + error.message };
    await supabaseAdmin.from("training_completions")
      .delete().eq("training_id", q.training_id).eq("staff_id", session.staffId);
    return { ok: true };
  },

  // 全問確定していれば完了として記録する。件数はサーバーで数える。
  async complete_training(data, session) {
    const { trainingId } = data as { trainingId: string };
    if (!isStr(trainingId)) return { ok: false, error: "無効なパラメータ" };
    // [2026-09-20] 母数は有効な設問だけ。無効化した設問を数えると、
    //   全部答えても total に届かず永久に完了できなくなる。
    const { count: total } = await supabaseAdmin
      .from("training_questions").select("id", { count: "exact", head: true })
      .eq("training_id", trainingId).eq("active", true);
    const { count: done } = await supabaseAdmin
      .from("training_responses").select("id", { count: "exact", head: true })
      .eq("training_id", trainingId).eq("staff_id", session.staffId).eq("confirmed", true);
    if (!total || (done || 0) < total) {
      return { ok: false, error: `未回答の問題があります（${done || 0}/${total || 0}問）` };
    }
    const { data: staff } = await supabaseAdmin
      .from("staff").select("name").eq("id", session.staffId).single();
    const { error } = await supabaseAdmin.from("training_completions").upsert({
      id: crypto.randomUUID(), training_id: trainingId,
      staff_id: session.staffId, staff_name: staff?.name || "",
      completed_at: new Date().toISOString(),
    }, { onConflict: "training_id,staff_id" });
    return error ? { ok: false, error: "完了の記録に失敗: " + error.message } : { ok: true };
  },

  // 管理者用。全員の回答・完了状況をまとめて返す。
  async get_training_admin(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    let { trainingId } = data as { trainingId: string };
    // [2026-09-20] trainingId 省略時は公開中の最新の研修を引く。
    //   管理画面は以前 get_training で id を調べていたが、get_training は対象外の人（管理者など）に
    //   null を返すため、管理者が開くと回答一覧が空になっていた。
    if (!isStr(trainingId)) {
      const { data: latest } = await supabaseAdmin
        .from("trainings").select("id").eq("active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!latest) return { ok: true, result: { questions: [], responses: [], completions: [], targets: [] } };
      trainingId = latest.id as string;
    }
    const { data: qs } = await supabaseAdmin
      .from("training_questions").select("*")
      .eq("training_id", trainingId).eq("active", true)   // 無効化した設問は一覧に出さない
      .order("sort_order", { ascending: true });
    const { data: rs } = await supabaseAdmin
      .from("training_responses").select("*").eq("training_id", trainingId);
    const { data: comps } = await supabaseAdmin
      .from("training_completions").select("*").eq("training_id", trainingId);
    // [2026-09-06] 未完了者の母数。役員を含めるかは研修ごとの include_executives で決まる。
    const { data: tr } = await supabaseAdmin
      .from("trainings").select("include_executives, exempt_staff_ids, preview_staff_ids, free_staff_ids").eq("id", trainingId).single();
    const withExec = !!tr?.include_executives;
    const exempt = (tr?.exempt_staff_ids || []) as string[];   // [2026-09-20] 対象外（管理者等）
    const previewIds = (tr?.preview_staff_ids || []) as string[];   // [2026-09-20] 試写中は試写対象者だけが母数
    const { data: staff } = await supabaseAdmin
      .from("staff_public").select("id, name, is_executive");
    return {
      ok: true,
      result: {
        questions: qs || [], responses: rs || [], completions: comps || [],
        targets: (staff || []).filter((s: Record<string, unknown>) =>
          (withExec || !s.is_executive) && !exempt.includes(s.id as string) &&
          !((tr?.free_staff_ids || []) as string[]).includes(s.id as string) &&   // 見るだけの人は母数に入れない
          (previewIds.length === 0 || previewIds.includes(s.id as string))),
      },
    };
  },

  // [2026-04-28] アンケート削除（関連回答も同時削除）
  async delete_survey(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { surveyId } = data as { surveyId: string };
    if (!isStr(surveyId)) return { ok: false, error: "無効なパラメータ" };
    // 先に回答を削除（ON DELETE CASCADE が無い場合の保険）
    const { error: respErr } = await supabaseAdmin.from("survey_responses").delete().eq("survey_id", surveyId);
    if (respErr) return { ok: false, error: "回答削除失敗: " + respErr.message };
    const { error } = await supabaseAdmin.from("surveys").delete().eq("id", surveyId);
    return error ? { ok: false, error: "アンケート削除失敗: " + error.message } : { ok: true };
  },

  // ──────────────────────────────
  // [v14] AIチャットログ
  // ──────────────────────────────
  // [2026-04-21] スタッフ個人メモ（本人のみ閲覧/編集）
  async get_personal_memo(_data, session) {
    const { data: row } = await supabaseAdmin
      .from("staff").select("personal_memo").eq("id", session.staffId).single();
    return { ok: true, result: { memo: row?.personal_memo || "" } };
  },
  async update_personal_memo(data, session) {
    const { memo } = data as { memo: string };
    if (typeof memo !== "string") return { ok: false, error: "memo は文字列である必要があります" };
    if (memo.length > 10000) return { ok: false, error: "メモが長すぎます（最大10000文字）" };
    const { error } = await supabaseAdmin
      .from("staff").update({ personal_memo: memo }).eq("id", session.staffId);
    return error ? { ok: false, error: "更新失敗" } : { ok: true };
  },

  async insert_ai_chat_log(data, session) {
    const { query, response } = data as { query: string; response: string };
    if (!isStr(query)) return { ok: false, error: "無効なパラメータ" };
    const { data: staff } = await supabaseAdmin.from("staff").select("name").eq("id", session.staffId).single();
    const { error } = await supabaseAdmin.from("ai_chat_logs").insert({
      staff_id: session.staffId, staff_name: staff?.name || "", query, response: response || "",
    });
    return error ? { ok: false, error: "登録失敗" } : { ok: true };
  },

  // ──────────────────────────────
  // 写真アップロード（field-photos バケット）
  // ──────────────────────────────
  async upload_field_photo(data) {
    const { base64, fileName, contentType } = data as {
      base64: string; fileName: string; contentType: string;
    };
    if (!base64 || !fileName) return { ok: false, error: "無効なパラメータ" };
    const isPdf = contentType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
    const MAX_BYTES = isPdf ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    const limitLabel = isPdf ? "20MB" : "5MB";
    if (base64.length > MAX_BYTES * 1.37) return { ok: false, error: `ファイルサイズが大きすぎます（上限${limitLabel}）` };
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    if (bytes.length > MAX_BYTES) return { ok: false, error: `ファイルサイズが大きすぎます（上限${limitLabel}）` };
    const ext = isPdf ? ".pdf" : (contentType === "image/png" ? ".png" : ".jpg");
    const path = `uploads/${Date.now()}_${crypto.randomUUID()}${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("field-photos")
      .upload(path, bytes, { contentType: contentType || "image/jpeg", upsert: false });
    if (error) return { ok: false, error: "アップロード失敗: " + error.message };
    const { data: urlData } = supabaseAdmin.storage
      .from("field-photos")
      .getPublicUrl(path);
    return { ok: true, url: urlData.publicUrl };
  },

  // 署名付きアップロードURL発行（大きいPDF等をEdge Function経由せず直接Storage送信用）
  async create_upload_url(data) {
    const { fileName, contentType, size } = data as { fileName: string; contentType: string; size?: number };
    if (!isStr(fileName)) return { ok: false, error: "無効なパラメータ" };
    if (typeof size === "number" && size > 20 * 1024 * 1024) return { ok: false, error: "ファイルサイズが大きすぎます（上限20MB）" };
    const isPdf = contentType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
    const ext = isPdf ? ".pdf" : (contentType === "image/png" ? ".png" : ".jpg");
    const path = `uploads/${Date.now()}_${crypto.randomUUID()}${ext}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("field-photos")
      .createSignedUploadUrl(path);
    if (error) return { ok: false, error: "署名URL作成失敗: " + error.message };
    const { data: urlData } = supabaseAdmin.storage.from("field-photos").getPublicUrl(path);
    return { ok: true, signedUrl: signed.signedUrl, token: signed.token, path, publicUrl: urlData.publicUrl };
  },

  // ──────────────────────────────
  // [v14] 仕様書管理
  // ──────────────────────────────
  async upsert_project_spec(data) {
    const { spec } = data as { spec: Record<string, unknown> };
    if (!spec || !isStr(spec.projectId as string)) return { ok: false, error: "無効なパラメータ" };
    const isUpdate = !!spec.id;
    const row: Record<string, unknown> = {
      project_id: spec.projectId,
      spec_text: spec.specText || "",
      updated_at: new Date().toISOString(),
    };
    if (!isUpdate) {
      row.file_name = spec.fileName || "";
      row.file_url = spec.fileUrl || "";
      row.uploaded_by = spec.uploadedBy || "";
    } else {
      row.id = spec.id;
      if (spec.fileName !== undefined) row.file_name = spec.fileName;
      if (spec.fileUrl !== undefined) row.file_url = spec.fileUrl;
      if (spec.uploadedBy !== undefined) row.uploaded_by = spec.uploadedBy;
    }
    const { error } = isUpdate
      ? await supabaseAdmin.from("project_specs").update(row).eq("id", row.id)
      : await supabaseAdmin.from("project_specs").insert(row);
    return error ? { ok: false, error: "保存失敗" } : { ok: true };
  },

  async delete_project_spec(data, session) {
    // [2026-09-25] 監査 A-6/H-3 残り：uploaded_by は名前の自己申告で信用できず、画面からの呼び出しも無い。admin のみに限定
    if (session?.role !== "admin") return { ok: false, error: "権限がありません（admin のみ実行可能）" };
    const { specId } = data as { specId: string };
    if (!isStr(specId)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("project_specs").delete().eq("id", specId);
    return error ? { ok: false, error: "削除失敗" } : { ok: true };
  },

  // ──────────────────────────────
  // [v15] Instagram投稿
  // ──────────────────────────────
  async create_instagram_post(data, session) {
    const { templateType, caption, isAutoGenerated, images } = data as {
      templateType: string; caption: string; isAutoGenerated: boolean; images: string[];
    };
    if (!isStr(templateType) || !isStr(caption)) return { ok: false, error: "無効なパラメータ" };
    if (!images || !Array.isArray(images) || images.length === 0 || images.length > 4) {
      return { ok: false, error: "写真は1〜4枚必要です" };
    }
    // インセンティブ金額を設定から取得
    const { data: settings } = await supabaseAdmin.from("instagram_settings").select("*").limit(1).single();
    const amount = isAutoGenerated ? (settings?.incentive_auto || 200) : (settings?.incentive_manual || 500);
    // 月額上限チェック
    const monthStart = new Date().toISOString().slice(0, 7) + "-01";
    const { data: monthPosts } = await supabaseAdmin.from("instagram_posts")
      .select("incentive_amount").eq("staff_id", session.staffId)
      .in("status", ["pending", "approved", "posted"])
      .gte("created_at", monthStart);
    const monthTotal = (monthPosts || []).reduce((s: number, p: { incentive_amount: number }) => s + (p.incentive_amount || 0), 0);
    const cap = settings?.monthly_cap_per_staff || 2000;
    if (monthTotal + amount > cap) return { ok: false, error: `月額上限(¥${cap})を超えます。今月の合計: ¥${monthTotal}` };
    // 投稿作成
    const { data: post, error } = await supabaseAdmin.from("instagram_posts").insert({
      staff_id: session.staffId,
      template_type: templateType,
      caption,
      is_auto_generated: isAutoGenerated,
      incentive_amount: amount,
    }).select("id").single();
    if (error || !post) return { ok: false, error: "投稿作成失敗" };
    // 画像保存
    for (let i = 0; i < images.length; i++) {
      if (images[i].length > 10_000_000) continue;
      await supabaseAdmin.from("instagram_post_images").insert({
        post_id: post.id, image_data: images[i], sort_order: i,
      });
    }
    return { ok: true, result: { postId: post.id } };
  },

  async list_my_instagram_posts(data, session) {
    const { data: posts, error } = await supabaseAdmin.from("instagram_posts")
      .select("*").eq("staff_id", session.staffId).order("created_at", { ascending: false }).limit(50);
    if (error) return { ok: false, error: "取得失敗" };
    return { ok: true, result: posts || [] };
  },

  async list_pending_instagram_posts(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { data: posts, error } = await supabaseAdmin.from("instagram_posts")
      .select("*, instagram_post_images(*)").eq("status", "pending").order("created_at", { ascending: false });
    if (error) return { ok: false, error: "取得失敗" };
    // staffの名前を取得
    const staffIds = [...new Set((posts || []).map((p: { staff_id: string }) => p.staff_id))];
    const { data: staffList } = await supabaseAdmin.from("staff").select("id, name").in("id", staffIds);
    const nameMap = Object.fromEntries((staffList || []).map((s: { id: string; name: string }) => [s.id, s.name]));
    const result = (posts || []).map((p: Record<string, unknown>) => ({
      ...p, staff_name: nameMap[p.staff_id as string] || "不明",
    }));
    return { ok: true, result };
  },

  async approve_instagram_post(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { postId, caption } = data as { postId: string; caption?: string };
    if (!isStr(postId)) return { ok: false, error: "無効なパラメータ" };
    const update: Record<string, unknown> = {
      status: "approved", approved_by: session.staffId, approved_at: new Date().toISOString(),
    };
    if (caption) update.caption = caption;
    const { error } = await supabaseAdmin.from("instagram_posts").update(update).eq("id", postId);
    return error ? { ok: false, error: "承認失敗" } : { ok: true };
  },

  async reject_instagram_post(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { postId, reason } = data as { postId: string; reason: string };
    if (!isStr(postId)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("instagram_posts").update({
      status: "rejected", reject_reason: reason || "",
    }).eq("id", postId);
    return error ? { ok: false, error: "却下失敗" } : { ok: true };
  },

  async mark_instagram_posted(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { postId } = data as { postId: string };
    if (!isStr(postId)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("instagram_posts").update({
      status: "posted", posted_at: new Date().toISOString(),
    }).eq("id", postId);
    return error ? { ok: false, error: "更新失敗" } : { ok: true };
  },

  async get_instagram_incentives(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const month = (data.month as string) || new Date().toISOString().slice(0, 7);
    const monthStart = month + "-01T00:00:00";
    const monthEnd = month + "-31T23:59:59";
    const { data: posts } = await supabaseAdmin.from("instagram_posts")
      .select("staff_id, is_auto_generated, incentive_amount, status")
      .in("status", ["approved", "posted"])
      .gte("created_at", monthStart).lte("created_at", monthEnd);
    const staffMap: Record<string, { manual: number; auto: number; total: number }> = {};
    (posts || []).forEach((p: { staff_id: string; is_auto_generated: boolean; incentive_amount: number }) => {
      if (!staffMap[p.staff_id]) staffMap[p.staff_id] = { manual: 0, auto: 0, total: 0 };
      if (p.is_auto_generated) staffMap[p.staff_id].auto++;
      else staffMap[p.staff_id].manual++;
      staffMap[p.staff_id].total += p.incentive_amount;
    });
    return { ok: true, result: staffMap };
  },

  async update_instagram_settings(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { incentiveManual, incentiveAuto, monthlyCap } = data as {
      incentiveManual?: number; incentiveAuto?: number; monthlyCap?: number;
    };
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (isNum(incentiveManual)) update.incentive_manual = incentiveManual;
    if (isNum(incentiveAuto)) update.incentive_auto = incentiveAuto;
    if (isNum(monthlyCap)) update.monthly_cap_per_staff = monthlyCap;
    const { data: existing } = await supabaseAdmin.from("instagram_settings").select("id").limit(1).single();
    if (existing) {
      const { error } = await supabaseAdmin.from("instagram_settings").update(update).eq("id", existing.id);
      return error ? { ok: false, error: "更新失敗" } : { ok: true };
    }
    const { error } = await supabaseAdmin.from("instagram_settings").insert({
      incentive_manual: incentiveManual || 500, incentive_auto: incentiveAuto || 200,
      monthly_cap_per_staff: monthlyCap || 2000,
    });
    return error ? { ok: false, error: "作成失敗" } : { ok: true };
  },

  async get_my_instagram_monthly(data, session) {
    const month = (data.month as string) || new Date().toISOString().slice(0, 7);
    const monthStart = month + "-01T00:00:00";
    const monthEnd = month + "-31T23:59:59";
    const { data: posts } = await supabaseAdmin.from("instagram_posts")
      .select("is_auto_generated, incentive_amount, status")
      .eq("staff_id", session.staffId)
      .in("status", ["approved", "posted"])
      .gte("created_at", monthStart).lte("created_at", monthEnd);
    let manual = 0, auto = 0, total = 0;
    (posts || []).forEach((p: { is_auto_generated: boolean; incentive_amount: number }) => {
      if (p.is_auto_generated) auto++; else manual++;
      total += p.incentive_amount;
    });
    return { ok: true, result: { manual, auto, total } };
  },

  // ──────────────────────────────
  // [2026-04-16] 夜タスク ①: 車両管理（管理者のみ書き込み）
  // ──────────────────────────────
  async upsert_vehicle(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const v = data.vehicle as Record<string, unknown>;
    if (!v || !isStr(v.id) || !isStr(v.name)) return { ok: false, error: "無効なパラメータ" };
    // [2026-04-20] 担当者ID・車検日・証券番号（旧model流用）を受け取る
    const row = {
      id: v.id,
      name: v.name,
      plate_number: v.plateNumber || "",
      model: v.model || "",
      memo: v.memo || "",
      assigned_staff_id: isStr(v.assignedStaffId) && v.assignedStaffId ? v.assignedStaffId : null,
      inspection_date: isStr(v.inspectionDate) && v.inspectionDate ? v.inspectionDate : null,
    };
    const { data: existing } = await supabaseAdmin.from("vehicles").select("id").eq("id", v.id).maybeSingle();
    const { error } = existing
      ? await supabaseAdmin.from("vehicles").update(row).eq("id", v.id)
      : await supabaseAdmin.from("vehicles").insert(row);
    return error ? { ok: false, error: "保存失敗" } : { ok: true };
  },

  async delete_vehicle(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { vehicleId } = data as { vehicleId: string };
    if (!isStr(vehicleId)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("vehicles").delete().eq("id", vehicleId);
    return error ? { ok: false, error: "削除失敗" } : { ok: true };
  },

  async insert_vehicle_trouble(data, session) {
    // staffからの不具合報告も許可（adminも可）
    if (!session?.staffId) return { ok: false, error: "認証が必要です" };
    const t = data.trouble as Record<string, unknown>;
    if (!t || !isStr(t.id) || !isStr(t.vehicleId) || !isStr(t.date)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("vehicle_troubles").insert({
      id: t.id, vehicle_id: t.vehicleId, date: t.date, description: t.description || "",
    });
    return error ? { ok: false, error: "登録失敗" } : { ok: true };
  },

  async delete_vehicle_trouble(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { troubleId } = data as { troubleId: string };
    if (!isStr(troubleId)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("vehicle_troubles").delete().eq("id", troubleId);
    return error ? { ok: false, error: "削除失敗" } : { ok: true };
  },

  async insert_vehicle_oil_change(data, session) {
    // [2026-05-21] staffからのオイル交換記録も許可（不具合報告と同方針）。削除は管理者のみ維持。
    if (!session?.staffId) return { ok: false, error: "認証が必要です" };
    const o = data.oilChange as Record<string, unknown>;
    if (!o || !isStr(o.id) || !isStr(o.vehicleId) || !isStr(o.date)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("vehicle_oil_changes").insert({
      id: o.id, vehicle_id: o.vehicleId, date: o.date,
      mileage: isNum(o.mileage) ? (o.mileage as number) : 0, note: o.note || "",
      element_changed: o.elementChanged === true, // [2026-06-12] エレメント交換フラグ
    });
    return error ? { ok: false, error: "登録失敗: " + error.message } : { ok: true };
  },

  async delete_vehicle_oil_change(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { oilChangeId } = data as { oilChangeId: string };
    if (!isStr(oilChangeId)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("vehicle_oil_changes").delete().eq("id", oilChangeId);
    return error ? { ok: false, error: "削除失敗" } : { ok: true };
  },

  // ──────────────────────────────
  // [2026-06-12] ご意見箱（匿名投稿）
  //   - insert: スタッフ誰でも可。staff_id はサーバ側で session から強制（payload信用しない）
  //   - list/update: admin限定。staff_id は返さない＝匿名担保
  // ──────────────────────────────
  async insert_suggestion(data, session) {
    if (!session?.staffId) return { ok: false, error: "認証が必要です" };
    const content = isStr((data as Record<string, unknown>).content)
      ? ((data as Record<string, unknown>).content as string).trim() : "";
    if (!content) return { ok: false, error: "内容が空です" };
    if (content.length > 4000) return { ok: false, error: "内容が長すぎます" };
    const { error } = await supabaseAdmin.from("suggestions").insert({
      id: crypto.randomUUID(),
      content,
      staff_id: session.staffId, // 集計目的のみDB保持。管理画面には出さない
      status: "未対応",
    });
    return error ? { ok: false, error: "送信失敗: " + error.message } : { ok: true };
  },

  async list_suggestions(data, session) {
    if (!session || session.role !== "admin") return { ok: false, error: "権限がありません" };
    // staff_id は意図的にSELECTしない（匿名担保）
    const { data: rows, error } = await supabaseAdmin
      .from("suggestions").select("id, content, status, created_at")
      .order("created_at", { ascending: false });
    if (error) return { ok: false, error: "取得失敗: " + error.message };
    return { ok: true, rows: rows || [] };
  },

  async update_suggestion_status(data, session) {
    if (!session || session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { id, status } = data as { id: string; status: string };
    if (!isStr(id) || (status !== "未対応" && status !== "対応済み")) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("suggestions").update({ status }).eq("id", id);
    return error ? { ok: false, error: "更新失敗: " + error.message } : { ok: true };
  },

  // ──────────────────────────────
  // [2026-04-16] 夜タスク ⑤: app_settings（key-value）
  // ──────────────────────────────
  // [2026-10-02] お金タブの入力データ（設定・借入・通帳残高・客先の入金タイミング）を key='main' の1行に丸ごと保存。管理者のみ
  async save_finance(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const value = (data as { value?: unknown }).value;
    if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "無効なパラメータ" };
    if (JSON.stringify(value).length > 200000) return { ok: false, error: "データが大きすぎます" };
    // [2026-10-15] key='genka' は原価表タブ（単価・率・日ごとの交通費などの手入力）。それ以外は従来どおり 'main'
    const key = (data as { key?: unknown }).key === "genka" ? "genka" : "main";
    const { error } = await supabaseAdmin.from("finance_data").upsert({
      key, value, updated_at: new Date().toISOString(), updated_by: String(session.name ?? ""),
    }, { onConflict: "key" });
    return error ? { ok: false, error: "保存失敗: " + error.message } : { ok: true };
  },

  async update_app_setting(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { key, value } = data as { key: string; value: string };
    if (!isStr(key)) return { ok: false, error: "無効なパラメータ" };
    // [2026-09-29] Googleログインの設定はアプリからは変えさせない（PINを知る人が自分のメールを足せないように）
    if (LOCKED_SETTING_KEYS.has(key)) return { ok: false, error: "この設定はアプリからは変更できません" };
    const { error } = await supabaseAdmin.from("app_settings").upsert({
      key, value: String(value ?? ""), updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
    return error ? { ok: false, error: "保存失敗" } : { ok: true };
  },

  async list_instagram_posts_all(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const status = (data.status as string) || "approved";
    const { data: posts, error } = await supabaseAdmin.from("instagram_posts")
      .select("*, instagram_post_images(*)").eq("status", status).order("created_at", { ascending: false }).limit(50);
    if (error) return { ok: false, error: "取得失敗" };
    const staffIds = [...new Set((posts || []).map((p: { staff_id: string }) => p.staff_id))];
    const { data: staffList } = await supabaseAdmin.from("staff").select("id, name").in("id", staffIds);
    const nameMap = Object.fromEntries((staffList || []).map((s: { id: string; name: string }) => [s.id, s.name]));
    const result = (posts || []).map((p: Record<string, unknown>) => ({
      ...p, staff_name: nameMap[p.staff_id as string] || "不明",
    }));
    return { ok: true, result };
  },

  // ──────────────────────────────
  // [2026-04-20] 材料費PDF取り込み（関東ロックウール請求書）
  // ──────────────────────────────
  async confirm_invoice(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const inv = data.invoice as Record<string, unknown>;
    const mappings = (data.mappings || {}) as Record<string, string | null>;
    const projectsData = (data.projects || []) as Array<Record<string, unknown>>;
    if (!inv) return { ok: false, error: "無効なパラメータ" };

    const invoiceId = (crypto as { randomUUID: () => string }).randomUUID();
    const { error: e1 } = await supabaseAdmin.from("invoice_uploads").insert({
      id: invoiceId,
      vendor: (inv.vendor as string) || "関東ロックウール",
      invoice_date: inv.invoiceDate || null,
      period_start: inv.periodStart || null,
      period_end: inv.periodEnd || null,
      subtotal: Number(inv.subtotal) || 0,
      tax: Number(inv.tax) || 0,
      total_with_tax: Number(inv.totalWithTax) || 0,
      pdf_name: (inv.pdfName as string) || "",
      uploaded_by: session.staffId,
      status: "confirmed",
      parsed_raw: inv.parsedRaw || null,
    });
    if (e1) { console.error("insert invoice_uploads:", e1); return { ok: false, error: "請求書保存失敗: " + (e1.message || "") }; }

    const rows: Record<string, unknown>[] = [];
    for (const p of projectsData) {
      const rawName = (p.projectNameOnInvoice as string) || "";
      const projectId = mappings[rawName] || null;
      const isStock = !!p.isStock;
      const its = (p.items || []) as Array<Record<string, unknown>>;
      for (const it of its) {
        rows.push({
          id: (crypto as { randomUUID: () => string }).randomUUID(),
          invoice_id: invoiceId,
          project_id: projectId,
          project_name_on_invoice: rawName,
          item_date: it.itemDate || null,
          invoice_no: (it.invoiceNo as string) || null,
          item_name: (it.itemName as string) || "",
          spec: (it.spec as string) || "",
          quantity: Number(it.quantity) || 0,
          unit: (it.unit as string) || "",
          unit_price: Number(it.unitPrice) || 0,
          amount: Math.round(Number(it.amount) || 0),
          is_discount: !!it.isDiscount,
          is_stock: isStock,
        });
      }
    }
    if (rows.length > 0) {
      const { error: e2 } = await supabaseAdmin.from("material_costs").insert(rows);
      if (e2) {
        console.error("insert material_costs:", e2);
        await supabaseAdmin.from("invoice_uploads").delete().eq("id", invoiceId);
        return { ok: false, error: "明細保存失敗: " + (e2.message || "") };
      }
    }
    return { ok: true, invoiceId, itemCount: rows.length };
  },

  async delete_invoice(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { invoiceId } = data as { invoiceId: string };
    if (!isStr(invoiceId)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("invoice_uploads").delete().eq("id", invoiceId);
    if (error) console.error("delete_invoice:", error);
    return error ? { ok: false, error: "削除失敗: " + (error.message || "") } : { ok: true };
  },

  // [2026-06-08] 材料費明細の現場紐付け直し（請求書の表記ずれで未紐付けになった明細を後から現場に割当）
  async relink_material_costs(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { costIds, projectId } = data as { costIds: string[]; projectId: string };
    if (!Array.isArray(costIds) || costIds.length === 0 || costIds.length > 200 || !costIds.every(isStr)) {
      return { ok: false, error: "無効なパラメータ" };
    }
    if (!isStr(projectId)) return { ok: false, error: "無効なパラメータ" };
    // 実在する現場かチェック（タイプミスIDで原価が迷子になるのを防ぐ）
    const { data: proj } = await supabaseAdmin.from("projects").select("id").eq("id", projectId).single();
    if (!proj) return { ok: false, error: "指定された現場が見つかりません" };
    const { error, count } = await supabaseAdmin
      .from("material_costs")
      .update({ project_id: projectId })
      .in("id", costIds)
      .select("id", { count: "exact" });
    if (error) return { ok: false, error: "紐付け失敗: " + (error.message || "") };
    return { ok: true, updated: count ?? 0 };
  },

  // ──────────────────────────────
  // [2026-04-27] 管理者メモ
  // ──────────────────────────────
  async list_admin_notes(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { data: rows, error } = await supabaseAdmin.from("admin_notes")
      .select("id,content,image_url,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return { ok: false, error: "取得失敗" };
    return { ok: true, notes: rows || [] };
  },

  async insert_admin_note(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { id, content, imageUrl } = data as { id: string; content: string; imageUrl?: string };
    if (!isStr(id) || typeof content !== "string") return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("admin_notes").insert({
      id, content, image_url: imageUrl || null,
    });
    return error ? { ok: false, error: "保存失敗" } : { ok: true };
  },

  async update_admin_note(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { id, content, imageUrl } = data as { id: string; content: string; imageUrl?: string | null };
    if (!isStr(id) || typeof content !== "string") return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("admin_notes").update({
      content, image_url: imageUrl ?? null, updated_at: new Date().toISOString(),
    }).eq("id", id);
    return error ? { ok: false, error: "更新失敗" } : { ok: true };
  },

  async delete_admin_note(data, session) {
    if (session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { id } = data as { id: string };
    if (!isStr(id)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("admin_notes").delete().eq("id", id);
    return error ? { ok: false, error: "削除失敗" } : { ok: true };
  },

  // [2026-05-21] base64画像/PDF を Storage に移行するワンタイムアクション（admin限定）
  // 1呼び出しで attachments と contacts それぞれ 10件ずつ処理。idempotent なので残件0まで繰り返し呼べる。
  async migrate_base64_to_storage(_data, session) {
    if (!session || session.role !== "admin") return { ok: false, error: "権限がありません" };
    const result = {
      attachments: { processed: 0, migrated: 0, failed: 0, errors: [] as string[] },
      contacts:    { processed: 0, migrated: 0, failed: 0, errors: [] as string[] },
    };
    const migrate1 = async (raw: string): Promise<string | null> => {
      const m = raw.match(/^data:([^;]+);base64,(.*)$/);
      if (!m) return null;
      const contentType = m[1];
      const b64 = m[2];
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const ext = contentType === "application/pdf" ? ".pdf" : (contentType === "image/png" ? ".png" : ".jpg");
      const path = `uploads/migrated_${Date.now()}_${crypto.randomUUID()}${ext}`;
      const { error: upErr } = await supabaseAdmin.storage.from("field-photos").upload(path, bytes, { contentType });
      if (upErr) return null;
      const { data: urlData } = supabaseAdmin.storage.from("field-photos").getPublicUrl(path);
      return urlData.publicUrl;
    };
    // attachments
    const { data: atts } = await supabaseAdmin.from("attachments").select("id,data").like("data", "data:%").limit(10);
    for (const a of (atts || []) as Array<Record<string, unknown>>) {
      result.attachments.processed++;
      try {
        const url = await migrate1(a.data as string);
        if (!url) { result.attachments.failed++; continue; }
        const { error: updErr } = await supabaseAdmin.from("attachments").update({ file_url: url, data: "" }).eq("id", a.id);
        if (updErr) { result.attachments.failed++; result.attachments.errors.push(String(updErr.message)); continue; }
        result.attachments.migrated++;
      } catch (e) { result.attachments.failed++; result.attachments.errors.push(String((e as Error).message || e)); }
    }
    // contacts
    const { data: cts } = await supabaseAdmin.from("contacts").select("id,photo_url").like("photo_url", "data:%").limit(10);
    for (const c of (cts || []) as Array<Record<string, unknown>>) {
      result.contacts.processed++;
      try {
        const url = await migrate1(c.photo_url as string);
        if (!url) { result.contacts.failed++; continue; }
        const { error: updErr } = await supabaseAdmin.from("contacts").update({ photo_url: url }).eq("id", c.id);
        if (updErr) { result.contacts.failed++; result.contacts.errors.push(String(updErr.message)); continue; }
        result.contacts.migrated++;
      } catch (e) { result.contacts.failed++; result.contacts.errors.push(String((e as Error).message || e)); }
    }
    // 残件数
    const { count: attRemain } = await supabaseAdmin.from("attachments").select("*", { count: "exact", head: true }).like("data", "data:%");
    const { count: ctRemain } = await supabaseAdmin.from("contacts").select("*", { count: "exact", head: true }).like("photo_url", "data:%");
    return { ok: true, result, remaining: { attachments: attRemain || 0, contacts: ctRemain || 0 } };
  },

  // ── [2026-05-21] 施工人工目安マスタ（社外秘・admin限定） ──
  async list_workload_norms(data, session) {
    if (!session || session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { data: rows, error } = await supabaseAdmin
      .from("workload_norms").select("*")
      .order("category", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) return { ok: false, error: "取得失敗: " + error.message };
    return { ok: true, rows: rows || [] };
  },

  async insert_workload_norm(data, session) {
    if (!session || session.role !== "admin") return { ok: false, error: "権限がありません" };
    const n = data.norm as Record<string, unknown>;
    if (!n || !isStr(n.id) || !isStr(n.category)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("workload_norms").insert({
      id: n.id,
      category: n.category,
      size_spec: typeof n.sizeSpec === "string" ? n.sizeSpec : "",
      unit: typeof n.unit === "string" && n.unit ? n.unit : "台",
      per_man_day: isNum(n.perManDay) ? (n.perManDay as number) : null,
      materials: typeof n.materials === "string" ? n.materials : "",
      notes: typeof n.notes === "string" ? n.notes : "",
      source_project_id: isStr(n.sourceProjectId) ? n.sourceProjectId : null,
      created_by: session.staffId,
    });
    return error ? { ok: false, error: "登録失敗: " + error.message } : { ok: true };
  },

  async update_workload_norm(data, session) {
    if (!session || session.role !== "admin") return { ok: false, error: "権限がありません" };
    const n = data.norm as Record<string, unknown>;
    if (!n || !isStr(n.id)) return { ok: false, error: "無効なパラメータ" };
    const updates: Record<string, unknown> = {};
    if (isStr(n.category)) updates.category = n.category;
    if (typeof n.sizeSpec === "string") updates.size_spec = n.sizeSpec;
    if (typeof n.unit === "string" && n.unit) updates.unit = n.unit;
    if (isNum(n.perManDay)) updates.per_man_day = n.perManDay;
    else if (n.perManDay === null) updates.per_man_day = null;
    if (typeof n.materials === "string") updates.materials = n.materials;
    if (typeof n.notes === "string") updates.notes = n.notes;
    if (isStr(n.sourceProjectId)) updates.source_project_id = n.sourceProjectId;
    else if (n.sourceProjectId === null) updates.source_project_id = null;
    if (Object.keys(updates).length === 0) return { ok: false, error: "更新項目なし" };
    const { error } = await supabaseAdmin.from("workload_norms").update(updates).eq("id", n.id);
    return error ? { ok: false, error: "更新失敗: " + error.message } : { ok: true };
  },

  async delete_workload_norm(data, session) {
    if (!session || session.role !== "admin") return { ok: false, error: "権限がありません" };
    const { id } = data as { id: string };
    if (!isStr(id)) return { ok: false, error: "無効なパラメータ" };
    const { error } = await supabaseAdmin.from("workload_norms").delete().eq("id", id);
    return error ? { ok: false, error: "削除失敗: " + error.message } : { ok: true };
  },

  // ── [2026-10-09] 人工の目安表（川畑さんがスマホで入力。migration 096） ──
  //   管理者と川畑さんだけ。読むのは最初から用意した行（is_preset）だけ、書けるのは3つの数字だけ。
  async list_workload_input(data, session) {
    if (!canEditWorkloadInput(session)) return { ok: false, error: "権限がありません" };
    const { data: rows, error } = await supabaseAdmin
      .from("workload_norms")
      .select("id, grp, category, size_spec, unit, per_man_day, pct_small, pct_large, notes, sort_order, updated_by, updated_at")
      .eq("is_preset", true)
      .order("sort_order", { ascending: true });
    if (error) return { ok: false, error: "取得失敗: " + error.message };
    return { ok: true, rows: rows || [] };
  },

  async save_workload_input(data, session) {
    if (!canEditWorkloadInput(session)) return { ok: false, error: "権限がありません" };
    const items = (data as { items?: unknown }).items;
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) return { ok: false, error: "無効なパラメータ" };
    // [2026-10-09 v241] まん中のサイズの数量（normal：0〜10000）と、小さい側・大きい側の％（small/large：−100〜500）。
    //   空は null。おかしい値が1件でもあれば何も保存しない
    const okNum = (v: unknown) => v === null || (isNum(v) && v >= 0 && v <= 10000);
    const okPct = (v: unknown) => v === undefined || v === null || (isNum(v) && v >= -100 && v <= 500);
    for (const it of items as Record<string, unknown>[]) {
      if (!it || !isStr(it.id) || !okNum(it.normal)) {
        return { ok: false, error: "数量が正しくない行があります（0〜10000の数字で入力してください）" };
      }
      if (!okPct(it.small) || !okPct(it.large)) {
        return { ok: false, error: "％が正しくない行があります（−100〜500で入力してください）" };
      }
      // [2026-10-09] 補足欄（wn-preset-memo の行だけ）は文章も保存する。2000文字まで
      if (it.memo !== undefined && (it.id !== WORKLOAD_MEMO_ID || typeof it.memo !== "string" || it.memo.length > 2000)) {
        return { ok: false, error: "補足は2000文字までで入力してください" };
      }
    }
    const now = new Date().toISOString();
    let saved = 0;
    for (const it of items as Record<string, unknown>[]) {
      const upd0: Record<string, unknown> = {
        per_man_day: it.normal,
        updated_by: session!.name || session!.staffId, updated_at: now,
      };
      if (it.small !== undefined) upd0.pct_small = it.small;   // 古い画面（％欄なし）からの保存では触らない
      if (it.large !== undefined) upd0.pct_large = it.large;
      if (it.id === WORKLOAD_MEMO_ID && typeof it.memo === "string") upd0.notes = it.memo;
      const { data: upd, error } = await supabaseAdmin.from("workload_norms")
        .update(upd0)
        .eq("id", it.id as string).eq("is_preset", true)
        .select("id");
      if (error) return { ok: false, error: `保存失敗（${saved}件まで保存済み）: ` + error.message, saved };
      saved += (upd || []).length;
    }
    return { ok: true, saved };
  },
};

// [2026-10-09] 人工目安タブの補足欄（migration 097）。この行だけ notes を書き換えられる
const WORKLOAD_MEMO_ID = "wn-preset-memo";
// [2026-10-09] 人工の目安表を入力できる人：管理者と川畑さん（staff.name は苗字だけ）
function canEditWorkloadInput(session: SessionInfo | null): boolean {
  if (!session) return false;
  if (session.role === "admin") return true;
  return (session.name || "").replace(/[\s　]/g, "").startsWith("川畑");
}

// ── メインハンドラー ──
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
      JSON.stringify({ ok: false, error: "リクエスト回数が上限を超えました。1分後に再試行してください。" }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { token, action, data } = body;

    if (!isStr(token)) {
      return new Response(
        JSON.stringify({ ok: false, error: "セッショントークンが必要です" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // [2026-09-25] 監査 A-3：退出ボタンでサーバ側のセッションも削除する。
    //   送られてきたトークン自身の行だけを消す（他人のセッションには触れない）。
    //   期限切れトークンでも消せるよう verifySession より前で処理し、結果は常に ok を返す
    //   （トークンの有効/無効を外から判別できないようにするため）。
    if (action === "logout") {
      const { error: delErr } = await supabaseAdmin.from("sessions").delete().eq("token", token);
      if (delErr) console.error("logout: sessions delete failed:", delErr.message);
      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const session = await verifySession(token);
    if (!session) {
      return new Response(
        JSON.stringify({ ok: false, error: "セッションが無効または期限切れです。再ログインしてください。" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isStr(action) || !(action in actions)) {
      return new Response(
        JSON.stringify({ ok: false, error: `無効なアクション: ${action}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await actions[action](data || {}, session);
    const status = result.ok ? 200 : (result.error?.includes("権限") ? 403 : 400);

    return new Response(
      JSON.stringify(result),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("api-gateway error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ ok: false, error: "サーバーエラー", detail: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
