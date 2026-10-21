-- migration 058: 図面(project_drawings)のStorage移行の土台
--
-- 目的: 図面は現状 file_data に base64(data URL) を直接保持しており DB を肥大させる。
--   その現場で最後の打刻から60日経過したら、図面ファイルを非公開バケットへ移し
--   file_data を空にする（DB軽量化）。表示はログイン時に署名付きURLを発行して行う。
--
-- ここでは土台だけ用意する:
--   ① 非公開バケット project-drawings を作成（public=false）
--   ② project_drawings に storage_path 列を追加（移行済みの図面はここにStorage上のパスを持つ）
--
-- 移行バッチ本体は Edge Function（migrate-old-drawings）＋ pg_cron で実行する。

-- ① 非公開バケット（既存なら何もしない）
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-drawings', 'project-drawings', false)
ON CONFLICT (id) DO NOTHING;

-- ② 保存先パス列（NULL=まだDB内base64、値あり=Storageへ移行済み）
ALTER TABLE project_drawings ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 移行対象の絞り込みを速くするための補助インデックス
CREATE INDEX IF NOT EXISTS idx_project_drawings_storage_path
  ON project_drawings (storage_path)
  WHERE storage_path IS NULL;
