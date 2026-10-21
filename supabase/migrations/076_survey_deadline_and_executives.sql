-- [2026-09-08] 幸せアンケートの締切延長と、役員の対象外し（勝間さん指示）
--
--   1) 締切を 9/8 → 9/9 に1日延ばす。
--      未回答者は締切日の翌日から打刻以外がロックされるため、
--      「明日までに回答を」と告知したうえで1日猶予を作る。
--
--   2) include_executives を false に戻す（075 で一度 true にしたもの）。
--      裕太さんは「内容確認のため一度だけ」対象にしたもので、確認が取れたため外す。
--      これで役員（裕太・吉郎）が対象から外れ、残る対象は 川畑・小野・廣野 の3名。
--      川畑さんは回答済みなのでロック対象にならず、実質の未回答者は 小野・廣野 の2名。
--
--   管理者(s5)は 075 で staff.survey_exempt=true にしてあるため恒久的に対象外。
--   大塚さん(s2)は 074 の exempt_staff_ids でこのアンケートのみ免除。どちらもここでは触らない。
--
--   回答・設問・レコードは一切消さない。締切を戻したい場合は deadline を書き換えるだけでよい。

UPDATE public.surveys
SET deadline = '2026-09-09'
WHERE title = '幸せと働き方について';

UPDATE public.surveys
SET include_executives = false
WHERE title = '幸せと働き方について';

-- 確認用（実行後に対象設定を目視する）
--   SELECT title, active, deadline, include_executives, exempt_staff_ids
--     FROM public.surveys WHERE title = '幸せと働き方について';
