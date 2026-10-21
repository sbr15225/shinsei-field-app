-- 経費項目テーブル（材料費・外注費・その他を項目ごとに積み上げ）
CREATE TABLE IF NOT EXISTS expense_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('material', 'subcontract', 'other')),
  description TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL DEFAULT 0,
  staff_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_items_select" ON expense_items
  FOR SELECT TO anon USING (true);

CREATE INDEX idx_expense_items_project ON expense_items(project_id);
CREATE INDEX idx_expense_items_cat ON expense_items(project_id, category);
