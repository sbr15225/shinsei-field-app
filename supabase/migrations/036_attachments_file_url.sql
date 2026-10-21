-- 036_attachments_file_url.sql
-- [2026-05-21] attachments テーブルに file_url カラム追加（base64データをStorage URLに段階移行）
-- 移行戦略: 新規保存は file_url を使用、表示は file_url || data の両対応、
-- 後日 移行スクリプトで既存 data(base64) を Storage に移し file_url を埋める

ALTER TABLE attachments ADD COLUMN IF NOT EXISTS file_url TEXT;
