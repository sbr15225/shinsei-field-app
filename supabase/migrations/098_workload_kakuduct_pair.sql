-- 098_workload_kakuduct_pair.sql
-- [2026-10-09] 角ダクトは2人1組で作業するので、「2人1組で1日の数量」で入れてもらう（1人あたりは÷2で使う）
UPDATE workload_norms SET notes = '2人1組で1日の数量'
WHERE grp = '角ダクト' AND is_preset = true AND notes = '';
