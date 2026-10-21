// migrate-old-drawings Edge Function
// [2026-07-09] 図面(project_drawings)のうち、その現場で最後の打刻から60日以上経過したものを
//   DB内 base64 → 非公開バケット project-drawings へ移し、file_data を空にして DB を軽量化する。
//   pg_cron から週1回呼ばれる想定（migration 059）。
//   判定: その現場に clock_logs があり、最新の clock_in が60日以上前 → 移行対象。
//         打刻が1件も無い現場はスキップ（「打刻がなくなって60日」の対象外・誤移行防止）。
//   一度の実行で最大 30 件処理（タイムアウト・メモリ対策）。残りは翌回に持ち越す。
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const cutoff = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();

    // 未移行（storage_path なし）の図面を少量ずつ取得。
    //   base64本体(file_data)は重いのでここでは取らず、対象確定後に1件ずつ取得する（メモリ対策）。
    const { data: drawings, error: drErr } = await supabase
      .from("project_drawings")
      .select("id, project_id, file_type")
      .is("storage_path", null)
      .limit(20);
    if (drErr) {
      return json({ ok: false, error: "図面取得失敗: " + drErr.message }, 500);
    }
    if (!drawings || drawings.length === 0) {
      return json({ ok: true, migrated: 0, skipped: 0, note: "移行対象なし" });
    }

    // 現場ごとの「最終打刻」をキャッシュ（同一現場の複数図面で再問い合わせしない）
    const lastClockCache = new Map<string, string | null>();
    const getLastClock = async (projectId: string): Promise<string | null> => {
      if (lastClockCache.has(projectId)) return lastClockCache.get(projectId)!;
      const { data: log } = await supabase
        .from("clock_logs")
        .select("clock_in")
        .eq("project_id", projectId)
        .order("clock_in", { ascending: false })
        .limit(1)
        .maybeSingle();
      const v = log?.clock_in ?? null;
      lastClockCache.set(projectId, v);
      return v;
    };

    let migrated = 0, skipped = 0;
    const errors: string[] = [];

    for (const d of drawings) {
      const lastClock = await getLastClock(d.project_id);
      // 打刻が1件も無い現場、または最終打刻が60日以内 → まだ移行しない
      if (!lastClock || lastClock > cutoff) { skipped++; continue; }

      // 対象確定後に base64 本体を1件だけ取得（メモリ節約）
      const { data: full } = await supabase
        .from("project_drawings")
        .select("file_data")
        .eq("id", d.id)
        .single();
      const fileData = full?.file_data as string | null;
      if (!fileData) { skipped++; continue; } // 中身が無い（移行済み等）

      // data URL を分解: data:<mime>;base64,<data>
      const m = /^data:([^;]+);base64,(.*)$/s.exec(fileData);
      if (!m) { skipped++; continue; } // 想定外の形式はスキップ
      const mime = m[1];
      const b64 = m[2];
      let bytes: Uint8Array;
      try {
        bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      } catch {
        skipped++; continue;
      }
      const ext = d.file_type === "pdf" ? ".pdf"
        : mime === "image/png" ? ".png"
        : mime === "image/webp" ? ".webp"
        : ".jpg";
      const path = `${d.project_id}/${d.id}${ext}`;

      const { error: upErr } = await supabase.storage
        .from("project-drawings")
        .upload(path, bytes, { contentType: mime, upsert: true });
      if (upErr) { errors.push(`${d.id}: ${upErr.message}`); continue; }

      // DB を更新: storage_path を記録し base64 本体を空に
      const { error: updErr } = await supabase
        .from("project_drawings")
        .update({ storage_path: path, file_data: "" })
        .eq("id", d.id);
      if (updErr) {
        // DB更新に失敗したらStorage側を消してロールバック（二重持ち防止）
        await supabase.storage.from("project-drawings").remove([path]);
        errors.push(`${d.id}: DB更新失敗 ${updErr.message}`);
        continue;
      }
      migrated++;
    }

    return json({ ok: true, migrated, skipped, scanned: drawings.length, errors });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
