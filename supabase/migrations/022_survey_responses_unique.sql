-- [2026-04-28] survey_responses に (survey_id, staff_id) UNIQUE 制約追加
-- api-gateway の submit_survey_response が onConflict: "survey_id,staff_id" で upsert していたが
-- DB に該当 UNIQUE 制約が無く、機能していなかった
-- 念のため重複データがあれば古いものを削除してから制約追加
DELETE FROM survey_responses a
USING survey_responses b
WHERE a.ctid < b.ctid
  AND a.survey_id = b.survey_id
  AND a.staff_id = b.staff_id;

ALTER TABLE survey_responses
  ADD CONSTRAINT survey_responses_survey_staff_unique
  UNIQUE (survey_id, staff_id);
