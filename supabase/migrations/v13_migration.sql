-- =====================================================
-- v13 マイグレーション
-- 2026-03-17
-- =====================================================

-- 1. clock_logs に location_name カラム追加
ALTER TABLE clock_logs
  ADD COLUMN IF NOT EXISTS location_name TEXT DEFAULT '';

-- 2. contacts テーブル作成（名刺管理）
CREATE TABLE IF NOT EXISTS contacts (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL DEFAULT '',
  company     TEXT DEFAULT '',
  phone       TEXT DEFAULT '',
  email       TEXT DEFAULT '',
  address     TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  photo_url   TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. contacts の RLS（anon キーで読み取り可）
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- 読み取り: 全ユーザー可（RLS はアプリ側で admin チェック済み）
CREATE POLICY IF NOT EXISTS "contacts_select"
  ON contacts FOR SELECT
  USING (true);

-- 書き込み: service_role のみ（api-gateway 経由）
CREATE POLICY IF NOT EXISTS "contacts_insert"
  ON contacts FOR INSERT
  WITH CHECK (false);  -- anon からの直接書き込み禁止

CREATE POLICY IF NOT EXISTS "contacts_update"
  ON contacts FOR UPDATE
  USING (false);

CREATE POLICY IF NOT EXISTS "contacts_delete"
  ON contacts FOR DELETE
  USING (false);
