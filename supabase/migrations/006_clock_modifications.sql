-- v16: 打刻修正機能
-- clock_modifications テーブル（申請・直接編集の両方を記録）

CREATE TABLE IF NOT EXISTS clock_modifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('edit', 'new', 'admin_edit', 'admin_new')),
  clock_log_id TEXT,                    -- 修正対象の既存ログID（newの場合はNULL）
  user_id TEXT NOT NULL,                -- 対象スタッフID
  user_name TEXT NOT NULL,              -- 対象スタッフ名
  project_id TEXT,                      -- 案件ID
  project_name TEXT,                    -- 案件名
  original_clock_in TIMESTAMPTZ,        -- 修正前の出勤時刻
  original_clock_out TIMESTAMPTZ,       -- 修正前の退勤時刻
  requested_clock_in TIMESTAMPTZ,       -- 修正後の出勤時刻
  requested_clock_out TIMESTAMPTZ,      -- 修正後の退勤時刻
  reason TEXT NOT NULL DEFAULT '',       -- 修正理由
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  requested_by TEXT NOT NULL,           -- 申請者ID（スタッフ本人 or 管理者）
  reviewed_by TEXT,                     -- 承認/却下した管理者名
  reviewed_at TIMESTAMPTZ,             -- 承認/却下日時
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE clock_modifications ENABLE ROW LEVEL SECURITY;

-- anonはSELECTのみ（既存パターンに合わせる）
CREATE POLICY "anon_select_clock_modifications" ON clock_modifications
  FOR SELECT TO anon USING (true);

-- service_roleは全操作可能（api-gateway経由）
