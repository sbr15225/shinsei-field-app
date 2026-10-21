-- [2026-09-06] アンケート対象者の調整2件。
--
--   1) 管理者(s5)を全アンケートから恒久的に外す。
--      「このアンケートだけ免除」の exempt_staff_ids(074) ではなく、スタッフ側の属性にする。
--      今後作るアンケートでも毎回 s5 を書き足す運用になると、いつか忘れるため。
--
--   2) 幸せアンケートに限り役員(裕太)も対象にする。内容確認のため一度だけ流す。
--      研修の include_executives(071) と同じ考え方で、アンケート単位のフラグにする。
--      既定は false なので、次に作るアンケートは従来どおり役員除外のまま。

-- ── 1) スタッフ単位の恒久除外 ──
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS survey_exempt BOOLEAN NOT NULL DEFAULT false;

UPDATE public.staff SET survey_exempt = true WHERE id = 's5';   -- 管理者

-- staff_public に survey_exempt を追加して作り直す。
-- ⚠️ 063 の指示どおり、末尾に `GRANT SELECT ON staff_public TO anon` は付けない。
--    アプリは api-gateway の rest_read(service_role) 経由で読むので anon 権限は不要。
DROP VIEW IF EXISTS staff_public;
CREATE VIEW staff_public
  WITH (security_invoker = false)
  AS SELECT id, name, role, is_executive, survey_exempt, created_at FROM staff;

-- ── 2) アンケート単位の役員参加フラグ ──
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS include_executives BOOLEAN NOT NULL DEFAULT false;

UPDATE public.surveys
SET include_executives = true
WHERE title = '幸せと働き方について';

NOTIFY pgrst, 'reload schema';
