-- [2026-06-05] 出勤打刻時の通勤方法を記録するためのカラム追加
-- 目的: スタッフが現場へどの手段で通勤したか（社用車/電車/自車）を出勤打刻時に記録し、管理画面で可視化する
-- 値: 'company_car'（社用車） / 'train'（電車） / 'own_car'（自車）。未選択は出勤打刻不可なので原則NULLにならない

ALTER TABLE clock_logs
  ADD COLUMN IF NOT EXISTS commute_method TEXT;
