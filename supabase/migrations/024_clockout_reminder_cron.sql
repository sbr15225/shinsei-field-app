-- [2026-04-28] 毎日 17:10 JST に退勤打刻忘れチェック Push 通知を送る pg_cron 設定
-- pg_net 拡張を有効化（HTTPリクエスト用）
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 既存の同名スケジュールがあれば削除（再実行可能にするため）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'clockout-reminder') THEN
    PERFORM cron.unschedule('clockout-reminder');
  END IF;
END $$;

-- 毎日 08:10 UTC = 17:10 JST に Edge Function を呼ぶ
-- 休日判定・対象抽出・Push送信は Edge Function 側で行う
SELECT cron.schedule(
  'clockout-reminder',
  '10 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://rmahzqmwlavgxvfitymq.supabase.co/functions/v1/auto-clockout-reminder',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
