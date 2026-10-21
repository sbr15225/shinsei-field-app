// auto-clockin-reminder Edge Function
// [2026-04-29] 毎日 8:30 JST に pg_cron から呼び出される。
// 当日まだ出勤打刻していないスタッフへ Push 通知を送る。
// 役員（is_executive=true）・admin は対象外、休日（土・日・お盆・年末年始）はスキップ。
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// [2026-07-09] send-push は service_role 認証必須化。内部呼び出しは SERVICE_ROLE_KEY を使用（旧 ANON_KEY ハードコードは廃止）

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

    // 対象スタッフ（admin / 役員除外）
    const { data: staffRows, error: staffErr } = await supabase
      .from("staff")
      .select("id, name, role, is_executive")
      .neq("role", "admin")
      .eq("is_executive", false);
    if (staffErr) {
      return new Response(JSON.stringify({ ok: false, error: "staff fetch failed: " + staffErr.message }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }
    const staffMap = new Map<string, string>((staffRows || []).map((s) => [s.id as string, s.name as string]));
    if (staffMap.size === 0) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "no_target_staff", todayJST }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // 過去 25h 以内の clock_logs を取得 → JST 当日 clock_in があるスタッフを抽出
    const cutoff = new Date(Date.now() - 25 * 3600000).toISOString();
    const { data: logs, error: logsErr } = await supabase
      .from("clock_logs")
      .select("user_id, clock_in, is_night_shift")
      .gte("clock_in", cutoff);
    if (logsErr) {
      return new Response(JSON.stringify({ ok: false, error: "logs fetch failed: " + logsErr.message }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }

    const clockedInToday = new Set<string>();
    for (const l of logs || []) {
      if (!l.clock_in || !l.user_id) continue;
      const jst = new Date(new Date(l.clock_in).getTime() + 9 * 3600000);
      const isToday = jst.toISOString().slice(0, 10) === todayJST;
      // [2026-07-14] 夜勤(直近25h以内)のスタッフは朝の出勤忘れ通知の対象外。
      //   前夜から勤務中・夜勤明けの人に「出勤打刻を忘れていませんか」が誤発火するのを防ぐ。
      if (isToday || l.is_night_shift === true) {
        clockedInToday.add(l.user_id as string);
      }
    }

    // 未出勤スタッフ = staffMap にいて clockedInToday にいない
    const targetIds: string[] = [];
    const targetNames: string[] = [];
    for (const [id, name] of staffMap) {
      if (!clockedInToday.has(id)) {
        targetIds.push(id);
        if (name) targetNames.push(name);
      }
    }

    if (targetIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "all_clocked_in", todayJST }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // send-push 呼び出し（service_role で認証。send-push は内部専用）
    const pushResp = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        title: "⏰ 出勤打刻を忘れていませんか？",
        body: `${targetNames.join("・")}さん、まだ出勤打刻されていないようです`,
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
