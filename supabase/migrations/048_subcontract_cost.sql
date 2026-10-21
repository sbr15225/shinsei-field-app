-- 048 外注費（請負外注の金額）カラム追加（2026-06-16・勝間さん指示）
-- 用途: 案件に請負外注の金額(円)を入力 → 人工単価(70000円)で割って切り上げ(Math.ceil)
--       → 予定人工(目標人工 target_mandays)から差し引いた「残り人工」を表示する。
-- 応援(打刻時の外注入力・SUPPORT_UNIT_PRICE)とは別計算。これは案件単位の請負外注金額。
-- 金額は整数円なので INTEGER。NULL可・デフォルト0。
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS subcontract_cost INTEGER DEFAULT 0;
