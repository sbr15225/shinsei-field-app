-- ═══════════════════════════════════════════════════════════
-- 092_google_admin_login.sql
-- [2026-09-29] 管理画面に「Googleでログイン」を追加（社長・勝間さんの Gmail だけ管理者として入れる）
--
-- 追加するもの：
--   ・app_settings.google_client_id     … Google Cloud の OAuth クライアントID（…apps.googleusercontent.com）。空＝Googleログイン無効
--   ・app_settings.admin_google_emails  … 管理者として入れる Gmail（カンマ区切り）。空＝誰も入れない
--       ※ どちらも空文字で入れるだけ。値は本人が後で入れる（既に行があれば上書きしない）
--   ・login_audit_logs … Googleログインの成功・拒否の記録（どのメールで入ったか）。
--       認証系の監査ログは今まで無かったため新設。091 と同じく RLS 有効・ポリシーなし・service_role のみ
--
-- 実DBで確認した状態（2026-09-29・読み取り専用SQL）：
--   ・app_settings: key text NOT NULL / value text NOT NULL DEFAULT '' / updated_at timestamptz DEFAULT now()
--     既存キーは breakeven_ninku_rate / default_ninku_rate / progress_request_all_at の3つ
--     anon は SELECT 権限なし（ポリシーはあるが GRANT が無い）→ フロントは auth-google の get_config で client_id を取る
--   ・sessions.auth_method は 091 で追加済み（既定 'pin'）。auth-google は 'google' を入れる（CHECK 制約なし）
--   ・staff: s5「管理者」が唯一の role=admin。require_passkey は全員 false
-- ═══════════════════════════════════════════════════════════

-- ① 設定キー（空文字。既にあれば何もしない）
INSERT INTO public.app_settings (key, value, updated_at) VALUES
  ('google_client_id', '', now()),
  ('admin_google_emails', '', now())
ON CONFLICT (key) DO NOTHING;

-- ② ログインの監査ログ
CREATE TABLE IF NOT EXISTS public.login_audit_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  auth_method text        NOT NULL,              -- 'google'
  result      text        NOT NULL CHECK (result IN ('success', 'denied')),
  email       text        NOT NULL DEFAULT '',   -- Google のメール（検証できなかった時は空）
  staff_id    text,                              -- 成功時に発行したセッションの staff（s5）
  reason      text        NOT NULL DEFAULT '',   -- 拒否理由（not_allowed / email_not_verified / invalid_token など）
  ip          text        NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS login_audit_logs_created_at_idx ON public.login_audit_logs (created_at DESC);

ALTER TABLE public.login_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.login_audit_logs FROM PUBLIC, anon, authenticated;
GRANT  ALL ON public.login_audit_logs TO service_role;

NOTIFY pgrst, 'reload schema';

-- ── 適用後の確認（読み取り専用）────────────────────────────
-- SELECT key, value FROM app_settings WHERE key IN ('google_client_id', 'admin_google_emails');  → 2行・空文字
-- SELECT c.relname, c.relrowsecurity AS rls,
--   has_table_privilege('anon', c.oid, 'SELECT') AS anon_sel,
--   has_table_privilege('authenticated', c.oid, 'SELECT') AS auth_sel,
--   has_table_privilege('service_role', c.oid, 'INSERT') AS svc_ins
-- FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relname = 'login_audit_logs';
--   → rls=true / anon_sel=false / auth_sel=false / svc_ins=true
-- 記録の見方：SELECT created_at, result, email, reason, ip FROM login_audit_logs ORDER BY created_at DESC LIMIT 20;

-- ── 取り消し ─────────────────────────────────────────────
-- DROP TABLE IF EXISTS public.login_audit_logs;   -- ※ auth-google を削除してから
-- DELETE FROM public.app_settings WHERE key IN ('google_client_id', 'admin_google_emails');
