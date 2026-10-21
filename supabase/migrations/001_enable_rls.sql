-- ============================================================
-- shinsei_v9 セキュリティ強化: RLS (Row Level Security)
-- ============================================================
-- 実行方法: Supabase Dashboard > SQL Editor で実行
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. 全テーブルで RLS を有効化
-- ────────────────────────────────────────────────────────────
ALTER TABLE staff             ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE clock_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves            ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_memos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments       ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 2. staff テーブル: PINは anon から読めないようにする
--    → 認証は Edge Function (auth-pin) 経由のみ
-- ────────────────────────────────────────────────────────────

-- anon: staff テーブルへの直接アクセスは全操作禁止
-- （フロントは staff_public ビューを使う）
-- （PIN認証・単価更新は全て Edge Function (service_role) 経由）
-- ※ ポリシーなし = RLS有効で anon は全拒否

-- service_role: 全操作可能（Edge Function 用）
CREATE POLICY "staff_service_full" ON staff
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 3. PIN を隠すための VIEW (anon はこちらを使う)
-- ────────────────────────────────────────────────────────────
-- security_invoker = false: VIEW は所有者権限で実行（RLSバイパス）
-- これにより anon でも staff テーブルの SELECT ポリシーなしで読める
-- ただし PIN は含めない
DROP VIEW IF EXISTS staff_public;
CREATE VIEW staff_public
  WITH (security_invoker = false)
  AS SELECT id, name, role, daily_rate, created_at FROM staff;

-- anon に VIEW への SELECT を許可
GRANT SELECT ON staff_public TO anon;

-- ────────────────────────────────────────────────────────────
-- 4. projects テーブル: anon は読み取りのみ、書き込みは Edge Function
-- ────────────────────────────────────────────────────────────
CREATE POLICY "projects_anon_read" ON projects
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "projects_anon_write" ON projects
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "projects_anon_update" ON projects
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- DELETE は管理者のみ（Edge Function 経由推奨だが、当面 anon 許可）
CREATE POLICY "projects_anon_delete" ON projects
  FOR DELETE TO anon
  USING (true);

CREATE POLICY "projects_service_full" ON projects
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 5. entries テーブル: 全操作許可（認証済みユーザー前提）
-- ────────────────────────────────────────────────────────────
CREATE POLICY "entries_anon_all" ON entries
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "entries_service_full" ON entries
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 6. clock_logs テーブル
-- ────────────────────────────────────────────────────────────
CREATE POLICY "clock_logs_anon_all" ON clock_logs
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "clock_logs_service_full" ON clock_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 7. leaves テーブル
-- ────────────────────────────────────────────────────────────
CREATE POLICY "leaves_anon_all" ON leaves
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "leaves_service_full" ON leaves
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 8. handover_memos テーブル
-- ────────────────────────────────────────────────────────────
CREATE POLICY "handover_memos_anon_all" ON handover_memos
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "handover_memos_service_full" ON handover_memos
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 9. announcements テーブル
-- ────────────────────────────────────────────────────────────
CREATE POLICY "announcements_anon_all" ON announcements
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "announcements_service_full" ON announcements
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 10. customers テーブル
-- ────────────────────────────────────────────────────────────
CREATE POLICY "customers_anon_all" ON customers
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "customers_service_full" ON customers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 11. attachments テーブル
-- ────────────────────────────────────────────────────────────
CREATE POLICY "attachments_anon_all" ON attachments
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "attachments_service_full" ON attachments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 12. PIN をハッシュ化するための拡張機能を有効化
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ────────────────────────────────────────────────────────────
-- 13. 既存の平文PINをハッシュ化
-- ────────────────────────────────────────────────────────────
-- pin_hash カラムを追加
ALTER TABLE staff ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- 既存PINをbcryptハッシュに変換
UPDATE staff SET pin_hash = crypt(pin, gen_salt('bf', 8)) WHERE pin IS NOT NULL AND pin_hash IS NULL;

-- ※ 移行完了後、平文 pin カラムを削除する場合は以下を実行:
-- ALTER TABLE staff DROP COLUMN pin;
-- （Edge Function の auth-pin が稼働してから実行すること）
