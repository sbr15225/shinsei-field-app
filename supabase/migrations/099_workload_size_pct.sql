-- 099_workload_size_pct.sql
-- [2026-10-09] 人工目安の入れ方を変更：まん中のサイズの1日の数量（per_man_day）＋
--   小さいサイズ側・大きいサイズ側で「まん中より何%進むか」（+なら多く進む、−なら進まない）
--   per_man_day_easy / per_man_day_hard は使わない（列は残す）
ALTER TABLE workload_norms
  ADD COLUMN IF NOT EXISTS pct_small NUMERIC,
  ADD COLUMN IF NOT EXISTS pct_large NUMERIC;
