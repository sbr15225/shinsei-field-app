// auto-clockout-reminder Edge Function
// [2026-04-28] 毎日 17:10 JST に pg_cron から呼び出される。
// 当日出勤打刻ありかつ退勤打刻なしのスタッフへ Push 通知を送る。
// 役員（is_executive=true）は対象外、休日（土・日・お盆・年末年始）はスキップ。
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// [2026-07-09] send-push を service_role 必須に内部専用化した

Deno.serve(async (_req) => {
  try {
    // JST 現在時刻
    const nowJST = new Date(Date.now() + 9 * 3600000);
    const m   = nowJST.getUTCMonth() + 1;
    const d   = nowJST.getUTCDate();
    const dow = nowJST.getUTCDay();
    const todayJST = nowJST.toISOString().slice(0, 10);

    // 休日判定（土・日・お盆 8/13-16・年末年始 12/30-1/3）
    // [2026-09-24] 就業規則（休日）に合わせて年末年始を 12/29 → 12/30 開始に修正
    const isHoliday =
      dow === 0 || dow === 6 ||
      (m === 8 && d >= 13 && d <= 16) ||
      (m === 12 && d >= 30) || (m === 1 && d <= 3);
    if (isHoliday) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "holiday", todayJST, dow }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 当日出勤分の clock_logs（過去 25h 以内 + clock_out null）を取得 → JST 日付でフィルタ
    const cutoff = new Date(Date.now() - 25 * 3600000).toISOString();
    const { data: logs, error: logsErr } = await supabase
      .from("clock_logs")
      .select("user_id, user_name, clock_in, clock_out, is_night_shift")
      .is("clock_out", null)
      .gte("clock_in", cutoff);
    if (logsErr) {
      return new Response(JSON.stringify({ ok: false, error: "logs fetch failed: " + logsErr.message }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }

    const candidates = (logs || []).filter((l) => {
      if (!l.clock_in) return false;
      // [2026-07-13] 夜勤は日付をまたいで勤務するため、17:10 の退勤忘れ通知の対象外
      if (l.is_night_shift === true) return false;
      const jst = new Date(new Date(l.clock_in).getTime() + 9 * 3600000);
      return jst.toISOString().slice(0, 10) === todayJST;
    });

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "no_unfinished_logs", todayJST }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // 役員 ID を取得して除外
    const { data: execs } = await supabase
      .from("staff")
      .select("id")
      .eq("is_executive", true);
    const execIds = new Set((execs || []).map((s) => s.id));

    const targetIds = [...new Set(
      candidates.map((c) => c.user_id).filter((id): id is string => !!id && !execIds.has(id)),
    )];
    if (targetIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "all_targets_executive", todayJST }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const targetNames = [...new Set(
      candidates
        .filter((c) => targetIds.includes(c.user_id as string))
        .map((c) => c.user_name)
        .filter(Boolean),
    )] as string[];

    // send-push 呼び出し（service_role で認証。send-push は内部専用）
    const pushResp = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        title: "⏰ 退勤打刻を忘れていませんか？",
        body: `${targetNames.join("・")}さん、退勤打刻がまだ未完了のようです`,
        staffIds: targetIds,
        url: "/user",
      }),
    });
    const pushResult = await pushResp.json().catch(() => ({}));

    return new Response(
      JSON.stringify({
        ok: true, todayJST, targets: targetNames, targetIds, pushResult,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
