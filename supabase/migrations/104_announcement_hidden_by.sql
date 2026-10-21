-- 104_announcement_hidden_by.sql
-- [2026-10-19] アナウンスを、読んだ人が自分の画面から消せるようにする（ほかの人の画面には残る）
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS hidden_by TEXT[] NOT NULL DEFAULT '{}';
