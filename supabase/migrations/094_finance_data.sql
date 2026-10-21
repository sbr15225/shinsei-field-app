-- ═══════════════════════════════════════════════════════════
-- 094_finance_data.sql
-- [2026-10-02] 管理画面「お金」タブ（資金繰り・売上見込み・損益分岐・返済）の入力データ置き場
--   設定・借入・通帳残高・客先ごとの入金タイミングを JSON 1行（key='main'）で持つ。
--   読み取り：api-gateway rest_read（ADMIN_ONLY_READ に入れて管理者だけ）
--   書き込み：api-gateway save_finance（管理者だけ）
--   ※ app_settings はスタッフアプリも読むので、お金の数字はここに分けて置く
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.finance_data (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT ''
);

-- anon / authenticated からは直接触らせない（service_role の api-gateway 経由だけ）
ALTER TABLE public.finance_data ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_data FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- ── 適用後の確認（読み取り専用）────────────────────────────
-- SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='finance_data' ORDER BY ordinal_position;
-- SELECT key, updated_at, updated_by FROM finance_data;
