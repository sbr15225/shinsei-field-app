-- 097_workload_memo.sql
-- [2026-10-09] 人工目安タブの最後に「補足」欄（自由記述）。notes に保存する専用の1行。
INSERT INTO workload_norms (id, grp, category, size_spec, unit, per_man_day, notes, sort_order, is_preset)
VALUES ('wn-preset-memo', '補足', '補足（ほかの工事・気づいたこと）', '', '', NULL, '', 999, true)
ON CONFLICT (id) DO NOTHING;
