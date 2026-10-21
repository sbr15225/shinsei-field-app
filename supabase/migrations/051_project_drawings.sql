-- 051 マイグレーション — 2026-06-17
-- 案件詳細の「図面データ」機能
--   画像(jpg/png)・PDF を案件にひもづけて保存する。
--   file_data は base64(data URL) を直接保持する。
--   読み書きとも api-gateway(service_role) 経由のため anon ポリシーは付与しない。

CREATE TABLE IF NOT EXISTS project_drawings (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  file_name   TEXT,
  file_type   TEXT,                     -- 'image' | 'pdf'
  file_data   TEXT,                     -- base64 data URL
  uploaded_by TEXT,                     -- staff_id
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 案件IDでの取得を高速化
CREATE INDEX IF NOT EXISTS idx_project_drawings_project_id ON project_drawings(project_id);

-- RLS有効化（書き込み・読み取りとも service_role のみ。フロントは api-gateway 経由）
ALTER TABLE project_drawings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_drawings_service_full" ON project_drawings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
