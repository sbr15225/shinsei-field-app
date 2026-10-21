-- ═══════════════════════════════════════════════════════════
-- 093_device_session.sql
-- [2026-09-30] 管理画面の「登録済み端末（社長PC）ログイン」
--   Googleで入った管理者が「この端末を登録」を押すと、その端末専用のセッション（auth_method='device'・1年）を発行する。
--   社長（Googleアカウントなし）は自分のPCで管理画面を開くだけで入れる。取り消しは設定タブから（sessions の行を削除）
--
-- 追加するもの（sessions に列を2つ足すだけ。新テーブルなし）：
--   ・sessions.device_label … 端末名（例：社長PC）。device セッションだけ使う。他は空文字
--   ・sessions.auth_email   … Googleログインのメール。google セッションは本人のメール、
--                              device セッションは「登録した人」のメール。PIN・パスキーは空文字
--       ※ 093 適用前に発行された google セッションは空のまま → その状態では端末登録できない（Googleでログインし直してもらう）
--   監査ログ（login_audit_logs）は 092 のテーブルをそのまま使う：
--       auth_method='device' / result='success' / reason='device_register:端末名' or 'device_revoke:端末名' / email=操作した人
--
-- 実DBで確認した状態（2026-09-30・読み取り専用SQL）：
--   ・public.sessions: id uuid DEFAULT gen_random_uuid() / staff_id text NOT NULL / token text NOT NULL UNIQUE /
--     created_at timestamptz DEFAULT now() / expires_at timestamptz NOT NULL / auth_method text NOT NULL DEFAULT 'pin'
--   ・cleanup_expired_sessions() は「DELETE FROM sessions WHERE expires_at < now()」だけ（auth_method は見ない）
--   ・login_audit_logs.result は CHECK ('success','denied')。auth_method に CHECK はない
--   ・schema_migrations の最新は 092
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS device_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS auth_email   text NOT NULL DEFAULT '';

-- 一覧（auth_method='device' の行だけ引く）用
CREATE INDEX IF NOT EXISTS sessions_auth_method_idx ON public.sessions (auth_method);

NOTIFY pgrst, 'reload schema';

-- ── 適用後の確認（読み取り専用）────────────────────────────
-- SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'sessions' ORDER BY ordinal_position;
--   → device_label / auth_email が text NOT NULL DEFAULT '' で増えている
-- 登録済み端末の見方：
--   SELECT id, device_label, auth_email, created_at, expires_at FROM sessions WHERE auth_method = 'device' ORDER BY created_at;
-- 監査ログ：
--   SELECT created_at, result, email, reason, ip FROM login_audit_logs WHERE auth_method = 'device' ORDER BY created_at DESC;

-- ── 緊急時：登録済み端末をすべて止める ──────────────────────
-- DELETE FROM sessions WHERE auth_method = 'device';

-- ── 取り消し ─────────────────────────────────────────────
-- DELETE FROM sessions WHERE auth_method = 'device';   -- ※ 先に auth-google を 093 前の版に戻す
-- DROP INDEX IF EXISTS public.sessions_auth_method_idx;
-- ALTER TABLE public.sessions DROP COLUMN IF EXISTS device_label, DROP COLUMN IF EXISTS auth_email;
