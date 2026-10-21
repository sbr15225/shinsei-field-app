-- ═══════════════════════════════════════════════════════════
-- 091_webauthn_passkey.sql
-- [2026-09-26] 管理者向けパスキー（WebAuthn）ログイン 段階1：追加のみ。PINログインは今まで通り使える
--
-- 追加するもの：
--   ・webauthn_credentials … 登録済みパスキー（公開鍵）。1人が複数台登録できる
--   ・webauthn_challenges  … 登録/ログインのチャレンジ。1回使ったら削除・5分で失効（Edge Function 側で保証）
--   ・staff.require_passkey … 「このスタッフはパスキー必須（PINログイン不可）」フラグ。段階2で使う。
--                              既定 false。auth-pin に判定コードは入っているが、false の間は何も変わらない
--   ・sessions.auth_method  … セッションの発行元（'pin' / 'passkey'）。段階2でPINのセッションだけ消すのに使う。
--                              既定 'pin' なので、既存の auth-pin（この列を書かない）はそのまま動く
--
-- 権限：アプリは Supabase Auth を使わず、Edge Function（service_role）だけがDBを触る（090 と同じ方針）。
--   新テーブルは RLS 有効・ポリシーなし・anon/authenticated/PUBLIC の権限なし。service_role のみ。
--   ※ api-gateway の rest_read 許可リストにも入れない（公開鍵・チャレンジはフロントから読ませない）
--
-- 実DBで確認した状態（2026-09-26・読み取り専用SQL）：
--   ・staff.id は text（s1〜s6）。admin は s5「管理者」の1アカウントだけ（勝間さん・社長で共用）
--   ・sessions: id uuid / staff_id text / token text UNIQUE / created_at / expires_at
--   ・webauthn_* テーブルはまだ無い。schema_migrations の最新は 090
--   ・postgres の既定権限は 090 で anon/authenticated 剥奪済み（service_role のみ）。念のため下で明示的に REVOKE/GRANT する
-- ═══════════════════════════════════════════════════════════

-- ① 登録済みパスキー
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      text        NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  credential_id text        NOT NULL UNIQUE,          -- 認証器が発行したID（base64url）
  public_key    text        NOT NULL,                 -- COSE公開鍵（base64url）。秘密鍵は端末から出ない
  sign_count    bigint      NOT NULL DEFAULT 0,       -- 署名カウンタ（複製検知用。Windows Hello 等は 0 のままのことがある）
  transports    text[]      NOT NULL DEFAULT '{}',    -- internal / hybrid など
  device_label  text        NOT NULL DEFAULT '',      -- 画面に出す端末名（例：Windows PC 9/26）。編集可
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz
);
CREATE INDEX IF NOT EXISTS webauthn_credentials_staff_id_idx ON public.webauthn_credentials (staff_id);

-- ② チャレンジ（短命）
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose    text        NOT NULL CHECK (purpose IN ('register', 'login')),
  staff_id   text        REFERENCES public.staff(id) ON DELETE CASCADE, -- 登録は必須・ログインは NULL（誰がログインするかは未確定）
  challenge  text        NOT NULL,                                        -- base64url
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webauthn_challenges_register_needs_staff CHECK (purpose = 'login' OR staff_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS webauthn_challenges_expires_at_idx ON public.webauthn_challenges (expires_at);

-- ③ RLS 有効・ポリシーなし（service_role は RLS をバイパスする）
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.webauthn_credentials, public.webauthn_challenges FROM PUBLIC, anon, authenticated;
GRANT  ALL ON public.webauthn_credentials, public.webauthn_challenges TO service_role;

-- ④ 段階2用フラグ（今回は全員 false のまま）
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS require_passkey boolean NOT NULL DEFAULT false;

-- ⑤ セッションの発行元（既存行・auth-pin の新規行は 'pin'）
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS auth_method text NOT NULL DEFAULT 'pin';

NOTIFY pgrst, 'reload schema';

-- ── 適用後の確認（読み取り専用）────────────────────────────
-- SELECT c.relname, c.relrowsecurity AS rls,
--   has_table_privilege('anon', c.oid, 'SELECT') AS anon_sel,
--   has_table_privilege('authenticated', c.oid, 'SELECT') AS auth_sel,
--   has_table_privilege('service_role', c.oid, 'INSERT') AS svc_ins
-- FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relname IN ('webauthn_credentials', 'webauthn_challenges');
--   → rls=true / anon_sel=false / auth_sel=false / svc_ins=true
-- SELECT id, name, role, require_passkey FROM staff ORDER BY id;   → 全員 false
-- SELECT column_name, column_default FROM information_schema.columns
--   WHERE table_name = 'sessions' AND column_name = 'auth_method';  → 'pin'::text

-- ── 取り消し（段階1をやめる場合。パスキーの登録情報も消える）─────────────
-- DROP TABLE IF EXISTS public.webauthn_challenges;
-- DROP TABLE IF EXISTS public.webauthn_credentials;
-- ALTER TABLE public.staff    DROP COLUMN IF EXISTS require_passkey;   -- ※ auth-pin を 9/26 以前に戻してから
-- ALTER TABLE public.sessions DROP COLUMN IF EXISTS auth_method;       -- ※ auth-passkey を削除してから
