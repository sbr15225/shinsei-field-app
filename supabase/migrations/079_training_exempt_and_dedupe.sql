-- [2026-09-20] 研修の対象者と設問の調整2件。
--
--   1) 管理者(s5)を研修の対象外にする。アンケートの exempt_staff_ids(074) と同じ形にそろえる。
--      staff.survey_exempt はアンケート専用の意味で作ったので、研修に流用せず研修側に持たせる。
--
--   2) Q9-12「あなたにとっての幸せは何ですか」と Q9-13「どんな感情の時が一番幸せか」を外す。
--      9月の幸せアンケートと同じ設問で、川畑さん・廣野さん・小野さんは既に回答済みのため。
--      DELETE はしない。training_responses が question_id を ON DELETE CASCADE で参照しており、
--      もし回答が入っていたら一緒に消えるため。active=false で隠すだけにして、戻せるようにする。

-- ── 1) 研修の対象外リスト ──
ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS exempt_staff_ids TEXT[] NOT NULL DEFAULT '{}';

UPDATE public.trainings
SET exempt_staff_ids = ARRAY['s5']          -- 管理者
WHERE id = 'training-01';

-- ── 2) 設問の有効/無効 ──
ALTER TABLE public.training_questions
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

UPDATE public.training_questions
SET active = false
WHERE id IN ('tq-9-12', 'tq-9-13');

-- 導入文の問数を実数に合わせる（28問 → 26問）
UPDATE public.trainings
SET intro = replace(intro, '全28問あります。', '全26問あります。')
WHERE id = 'training-01';

NOTIFY pgrst, 'reload schema';
