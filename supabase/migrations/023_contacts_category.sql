-- [2026-04-28] 名刺を「顧客」「協力会社」に分類するためのカラム追加
-- photo_url カラムは既に存在するため不要
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '顧客';
