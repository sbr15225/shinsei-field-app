-- ═══════════════════════════════════════════════════════════
-- 095_clock_mod_outsource.sql
-- [2026-10-02] スタッフの打刻修正申請で「外注の有無（なし／応援／請負）と人数」も直せるようにする
--   outsource_changed=true の申請だけ、承認時に clock_logs の outsource_* を書き換える（false＝外注は触らない）
--   requested_outsource_type: null=外注なし / 'support' / 'subcontract'
--   金額はスタッフに入れさせない：応援は 35,000円×人数（SUPPORT_UNIT_PRICE）、請負は管理者が入力（種別が請負のまま人数だけ変わる場合は元の金額を残す）
--
-- 実DBで確認した状態（2026-10-02）：clock_modifications に outsource 系の列は無い。最新 migration は 094
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.clock_modifications
  ADD COLUMN IF NOT EXISTS outsource_changed        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_outsource_type  text,
  ADD COLUMN IF NOT EXISTS original_outsource_count integer,
  ADD COLUMN IF NOT EXISTS requested_outsource_type text,
  ADD COLUMN IF NOT EXISTS requested_outsource_count integer;

NOTIFY pgrst, 'reload schema';

-- ── 適用後の確認（読み取り専用）────────────────────────────
-- SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
--   WHERE table_name='clock_modifications' AND column_name LIKE '%outsource%';
