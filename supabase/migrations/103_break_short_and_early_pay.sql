-- 103_break_short_and_early_pay.sql
-- [2026-10-19] ①17時を過ぎた退勤で「休憩が取れなかった」と答えた分数と理由（働いた時間として残業に足す）
--              ②本人都合の早上がりで、本人が選んだ扱い（paid_leave＝時間有給を使う／absence＝欠勤・給料から差し引く）
--              （時間単位年休の協定 2026-10-19 第5条：会社が勝手に有給を充てない）
ALTER TABLE clock_logs
  ADD COLUMN IF NOT EXISTS break_short_min INTEGER,
  ADD COLUMN IF NOT EXISTS break_short_reason TEXT,
  ADD COLUMN IF NOT EXISTS early_leave_pay TEXT;
