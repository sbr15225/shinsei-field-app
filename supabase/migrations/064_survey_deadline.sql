-- [2026-07-21] アンケートに回答期限（deadline）を追加
-- NULL = 期限なし（従来通り、未回答なら即・強制モーダル）
-- 期限あり = 期限日まで回答は任意（ログイン時ポップアップのみ）、期限日を過ぎると強制モーダル
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS deadline DATE;
