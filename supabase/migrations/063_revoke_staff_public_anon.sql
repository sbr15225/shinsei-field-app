-- ═══════════════════════════════════════════════════════════
-- 063_revoke_staff_public_anon.sql
-- staff_public ビューへの anon SELECT を再剥奪（057の意図を復元）
--
-- 経緯: 2026-07-14 監査。057 で `REVOKE SELECT ON staff_public FROM anon` したが、
--   その後 migration 061（旧056からのリネーム）末尾の `GRANT SELECT ON staff_public TO anon`
--   が番号順で後に走り、匿名読み取りが復活していた。
--   → 公開 anon キーを知る第三者が未認証で全スタッフの氏名・役割・役員フラグを取得できる状態
--     （日給 daily_rate は 056 で列除外済み・PIN は元から非公開なので、それらは漏れない）。
--   アプリは staff_public も api-gateway の rest_read（service_role）経由で読むため、
--   anon SELECT を剥奪しても表示は壊れない。
--
-- ⚠️ 061 を今後さわる時は末尾の GRANT を復活させないこと。
-- 復旧: `GRANT SELECT ON staff_public TO anon;`（本来不要）
-- ═══════════════════════════════════════════════════════════

REVOKE SELECT ON staff_public FROM anon;

NOTIFY pgrst, 'reload schema';
