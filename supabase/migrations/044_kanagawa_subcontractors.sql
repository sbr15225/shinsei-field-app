-- 044_kanagawa_subcontractors.sql
-- [2026-06-16] 神奈川総合高等学校空調設備改修工事（project_id=2123bhw）の外注を後追い登録
--   6/1 一心断熱 / 6/6 荒井ラッキング
--   ※依頼文の「一心断念」は既存データ多数の「一心断熱」の誤記と判断し補正
--   ※人工数(headcount)の指定が無いため暫定で 1 を設定（後でアプリの外注追加導線で調整可）
INSERT INTO subcontractors (id, project_id, date, company_name, headcount, memo, workers)
VALUES
  ('sub_2123bhw_20260601_isshin', '2123bhw', '2026-06-01', '一心断熱',     1, '', ''),
  ('sub_2123bhw_20260606_arai',   '2123bhw', '2026-06-06', '荒井ラッキング', 1, '', '')
ON CONFLICT (id) DO NOTHING;
