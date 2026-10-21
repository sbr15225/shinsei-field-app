-- [2026-09-20] 社内研修①を一旦非公開にする（勝間さんの指示）。
--
--   設問が当初から変わりすぎていて、ポイント(解説)と噛み合わなくなったため。
--   内容を見直してから再公開する。
--
--   active=false にすると training_get が null を返し、クライアント側は
--   研修タブ・全画面モーダル・締切ロックのどれも出さない。
--   設問・回答(training_responses)は消さない。再公開は active=true に戻すだけ。
--   再公開時は締切(deadline)も引き直すこと（078 のコメント参照）。

UPDATE public.trainings
SET active = false
WHERE id = 'training-01';
