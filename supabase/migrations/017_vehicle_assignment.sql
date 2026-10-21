-- ═══════════════════════════════════════════════════════════
-- 017_vehicle_assignment.sql
-- 車両担当者・車検日 追加
--  * assigned_staff_id : TEXT（未設定=NULLで勝間(admin)に集約）
--  * inspection_date   : DATE（車検日）
--  * model カラムは UI 上で「証券番号」として利用（DBは触らず流用）
--  * memo カラムは UI から非表示。カラム自体は残す（互換維持）
-- ═══════════════════════════════════════════════════════════

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS assigned_staff_id TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS inspection_date   DATE;

NOTIFY pgrst, 'reload schema';
