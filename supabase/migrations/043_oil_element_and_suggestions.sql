-- 043_oil_element_and_suggestions.sql
-- [2026-06-12] 2機能追加
--   ① オイル交換にエレメント（オイルフィルター）交換フラグを追加
--   ② ご意見箱（匿名投稿）テーブルを新規作成

-- ① エレメント交換フラグ
-- オイル交換2回に1回はエレメント交換するルール。前回エレメント未交換なら次回のオイル交換時にアラート。
ALTER TABLE vehicle_oil_changes
  ADD COLUMN IF NOT EXISTS element_changed BOOLEAN NOT NULL DEFAULT false;

-- ② ご意見箱
-- 匿名投稿。staff_id はDB上は持つが管理者画面には出さない（誰が書いたかは特定しない運用）。
-- RLS有効・ポリシー未定義＝anon/authenticatedからは読み書き不可。api-gateway（service_role）経由のみ。
CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  staff_id TEXT,                                   -- 投稿者ID（匿名担保のため管理画面には返さない）
  status TEXT NOT NULL DEFAULT '未対応',            -- 未対応 / 対応済み
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestions_created ON suggestions(created_at DESC);

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
