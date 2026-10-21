-- ============================================================
-- shinsei_v10: RLS引き締め
-- ============================================================
-- 001_enable_rls.sql 適用済みの前提
-- anon の DELETE を全テーブルで禁止（削除は service_role / Edge Function 経由のみ）
-- projects の INSERT/UPDATE は引き続き anon 許可（フロントから直接書き込むため）
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. projects: DELETE を anon から禁止
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "projects_anon_delete" ON projects;
-- anon は SELECT, INSERT, UPDATE のみ（001で作成済み）

-- ────────────────────────────────────────────────────────────
-- 2. entries: DELETE を anon から禁止
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "entries_anon_all" ON entries;
CREATE POLICY "entries_anon_read" ON entries
  FOR SELECT TO anon USING (true);
CREATE POLICY "entries_anon_insert" ON entries
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "entries_anon_update" ON entries
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 3. clock_logs: DELETE を anon から禁止
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clock_logs_anon_all" ON clock_logs;
CREATE POLICY "clock_logs_anon_read" ON clock_logs
  FOR SELECT TO anon USING (true);
CREATE POLICY "clock_logs_anon_insert" ON clock_logs
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "clock_logs_anon_update" ON clock_logs
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 4. leaves: DELETE を anon から禁止
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "leaves_anon_all" ON leaves;
CREATE POLICY "leaves_anon_read" ON leaves
  FOR SELECT TO anon USING (true);
CREATE POLICY "leaves_anon_insert" ON leaves
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "leaves_anon_update" ON leaves
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 5. handover_memos: DELETE を anon から禁止
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "handover_memos_anon_all" ON handover_memos;
CREATE POLICY "handover_memos_anon_read" ON handover_memos
  FOR SELECT TO anon USING (true);
CREATE POLICY "handover_memos_anon_insert" ON handover_memos
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "handover_memos_anon_update" ON handover_memos
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 6. announcements: DELETE を anon から禁止
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "announcements_anon_all" ON announcements;
CREATE POLICY "announcements_anon_read" ON announcements
  FOR SELECT TO anon USING (true);
CREATE POLICY "announcements_anon_insert" ON announcements
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "announcements_anon_update" ON announcements
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 7. customers: DELETE を anon から禁止
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "customers_anon_all" ON customers;
CREATE POLICY "customers_anon_read" ON customers
  FOR SELECT TO anon USING (true);
CREATE POLICY "customers_anon_insert" ON customers
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "customers_anon_update" ON customers
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 8. attachments: anon は SELECT + INSERT のみ（DELETE は Edge Function 経由推奨）
--    ※ 現状フロントから deleteAttachmentDB() で直接DELETEしているため、
--      フロント側を Edge Function 経由に変更するまでは DELETE も許可する
--      → 変更後にこのコメントを外して DROP POLICY する
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "attachments_anon_all" ON attachments;
CREATE POLICY "attachments_anon_read" ON attachments
  FOR SELECT TO anon USING (true);
CREATE POLICY "attachments_anon_insert" ON attachments
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "attachments_anon_update" ON attachments
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- 当面は DELETE も許可（フロント側で直接削除しているため）
CREATE POLICY "attachments_anon_delete" ON attachments
  FOR DELETE TO anon USING (true);
