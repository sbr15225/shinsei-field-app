-- [2026-04-27] 管理者メモテーブル
CREATE TABLE IF NOT EXISTS admin_notes (
  id          TEXT        PRIMARY KEY,
  content     TEXT        NOT NULL DEFAULT '',
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON admin_notes
  USING (true) WITH CHECK (true);
