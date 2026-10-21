-- 038_cleanup_temp_admin_session.sql
-- [2026-05-21] base64→Storage 移行作業で使った一時 admin セッションを削除
DELETE FROM sessions WHERE token = 'a1d3a0fe-7c01-4e9b-9c2a-base64migrxxx';
