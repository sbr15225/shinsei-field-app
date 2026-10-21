-- [2026-07-01] 退勤打刻に写真を添付できるようにするためのカラム追加
-- 目的: 退勤フローで現場の写真（任意）を1枚添付し、clock_logs に紐づけて保存する。
--       管理者画面の打刻詳細で表示する。
-- 値: field-photos バケットにアップロードした画像の公開URL（既存のメモ/引継ぎ写真と同じ仕組み）。
--     未添付は NULL。
-- 既存カラム確認: information_schema.columns に clock_out_photo が無いことを確認済み（新規）。

ALTER TABLE clock_logs
  ADD COLUMN IF NOT EXISTS clock_out_photo TEXT;
