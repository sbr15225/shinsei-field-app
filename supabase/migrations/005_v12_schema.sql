-- 005_v12_schema.sql
-- shinsei_v12 用スキーマ変更

-- clock_logs: 備考欄追加
ALTER TABLE clock_logs ADD COLUMN IF NOT EXISTS remarks TEXT DEFAULT '';

-- projects: 契約形態・住所追加
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';

-- 見積中→準備中に変換（既存データ）
UPDATE projects SET status = '準備中' WHERE status = '見積中';

-- 外注テーブル
CREATE TABLE IF NOT EXISTS subcontractors (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  date DATE NOT NULL,
  company_name TEXT NOT NULL,
  headcount INTEGER NOT NULL DEFAULT 1,
  memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subcontractors_anon_read" ON subcontractors FOR SELECT TO anon USING (true);

-- 追加工事テーブル
CREATE TABLE IF NOT EXISTS additional_works (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE additional_works ENABLE ROW LEVEL SECURITY;
CREATE POLICY "additional_works_anon_read" ON additional_works FOR SELECT TO anon USING (true);
