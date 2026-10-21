-- migration 059: 図面Storage移行バッチの定期実行（pg_cron）
-- [2026-07-09] 毎週日曜 04:00 JST（＝土曜 19:00 UTC）に migrate-old-drawings を呼ぶ。
--   打刻停止60日超の現場の図面を非公開バケットへ移し DB を軽量化する。
--   1回あたり最大30件処理のため、大量に溜まっていても数回に分けて自然に消化される。
-- pg_net 拡張は migration 024 で有効化済み。

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'migrate-old-drawings') THEN
    PERFORM cron.unschedule('migrate-old-drawings');
  END IF;
END $$;

SELECT cron.schedule(
  'migrate-old-drawings',
  '0 19 * * 6',
  $$
  SELECT net.http_post(
    url := 'https://rmahzqmwlavgxvfitymq.supabase.co/functions/v1/migrate-old-drawings',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
