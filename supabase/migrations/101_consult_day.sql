-- [2026-10-14] 請求の打診日（客先ごと・毎月○日。31＝月末）と、その月に打診を済ませたか（'YYYY-MM'）
ALTER TABLE customers ADD COLUMN IF NOT EXISTS consult_day integer;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS consult_done_month text;

-- 初期値（共有ドライブ「シンセイ工業・勝間」の客先フォルダ名の〆日から。打診日は勝間さん確認：
--   大成温調・万里設備は20日、五建工業は月末。それ以外は〆日の10日前＝末〆→20日、20日〆→10日、15日〆→5日）
UPDATE customers SET closing_day = 31, consult_day = 20 WHERE name = '大成温調㈱';
UPDATE customers SET consult_day = 20 WHERE name = '大成温調㈱　関東支店';
UPDATE customers SET closing_day = 31, consult_day = 20 WHERE name = '万里設備㈱';
UPDATE customers SET closing_day = 31, consult_day = 20 WHERE name = '島工業㈱';
UPDATE customers SET closing_day = 31, consult_day = 20 WHERE name = '大曽根工業㈱';
UPDATE customers SET closing_day = 20, consult_day = 10 WHERE name = '(有)堀田工業';
UPDATE customers SET closing_day = 31, consult_day = 20 WHERE name = '㈱エイト';
UPDATE customers SET closing_day = 31, consult_day = 20 WHERE name = 'シンエイ・ヨツバ㈱';
UPDATE customers SET closing_day = 31, consult_day = 20 WHERE name = '東京管工機材㈱';
UPDATE customers SET consult_day = 31 WHERE name = '五建工業㈱';          -- 月末に打診・請求書は翌10日に現場着（〆日の15は書類上の日付のまま）
UPDATE customers SET closing_day = 15, consult_day = 5 WHERE name = '柿本商会㈱';
UPDATE customers SET closing_day = 31, consult_day = 20 WHERE name = '(株)三弘';

-- 毎日 8:00 JST に打診日の通知（Edge Function consult-reminder）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'consult-reminder') THEN
    PERFORM cron.unschedule('consult-reminder');
  END IF;
END $$;
SELECT cron.schedule(
  'consult-reminder',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://rmahzqmwlavgxvfitymq.supabase.co/functions/v1/consult-reminder',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
