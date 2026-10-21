-- [2026-05-01] projects.target_mandays を NUMERIC に変更
-- 経緯:
--   admin.html 案件編集モーダルで「請負金額」を変更した瞬間、
--   フロント側で目標人工 = 請負 ÷ 人工単価 を toFixed(1) で自動再計算し
--   fields.targetMandays = 1.5 のような小数を api-gateway 経由で送る。
--   target_mandays が INTEGER だと PostgreSQL が
--   `invalid input syntax for type integer: "1.5"` を返し、
--   update_project_fields の patch 全体がロールバック → 「⚠ 保存に失敗しました」
--
-- 修正:
--   NUMERIC に変更して小数を許容する。既存値はそのまま保持。
--   USING でキャストを明示。
ALTER TABLE projects
  ALTER COLUMN target_mandays TYPE NUMERIC USING target_mandays::NUMERIC;
