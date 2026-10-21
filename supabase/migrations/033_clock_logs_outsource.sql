-- [2026-05-14] 退勤時の外注情報入力対応
-- outsource_type: NULL（外注なし）/ 'support'（応援）/ 'subcontract'（請負）
-- outsource_count: 外注人数
-- outsource_amount: 金額。応援は 30000×count を保存、請負は NULL（後で管理者が入力）
ALTER TABLE clock_logs
  ADD COLUMN IF NOT EXISTS outsource_type TEXT,
  ADD COLUMN IF NOT EXISTS outsource_count INTEGER,
  ADD COLUMN IF NOT EXISTS outsource_amount INTEGER;
