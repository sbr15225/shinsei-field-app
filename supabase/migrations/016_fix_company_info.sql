-- ═══════════════════════════════════════════════════════════
-- 016_fix_company_info.sql
-- company_info テーブルに欠落していたカラムを追加
-- 本番DBは CREATE TABLE IF NOT EXISTS で古い定義のまま残っていた
-- ═══════════════════════════════════════════════════════════

ALTER TABLE company_info ADD COLUMN IF NOT EXISTS category   TEXT DEFAULT 'company';
ALTER TABLE company_info ADD COLUMN IF NOT EXISTS title      TEXT DEFAULT '';
ALTER TABLE company_info ADD COLUMN IF NOT EXISTS content    TEXT DEFAULT '';
ALTER TABLE company_info ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- NOT NULL 制約（新規カラムには DEFAULT があるので既存行も埋まる）
ALTER TABLE company_info ALTER COLUMN category SET NOT NULL;
ALTER TABLE company_info ALTER COLUMN title    SET NOT NULL;

-- PostgREST スキーマキャッシュをリロード
NOTIFY pgrst, 'reload schema';
