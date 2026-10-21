-- =====================================================
-- 014_progress_reports.sql
-- 2026-04-20 顧客ごとの進捗確認日（月2回）＆進捗報告テーブル
-- - customers.progress_check_day1 / progress_check_day2 (INT 1-31)
-- - projects.completed_at (TIMESTAMPTZ, ステータスが完了になった日時)
-- - progress_reports 新規テーブル（案件ごとの進捗％履歴）
-- =====================================================

-- ─────────────────────────────
-- 顧客の進捗確認日（月2回）
--   day1: 客先共有日（客先にも伝える）
--   day2: 内部確認日（管理者のみ表示）
-- ─────────────────────────────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS progress_check_day1 INTEGER,
  ADD COLUMN IF NOT EXISTS progress_check_day2 INTEGER;

ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_progress_check_day1_range;
ALTER TABLE customers
  ADD CONSTRAINT customers_progress_check_day1_range
  CHECK (progress_check_day1 IS NULL OR (progress_check_day1 BETWEEN 1 AND 31));

ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_progress_check_day2_range;
ALTER TABLE customers
  ADD CONSTRAINT customers_progress_check_day2_range
  CHECK (progress_check_day2 IS NULL OR (progress_check_day2 BETWEEN 1 AND 31));

-- ─────────────────────────────
-- 案件の完了日時（ステータスが完了に変わった瞬間を記録）
-- 既存の完了案件はとりあえず現在時刻を入れておく（厳密には分からないため）
-- 以降は api-gateway で status 更新時に設定
-- ─────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE projects
  SET completed_at = NOW()
  WHERE status = '完了' AND completed_at IS NULL;

-- ─────────────────────────────
-- 進捗報告テーブル（履歴保持）
--   - 1案件について複数レポートを持てる（履歴比較のため）
--   - percent は 0-100（10刻みで入力させるが DB 制約は 0-100）
-- ─────────────────────────────
CREATE TABLE IF NOT EXISTS progress_reports (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  customer_id    TEXT REFERENCES customers(id) ON DELETE SET NULL,
  reporter_id    TEXT,                             -- staff.id（削除されても履歴は残す）
  reporter_name  TEXT DEFAULT '',                  -- 非正規化: 名前変更・削除後も表示のため
  percent        INTEGER NOT NULL CHECK (percent BETWEEN 0 AND 100),
  comment        TEXT DEFAULT '',
  reported_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_reports_project     ON progress_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_reported_at ON progress_reports(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_reports_project_date
  ON progress_reports(project_id, reported_at DESC);

ALTER TABLE progress_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_reports_select" ON progress_reports;
CREATE POLICY "progress_reports_select" ON progress_reports FOR SELECT TO anon USING (true);
-- INSERT/UPDATE/DELETE は api-gateway (service_role) のみ

-- =====================================================
-- 完了
-- =====================================================
