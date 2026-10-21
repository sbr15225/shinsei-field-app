-- 010: PIN失敗ロックをDB永続化 (Edge Function再起動でカウンタリセットされる問題対応)
-- [2026-04-15] failLockMap (in-memory) → DBテーブル化
CREATE TABLE IF NOT EXISTS pin_fail_locks (
  ip text PRIMARY KEY,
  failures int NOT NULL DEFAULT 0,
  locked_until timestamptz
);

ALTER TABLE pin_fail_locks ENABLE ROW LEVEL SECURITY;
-- service_role からのみ操作可能(anon は触れない)
-- ポリシー作成しない = 全拒否(service_roleはRLSバイパス)

-- 期限切れエントリの定期クリーンアップ用関数
CREATE OR REPLACE FUNCTION cleanup_pin_fail_locks() RETURNS void
LANGUAGE sql AS $$
  DELETE FROM pin_fail_locks WHERE locked_until IS NOT NULL AND locked_until < NOW() - INTERVAL '1 day';
$$;
