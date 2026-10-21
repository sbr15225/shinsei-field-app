-- [2026-04-29] 毎日 8:30 JST に出勤打刻忘れチェック Push 通知を送る pg_cron 設定
-- pg_net 拡張は migration 024 で有効化済み
-- 既存の同名スケジュールがあれば削除（再実行可能にするため）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'clockin-reminder') THEN
    PERFORM cron.unschedule('clockin-reminder');
  END IF;
END $$;

-- 毎日 23:30 UTC = 翌日 8:30 JST に Edge Function を呼ぶ
-- 休日判定・対象抽出・Push送信は Edge Function 側で行う
SELECT cron.schedule(
  'clockin-reminder',
  '30 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://rmahzqmwlavgxvfitymq.supabase.co/functions/v1/auto-clockin-reminder',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
