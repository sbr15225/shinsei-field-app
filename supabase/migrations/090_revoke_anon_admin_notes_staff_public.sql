-- ═══════════════════════════════════════════════════════════
-- 090_revoke_anon_admin_notes_staff_public.sql
-- 監査 A-4（2026-09-25）：公開 anon キーで読めてしまうテーブル・ビューの権限を剥奪する
--
-- 実DBで確認した状態（2026-09-25・読み取り専用SQLで確認）：
--   ・admin_notes        … anon に SELECT 権限あり＋ポリシー service_role_full_access が
--                           roles=public・USING(true)（020 で TO service_role が抜けていた）→ anon で読める
--                           authenticated には全権限あり＋同ポリシー → 読み書き削除まで可能
--   ・staff_public(ビュー) … anon に SELECT 権限あり（075 で作り直した時、postgres の既定権限で自動付与され、
--                           063 の剥奪が消えた）。security_invoker=false なので RLS も効かない → 全員の氏名・role が読める
--                           authenticated には INSERT/UPDATE/DELETE まで付いている（ビュー経由で staff を書き換えうる）
--   ・push_subscriptions  … anon に SELECT 権限あり＋ポリシー push_sub_read が roles=public・USING(true) → 読める
--   ・instagram_posts / instagram_post_images … anon に SELECT 権限あり＋anon 向け USING(true) ポリシー → 読める
--   ・contacts / annual_backups … anon は 057 で剥奪済み。ただし roles=public の SELECT ポリシーが残っており、
--                           authenticated には SELECT 権限がある
--   ・既定権限（pg_default_acl）：postgres が public スキーマに作るテーブルに anon=rDxtm（SELECT ほか）が自動付与される
--
-- アプリへの影響：なし。フロントの読み取りはすべて api-gateway（rest_read・service_role）経由で、
--   Edge Function はすべて service_role キーを使っている。service_role はこの REVOKE の影響を受けない。
--   アプリは Supabase Auth を使っていない（auth.users は 0 件）ので authenticated ロールも使っていない。
--
-- ⚠️ authenticated を剥奪している理由：Supabase Auth の新規登録（signup）が有効だと、
--   anon キーだけで誰でもアカウントを作って authenticated ロールになれるため。
--   将来 Supabase Auth を使う場合は、必要なテーブルだけ明示的に GRANT し直すこと。
-- ═══════════════════════════════════════════════════════════

-- ① admin_notes：全ロール向けになっていたポリシーを削除し、anon・authenticated の権限を剥奪
--    （service_role は RLS をバイパスするのでポリシー不要。api-gateway の list/insert/update/delete_admin_note は継続して動く）
DROP POLICY IF EXISTS "service_role_full_access" ON admin_notes;
REVOKE ALL ON admin_notes FROM anon, authenticated;

-- ② staff_public：anon・authenticated の権限を剥奪（063 の意図を復元。075 の作り直しで戻っていた）
REVOKE ALL ON staff_public FROM anon, authenticated;

-- ③ 実際に anon で読めていたその他のテーブル（いずれも api-gateway / send-push が service_role で使うだけ）
REVOKE ALL ON push_subscriptions, instagram_posts, instagram_post_images FROM anon, authenticated;

-- ④ roles=public の SELECT ポリシーが残っているテーブル（anon は 057 で剥奪済み。authenticated を塞ぐ）
REVOKE ALL ON contacts, annual_backups FROM authenticated;

-- ⑤ 念のため（現状は RLS で止まっているが、ポリシーを足した瞬間に漏れる機密テーブル）
REVOKE ALL ON sessions, staff, pin_fail_locks FROM anon, authenticated;

-- ⑥ 今後 postgres が public に作るテーブル・ビューに anon / authenticated の権限を自動で付けない
--    （075 のように作り直した時に権限が戻る事故を防ぐ）
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- ── 適用後の確認（読み取り専用）────────────────────────────
-- SELECT c.relname,
--   has_table_privilege('anon', c.oid, 'SELECT') AS anon_sel,
--   has_table_privilege('authenticated', c.oid, 'SELECT') AS auth_sel
-- FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public'
--   AND c.relname IN ('admin_notes','staff_public','push_subscriptions','instagram_posts',
--                     'instagram_post_images','contacts','annual_backups','sessions','staff','pin_fail_locks');
--   → すべて false になっていること
-- SELECT policyname FROM pg_policies WHERE tablename = 'admin_notes';  → 0 行

-- ── 復旧用（万一アプリが読めなくなったら。本来は不要）─────────────────
-- ※ アプリは service_role 経由なので、この migration で壊れることは想定していない。
-- GRANT SELECT ON admin_notes, staff_public, push_subscriptions, instagram_posts, instagram_post_images TO anon;
-- CREATE POLICY "service_role_full_access" ON admin_notes FOR ALL TO service_role USING (true) WITH CHECK (true);
