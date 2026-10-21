-- 054 案件ごとの人工単価カラム追加（2026-06-29・勝間さん指示）
-- 用途: 案件単位で人工単価(円/人工)を設定可能にする。
--   目標人工 = 目標予算 ÷ 人工単価。
--   NULL の場合は会社デフォルト(app_settings.default_ninku_rate=70000)を使用する。
-- 金額は整数円なので INTEGER。NULL可（NULL=会社デフォルト単価を使う）。
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ninku_rate INTEGER;
