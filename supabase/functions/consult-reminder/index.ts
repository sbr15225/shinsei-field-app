// consult-reminder Edge Function
// [2026-10-14] 毎日 8:00 JST に pg_cron から呼ばれる。今日が「打診日」の客先（進行中の現場か、完了して未請求の現場がある）を、
// 役員・管理者のスマホへプッシュ通知する。その月に「打診した」を押した客先は送らない。
// 送るだけで状態は変えない。--no-verify-jwt でデプロイ（cron から認証なしで呼ぶ。送り先・文面は固定）
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// 会社名の表記ゆれ（㈱・株式会社・(有) など）を外して比べる
const norm = (s: unknown) => String(s || "").replace(/株式会社|有限会社|㈱|㈲|\(株\)|\(有\)|（株）|（有）|[\s　]/g, "");
const lastDayOf = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

Deno.serve(async (_req) => {
  try {
    const nowJST = new Date(Date.now() + 9 * 3600000);
    const y = nowJST.getUTCFullYear();
    const m = nowJST.getUTCMonth() + 1;
    const d = nowJST.getUTCDate();
    const monthKey = `${y}-${String(m).padStart(2, "0")}`;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: customers, error: cErr } = await supabase
      .from("customers").select("id, name, consult_day, consult_done_month, project_id");
    if (cErr) throw new Error("customers: " + cErr.message);
    const { data: projects, error: pErr } = await supabase
      .from("projects").select("id, name, status, client, lead, invoice_settled");
    if (pErr) throw new Error("projects: " + pErr.message);

    const due: string[] = [];
    for (const c of customers || []) {
      const cd = Number(c.consult_day);
      if (!cd) continue;
      if (Math.min(cd, lastDayOf(y, m)) !== d) continue;          // 31＝月末
      if (c.consult_done_month === monthKey) continue;            // 今月はもう打診した
      const active = (projects || []).filter((p) => {
        const target = p.status === "進行中" || (p.status === "完了" && !p.invoice_settled);
        if (!target) return false;
        if (c.project_id && p.id === c.project_id) return true;
        const owner = norm(p.client || p.lead);
        return owner !== "" && owner === norm(c.name);
      });
      if (active.length === 0) continue;
      due.push(`${c.name}（${active.length}現場）`);
    }
    if (due.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_due", monthKey, d }), { headers: { "Content-Type": "application/json" } });
    }

    // 送り先：役員（is_executive）と管理者
    const { data: staffRows } = await supabase.from("staff").select("id, role, is_executive");
    const staffIds = (staffRows || []).filter((s) => s.is_executive === true || s.role === "admin").map((s) => s.id as string);
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({
        title: "📞 請求の打診日です",
        body: due.join("、").slice(0, 120),
        staffIds,
        url: "/admin",
      }),
    });
    const sent = await res.json().catch(() => ({}));
    return new Response(JSON.stringify({ ok: true, due, staffIds, sent }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message || e) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
