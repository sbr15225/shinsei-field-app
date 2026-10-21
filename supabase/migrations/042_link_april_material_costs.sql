-- 042_link_april_material_costs.sql
-- [2026-06-08] 4月分請求書（関東ロックウール / invoice_id=c4ca92e6-50e6-4393-9808-3aa4f503c27e）の
-- 材料費明細のうち、請求書表記と現場名の表記ずれで自動マッチできず
-- 未紐付け（project_id IS NULL）のまま残っていた4件を、勝間さん確定の現場へ紐付ける。
--   ・ダイワリバーゲート(¥393,668)            → Daiwaリバーゲート(2期) f7gwo77
--   ・東部方面斎場(¥335,826)                  → 東部斎場 7n8erm8
--   ・佐藤製薬八王子工場(¥10,129)             → 八王子佐藤製薬 e0hn3s0
--   ・神奈川総合高等学校(イアルマグフォーン)(¥144,000) → 神奈川総合高等学校空調設備改修工事 2123bhw
-- 「世田谷区立喜多見小学校(¥136,997)」は該当現場なし（終了現場）のため対象外で保留。
-- project_id IS NULL 条件付きのため、再実行しても二重更新は起きない（冪等）。

UPDATE material_costs SET project_id = 'f7gwo77'
 WHERE invoice_id = 'c4ca92e6-50e6-4393-9808-3aa4f503c27e'
   AND project_name_on_invoice = 'ダイワリバーゲート' AND project_id IS NULL;

UPDATE material_costs SET project_id = '7n8erm8'
 WHERE invoice_id = 'c4ca92e6-50e6-4393-9808-3aa4f503c27e'
   AND project_name_on_invoice = '東部方面斎場' AND project_id IS NULL;

UPDATE material_costs SET project_id = 'e0hn3s0'
 WHERE invoice_id = 'c4ca92e6-50e6-4393-9808-3aa4f503c27e'
   AND project_name_on_invoice = '佐藤製薬八王子工場' AND project_id IS NULL;

UPDATE material_costs SET project_id = '2123bhw'
 WHERE invoice_id = 'c4ca92e6-50e6-4393-9808-3aa4f503c27e'
   AND project_name_on_invoice = '神奈川総合高等学校（イアルマグフォーン）' AND project_id IS NULL;
