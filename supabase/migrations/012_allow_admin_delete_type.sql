-- 012: clock_modifications.type CHECK に 'admin_delete' を追加
-- [2026-04-16] B9 削除UI追加時に CHECK 制約違反で500エラーが出ていた問題の修正
ALTER TABLE clock_modifications DROP CONSTRAINT IF EXISTS clock_modifications_type_check;
ALTER TABLE clock_modifications
  ADD CONSTRAINT clock_modifications_type_check
  CHECK (type IN ('edit', 'new', 'admin_edit', 'admin_new', 'admin_delete'));
