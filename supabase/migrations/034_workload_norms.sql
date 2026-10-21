-- 034_workload_norms.sql
-- [2026-05-21] 施工人工目安マスタ（社外秘・歩掛りデータ）
-- 現場で実測した「1人1日あたり何台/何m」を案件と紐付けて蓄積し、見積の参考に使う。
-- 管理者のみアクセス。anon/authenticatedからは読み書き不可（api-gateway service_role経由のみ）。

CREATE TABLE IF NOT EXISTS workload_norms (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,                  -- 工事パターン名（例：ファンコイル周り（冷温水・2管式））
  size_spec TEXT NOT NULL DEFAULT '',      -- 規格・サイズ（例：20A）
  unit TEXT NOT NULL DEFAULT '台',          -- 主単位（台/m/㎡/個/式 など）
  per_man_day NUMERIC,                     -- 1人1日あたり数量（例：4.5）
  materials TEXT NOT NULL DEFAULT '',      -- 付随部材・自由記述（例：冷温水10m / ドレン4m / エルボ20個）
  notes TEXT NOT NULL DEFAULT '',          -- メモ
  source_project_id TEXT,                  -- 出典案件ID（NULL可：手入力した経験値分）
  created_by TEXT,                         -- 入力者staffId
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- パターン別グルーピングと出典案件絞り込み用インデックス
CREATE INDEX IF NOT EXISTS idx_workload_norms_category ON workload_norms(category);
CREATE INDEX IF NOT EXISTS idx_workload_norms_source ON workload_norms(source_project_id);

-- RLS有効化。ポリシー未定義＝anon/authenticatedは全て拒否。service_role（api-gateway）のみアクセス可。
ALTER TABLE workload_norms ENABLE ROW LEVEL SECURITY;
