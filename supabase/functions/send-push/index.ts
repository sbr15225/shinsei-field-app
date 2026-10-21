// send-push Edge Function — Web Push通知送信
// VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY は Supabase Secrets に設定済み
import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails("mailto:sb.r15.225@gmail.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // [2026-07-09] 内部専用化: service_role キーの Bearer 認証を必須化。
  //   従来は認証チェックがなく、公開anonキーを持つ第三者が任意の title/body で
  //   全スタッフ端末へ偽Push通知を送れた（フィッシング経路）。
  //   正規の呼び出し元（api-gateway / auto-clockin-reminder / auto-clockout-reminder）は
  //   すべて service_role キーで呼ぶ。フロントからの直呼びは存在しない。
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const { title = "シンセイ工業", body = "", staffIds, url = "/user" } = await req.json();

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    let query = supabase.from("push_subscriptions").select("id, staff_id, endpoint, keys");
    if (staffIds?.length) query = query.in("staff_id", staffIds);

    const { data: subs, error } = await query;
    if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { headers: cors });

    const payload = JSON.stringify({ title, body, url });
    const results = await Promise.allSettled(
      (subs || []).map(async (sub) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
          return { ok: true, staffId: sub.staff_id };
        } catch (e: any) {
          // 期限切れ / 無効なサブスクリプションを削除
          if (e.statusCode === 410 || e.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
          return { ok: false, staffId: sub.staff_id, error: e.message };
        }
      })
    );

    const sent = results.filter(r => r.status === "fulfilled" && (r.value as any).ok).length;
    return new Response(JSON.stringify({ ok: true, sent, total: subs?.length ?? 0 }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: cors });
  }
});
