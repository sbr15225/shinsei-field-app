-- 031_subcontractor_workers.sql
-- 外注テーブルに作業員名カラムを追加

ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS workers TEXT DEFAULT '';

NOTIFY pgrst, 'reload schema';
