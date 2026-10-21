-- ============================================================
-- shinsei_v11: セッショントークン導入 + anon write 全禁止
-- ============================================================
-- 前提: 001, 002, 003 適用済み
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. sessions テーブル作成
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
-- anon には一切アクセスさせない（Edge Function が service_role で操作）

-- 期限切れセッション削除用
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
  DELETE FROM sessions WHERE expires_at < now();
$$ LANGUAGE sql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 2. entries: anon の INSERT/UPDATE を禁止（SELECT のみ残す）
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "entries_anon_insert" ON entries;
DROP POLICY IF EXISTS "entries_anon_update" ON entries;

-- ────────────────────────────────────────────────────────────
-- 3. clock_logs: anon の INSERT/UPDATE を禁止
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clock_logs_anon_insert" ON clock_logs;
DROP POLICY IF EXISTS "clock_logs_anon_update" ON clock_logs;

-- ────────────────────────────────────────────────────────────
-- 4. leaves: anon の INSERT/UPDATE を禁止
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "leaves_anon_insert" ON leaves;
DROP POLICY IF EXISTS "leaves_anon_update" ON leaves;

-- ────────────────────────────────────────────────────────────
-- 5. handover_memos: anon の INSERT/UPDATE を禁止
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "handover_memos_anon_insert" ON handover_memos;
DROP POLICY IF EXISTS "handover_memos_anon_update" ON handover_memos;

-- ────────────────────────────────────────────────────────────
-- 6. announcements: anon の INSERT/UPDATE を禁止
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "announcements_anon_insert" ON announcements;
DROP POLICY IF EXISTS "announcements_anon_update" ON announcements;

-- ────────────────────────────────────────────────────────────
-- 7. customers: anon の INSERT/UPDATE を禁止
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "customers_anon_insert" ON customers;
DROP POLICY IF EXISTS "customers_anon_update" ON customers;

-- ────────────────────────────────────────────────────────────
-- 8. attachments: anon の INSERT/UPDATE/DELETE を全て禁止
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "attachments_anon_insert" ON attachments;
DROP POLICY IF EXISTS "attachments_anon_update" ON attachments;
DROP POLICY IF EXISTS "attachments_anon_delete" ON attachments;

-- ────────────────────────────────────────────────────────────
-- 9. projects: anon の INSERT/UPDATE を禁止
--    (001 で projects_anon_all があれば DROP、003 で既に DROP 済みの場合もある)
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "projects_anon_all" ON projects;
DROP POLICY IF EXISTS "projects_anon_insert" ON projects;
DROP POLICY IF EXISTS "projects_anon_update" ON projects;
-- SELECT ポリシーがなければ作成
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'projects' AND policyname = 'projects_anon_read'
  ) THEN
    EXECUTE 'CREATE POLICY "projects_anon_read" ON projects FOR SELECT TO anon USING (true)';
  END IF;
END $$;

-- ============================================================
-- 結果: anon は全テーブルで SELECT のみ可能
-- 全ての書き込みは api-gateway Edge Function (service_role) 経由
-- ============================================================
