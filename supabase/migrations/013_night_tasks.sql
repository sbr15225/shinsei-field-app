-- =====================================================
-- 013_night_tasks.sql
-- 2026-04-16 夜タスク: 車両管理・請求日アラート・工期・担当者・ハイブリッド人工・販管費カテゴリ
-- NIGHT_TASKS_2026-04-16.md の ① ② ③ ④ ⑤ ⑦ ⑨ に対応
-- =====================================================

-- ─────────────────────────────
-- ① 車両情報テーブル
-- ─────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL DEFAULT '',      -- 車両名（例: ハイエース1号）
  plate_number  TEXT DEFAULT '',                -- ナンバー
  model         TEXT DEFAULT '',                -- 車種
  memo          TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_troubles (
  id          TEXT PRIMARY KEY,
  vehicle_id  TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_oil_changes (
  id         TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  mileage    INTEGER DEFAULT 0,
  note       TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_troubles_vid    ON vehicle_troubles(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_oil_changes_vid ON vehicle_oil_changes(vehicle_id);

ALTER TABLE vehicles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_troubles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_oil_changes ENABLE ROW LEVEL SECURITY;

-- 読み取りは anon 可（スタッフも閲覧）、書き込みは api-gateway (service_role) のみ
DROP POLICY IF EXISTS "vehicles_select"            ON vehicles;
DROP POLICY IF EXISTS "vehicle_troubles_select"    ON vehicle_troubles;
DROP POLICY IF EXISTS "vehicle_oil_changes_select" ON vehicle_oil_changes;
CREATE POLICY "vehicles_select"            ON vehicles            FOR SELECT TO anon USING (true);
CREATE POLICY "vehicle_troubles_select"    ON vehicle_troubles    FOR SELECT TO anon USING (true);
CREATE POLICY "vehicle_oil_changes_select" ON vehicle_oil_changes FOR SELECT TO anon USING (true);

-- ─────────────────────────────
-- ② 請求日アラート（customers に締め日・振込日、projects に請求済フラグ）
-- ─────────────────────────────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS closing_day INTEGER,
  ADD COLUMN IF NOT EXISTS payment_day INTEGER;

ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_closing_day_range;
ALTER TABLE customers
  ADD CONSTRAINT customers_closing_day_range CHECK (closing_day IS NULL OR (closing_day BETWEEN 1 AND 31));

ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_payment_day_range;
ALTER TABLE customers
  ADD CONSTRAINT customers_payment_day_range CHECK (payment_day IS NULL OR (payment_day BETWEEN 1 AND 31));

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS invoice_settled BOOLEAN NOT NULL DEFAULT false;

-- ─────────────────────────────
-- ③ 現場工期欄（projects に start_date / end_date — 既にあれば ADD IF NOT EXISTS がスキップ）
-- ─────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date   DATE;

-- ─────────────────────────────
-- ④ 案件に顧客担当者欄
-- ─────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS customer_contact TEXT DEFAULT '';

-- ─────────────────────────────
-- ⑤ ハイブリッド人工（アプリ設定テーブル）
-- ─────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_settings_select" ON app_settings;
CREATE POLICY "app_settings_select" ON app_settings FOR SELECT TO anon USING (true);

INSERT INTO app_settings (key, value)
VALUES ('default_ninku_rate', '70000')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────
-- ⑦ 販管費を独立カテゴリ化（expense_items.category に overhead を追加）
-- 既存: material / subcontract / other → material / subcontract / other / overhead
-- ─────────────────────────────
ALTER TABLE expense_items
  DROP CONSTRAINT IF EXISTS expense_items_category_check;
ALTER TABLE expense_items
  ADD CONSTRAINT expense_items_category_check
  CHECK (category IN ('material', 'subcontract', 'other', 'overhead'));

-- ─────────────────────────────
-- ⑨ うちの担当者（projects.internal_owner）
-- ─────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS internal_owner TEXT DEFAULT '';

-- =====================================================
-- 完了
-- =====================================================
