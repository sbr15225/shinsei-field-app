-- [2026-04-29] 同一スタッフ・同一日付・同一種別の重複申請を DB レベルで防止
-- 「申請中」「承認」状態のみを対象とする部分ユニークインデックス
-- 「却下」「取消」されたレコードは履歴として残し、再申請できるよう制約対象外
CREATE UNIQUE INDEX IF NOT EXISTS leaves_active_unique
  ON leaves(staff_id, date, type)
  WHERE status IN ('申請中', '承認');
