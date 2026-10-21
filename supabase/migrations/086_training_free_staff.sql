-- [2026-09-20] 研修を「見るだけの人」の枠を追加（free_staff_ids）。
--
--   入っている人は、研修が見えるが最低文字数の制限を受けず、管理画面の未完了者の母数にも入らない。
--   公開後に裕太(s6)が内容を確認するため（今回だけ）。preview_staff_ids との違いは、
--   preview は「入っている人にしか見えなくする」、free は「他の人への公開はそのまま」という点。
--   見終わったら free_staff_ids から外して exempt_staff_ids に戻せば、元の対象外に戻る。

ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS free_staff_ids TEXT[] NOT NULL DEFAULT '{}';

UPDATE public.trainings
SET free_staff_ids   = ARRAY['s6'],
    exempt_staff_ids = ARRAY['s5']
WHERE id = 'training-01r';

NOTIFY pgrst, 'reload schema';
