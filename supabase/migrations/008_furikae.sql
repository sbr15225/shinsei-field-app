-- 008_furikae.sql
-- 振替休日機能改善 2026-04-15
-- leavesテーブルに2カラム追加:
--   holiday_work_id: 振替休日申請時、元になった休日出勤のleaves.id
--   holiday_type   : 休日出勤申請時、休日種別（sunday/saturday/obon/newyear）

ALTER TABLE leaves
  ADD COLUMN IF NOT EXISTS holiday_work_id TEXT REFERENCES leaves(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS holiday_type TEXT;

COMMENT ON COLUMN leaves.holiday_work_id IS '振替休日申請時: 元になった休日出勤の leaves.id';
COMMENT ON COLUMN leaves.holiday_type IS '休日出勤申請時: sunday / saturday / obon / newyear';
