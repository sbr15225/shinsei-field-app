-- ═══════════════════════════════════════════════════════════
-- 019_material_costs.sql
-- 材料費PDF取り込み用
--   * invoice_uploads : 請求書1枚＝1行（PDF保存先・総額・期間）
--   * material_costs  : 請求書の明細1行＝1行（物件単位の値引・在庫扱いも含む）
-- 業者は当面「関東ロックウール」のみ。他社追加に備えて vendor カラムを持つ。
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS invoice_uploads (
  id              TEXT PRIMARY KEY,
  vendor          TEXT NOT NULL DEFAULT '関東ロックウール',
  invoice_date    DATE,              -- 発行日 (例: 2025-11-30)
  period_start    DATE,              -- 請求期間 開始
  period_end      DATE,              -- 請求期間 終了
  subtotal        INTEGER DEFAULT 0, -- 10%対象（税抜）
  tax             INTEGER DEFAULT 0, -- 消費税
  total_with_tax  INTEGER DEFAULT 0, -- 税込合計
  pdf_url         TEXT,              -- Supabase Storage のURL
  pdf_name        TEXT,              -- 元ファイル名
  uploaded_by     TEXT,              -- staff.id
  uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
  status          TEXT DEFAULT 'pending', -- pending / confirmed
  parsed_raw      JSONB               -- Claude APIの生レスポンス（デバッグ用）
);

CREATE TABLE IF NOT EXISTS material_costs (
  id               TEXT PRIMARY KEY,
  invoice_id       TEXT REFERENCES invoice_uploads(id) ON DELETE CASCADE,
  project_id       TEXT REFERENCES projects(id) ON DELETE SET NULL,
  project_name_on_invoice TEXT,  -- PDFの【物件名】そのまま（マッチング履歴）
  item_date        DATE,
  invoice_no       TEXT,            -- 5006096 等
  item_name        TEXT,
  spec             TEXT,            -- 規格
  quantity         NUMERIC DEFAULT 0,
  unit             TEXT,            -- 枚/本/個/台
  unit_price       NUMERIC DEFAULT 0,
  amount           INTEGER DEFAULT 0,  -- 金額（値引はマイナスで入る）
  is_discount      BOOLEAN DEFAULT FALSE,  -- 【物件値引計】行
  is_stock         BOOLEAN DEFAULT FALSE,  -- 「在庫」物件
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_costs_invoice ON material_costs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_material_costs_project ON material_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_invoice_uploads_date    ON invoice_uploads(invoice_date);

-- ── RLS (select は anon 可、書き込みは api-gateway 経由のみ) ──
ALTER TABLE invoice_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_costs  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_uploads_select" ON invoice_uploads;
DROP POLICY IF EXISTS "material_costs_select"  ON material_costs;
CREATE POLICY "invoice_uploads_select" ON invoice_uploads FOR SELECT TO anon USING (true);
CREATE POLICY "material_costs_select"  ON material_costs  FOR SELECT TO anon USING (true);

-- ── Storage バケット ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-pdfs', 'invoice-pdfs', false)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
