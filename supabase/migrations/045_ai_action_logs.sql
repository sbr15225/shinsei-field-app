-- 045_ai_action_logs.sql
-- [2026-06-16] 管理者AIチャット強化: AI経由のDB操作ログ＋取り消し用テーブル
--   - AIチャットから実行した全操作（打刻追加/編集/削除・休暇登録・残日数設定・外注登録など）を記録
--   - action_detail に「逆操作（undo）」の情報も保存し、直前操作の取り消しに使う
--   - RLS有効・ポリシー未定義＝anon/authenticatedからは読み書き不可。api-gateway（service_role）経由のみ。

CREATE TABLE IF NOT EXISTS ai_action_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    TEXT,                                 -- 操作した管理者のスタッフID
  action_type TEXT NOT NULL,                        -- AIツール名（add_clock_log / insert_leave など）
  action_detail JSONB NOT NULL DEFAULT '{}'::jsonb, -- 入力内容・結果・逆操作(undo)情報
  undone      BOOLEAN NOT NULL DEFAULT false,       -- 取り消し済みか
  undone_at   TIMESTAMPTZ,                          -- 取り消した日時
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_action_logs_created ON ai_action_logs(created_at DESC);

ALTER TABLE ai_action_logs ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
