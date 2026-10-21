-- [2026-05-19] 追加工事のフォーム入力（フロア・場所）を保存できるようカラム追加
-- 症状: 案件一覧 → 追加工事「追加する」で「保存に失敗しました」エラー
-- 原因: api-gateway insert_additional_work / update_additional_work が floor/location を
--       書き込もうとしていたが実DBに該当カラムが存在せず INSERT/UPDATE が失敗していた
ALTER TABLE additional_works
  ADD COLUMN IF NOT EXISTS floor TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
