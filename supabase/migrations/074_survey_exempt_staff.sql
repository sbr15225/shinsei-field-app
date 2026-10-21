-- [2026-09-06] アンケートごとの回答免除リスト。
--
--   大塚さん(s2)を幸せアンケートの対象から外す。
--   is_executive を立てる方法は取らない。あのフラグは push通知・強制進捗報告・
--   未退勤の強制解消モーダル・強制アンケートまで一括で外すので、副作用が大きすぎる。
--   「このアンケートだけ免除」を表現できる箇所が無かったので列を足す。
--
--   免除された人は、全画面モーダルも出ず、締切後のロック対象にもならず、
--   管理者画面の回答率の母数からも外れる。

ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS exempt_staff_ids TEXT[] NOT NULL DEFAULT '{}';

UPDATE public.surveys
SET exempt_staff_ids = ARRAY['s2']
WHERE title = '幸せと働き方について';
