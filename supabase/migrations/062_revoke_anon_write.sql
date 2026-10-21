-- ═══════════════════════════════════════════════════════════
-- 062_revoke_anon_write.sql
-- anon ロールからの書き込み（INSERT / UPDATE / DELETE）を全面剥奪
--
-- 経緯: 2026-07-14 セキュリティ監査。057 は anon の SELECT のみ REVOKE していたが、
--   001/003 で作成した anon 書き込みポリシー（projects, entries, clock_logs, leaves,
--   handover_memos, announcements, customers, attachments）と、それに対応する
--   テーブルレベルの INSERT/UPDATE/DELETE 権限が anon に残っていた。
--   → 公開 anon キーを知る第三者が PostgREST を直接叩き、api-gateway の
--     所有者/admin/金額チェックを迂回して勤務時間・請負金額・有給の改ざんが可能な状態だった。
--
-- 方式: 057 と同じく「テーブル権限を GRANT 階層で REVOKE」する。権限が無ければ
--   RLS ポリシーの許可に関わらず anon は書き込めない。アプリの書き込みは全て
--   api-gateway（service_role）経由のため影響なし。念のため既知の anon 書き込み
--   ポリシーも DROP しておく（冪等・取りこぼし対策の二重化）。
--
-- ⚠️ 適用前提: アプリの書き込みが全て api-gateway 経由であること（現状そうなっている）。
-- 復旧: 末尾のロールバック用コメント参照。
-- ═══════════════════════════════════════════════════════════

-- 1) スキーマ内の全テーブル・ビューから anon の書き込み権限を剥奪（包括・安全側）
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;

-- 2) 今後 migration 等で新テーブルを作っても anon に書き込みが付かないよう既定権限も剥奪
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE ON TABLES FROM anon;

-- 3) 既知の anon 書き込みポリシーを明示 DROP（IF EXISTS なので存在しなくてもエラーにならない）
DROP POLICY IF EXISTS "projects_anon_write"          ON projects;
DROP POLICY IF EXISTS "projects_anon_update"         ON projects;
DROP POLICY IF EXISTS "projects_anon_delete"         ON projects;
DROP POLICY IF EXISTS "entries_anon_insert"          ON entries;
DROP POLICY IF EXISTS "entries_anon_update"          ON entries;
DROP POLICY IF EXISTS "clock_logs_anon_insert"       ON clock_logs;
DROP POLICY IF EXISTS "clock_logs_anon_update"       ON clock_logs;
DROP POLICY IF EXISTS "leaves_anon_insert"           ON leaves;
DROP POLICY IF EXISTS "leaves_anon_update"           ON leaves;
DROP POLICY IF EXISTS "handover_memos_anon_insert"   ON handover_memos;
DROP POLICY IF EXISTS "handover_memos_anon_update"   ON handover_memos;
DROP POLICY IF EXISTS "announcements_anon_insert"    ON announcements;
DROP POLICY IF EXISTS "announcements_anon_update"    ON announcements;
DROP POLICY IF EXISTS "customers_anon_insert"        ON customers;
DROP POLICY IF EXISTS "customers_anon_update"        ON customers;
DROP POLICY IF EXISTS "attachments_anon_insert"      ON attachments;
DROP POLICY IF EXISTS "attachments_anon_update"      ON attachments;
DROP POLICY IF EXISTS "attachments_anon_delete"      ON attachments;

NOTIFY pgrst, 'reload schema';

-- ── ロールバック（万一アプリの書き込みが壊れたら以下を実行）──────────────
-- GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
--   ※ ただし本来 anon 書き込みはアプリで使っていないため、壊れる想定はない。
