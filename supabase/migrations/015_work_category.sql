-- =====================================================
-- 015_work_category.sql
-- 2026-04-20 案件区分（新築/改修）カラム追加
-- =====================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS work_category TEXT DEFAULT '';

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_work_category_check;
ALTER TABLE projects
  ADD CONSTRAINT projects_work_category_check
  CHECK (work_category IN ('', '新築', '改修'));
