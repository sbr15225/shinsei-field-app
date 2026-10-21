-- 050 additional_estimates の RLS 設定（2026-06-16）
-- 049 で作成したテーブルに RLS を付け忘れていたため追加。
-- 既存テーブル(additional_works 等)と同じ方針:
--   RLS 有効化 + anon は SELECT のみ許可。
--   INSERT/UPDATE/DELETE のポリシーは作らない＝anon は書き込み不可。
--   書き込みは api-gateway(service_role) が RLS をバイパスして実行する。
ALTER TABLE public.additional_estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "additional_estimates_anon_read" ON public.additional_estimates;
CREATE POLICY "additional_estimates_anon_read"
  ON public.additional_estimates FOR SELECT TO anon USING (true);
