-- [2026-04-27] アンケート回答にスタッフ名を保存するためのカラム追加
-- 経緯: api-gateway の submit_survey_response が staff_name に書き込もうとしていたが
-- カラムが未作成のため INSERT 失敗 → 全アンケート回答が DB に保存されていなかった
ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS staff_name TEXT DEFAULT '';
