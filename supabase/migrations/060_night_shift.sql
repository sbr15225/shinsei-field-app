-- ═══════════════════════════════════════════════════════════
-- 060_night_shift.sql
-- 夜勤打刻機能: clock_logs に is_night_shift カラムを追加
--  * is_night_shift : BOOLEAN NOT NULL DEFAULT false
--    - 出勤時に「夜勤」を選んだ打刻のみ true
--    - 既存レコード・日勤はすべて false（DEFAULT）
--  * information_schema.columns で存在確認してから追加（冪等）
-- ═══════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'clock_logs'
      AND column_name  = 'is_night_shift'
  ) THEN
    ALTER TABLE public.clock_logs
      ADD COLUMN is_night_shift BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
