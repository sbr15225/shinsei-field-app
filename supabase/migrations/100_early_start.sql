-- [2026-10-14] 早出（打刻修正で「早出」にチェックした打刻）。
-- early_start=true の打刻がある日は、その日の実働（休憩を除く）− 所定6.5時間を残業として数える（就業規則 第18条・第41条）。
-- チェックのない打刻は従来どおり（8時前の出勤は8:00扱い、残業は17:30以降）。
ALTER TABLE clock_logs ADD COLUMN IF NOT EXISTS early_start boolean NOT NULL DEFAULT false;
-- 申請・修正履歴：null＝早出の指定を変えない、true/false＝その値にする
ALTER TABLE clock_modifications ADD COLUMN IF NOT EXISTS requested_early_start boolean;
