-- ═══════════════════════════════════════════════════════════
-- 018_fix_company_info_id_default.sql
-- company_info.id に DEFAULT gen_random_uuid() を設定
-- 016でカラム追加は済んだが、既存テーブルの id には DEFAULT が無く
-- INSERT 時に NOT NULL 違反になっていた。
-- ═══════════════════════════════════════════════════════════

ALTER TABLE company_info ALTER COLUMN id SET DEFAULT gen_random_uuid();

NOTIFY pgrst, 'reload schema';
