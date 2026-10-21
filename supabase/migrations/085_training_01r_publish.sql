-- [2026-09-20] 社内研修①(training-01r) を全員に公開する（勝間さんの指示）。
--
--   ・試写モードを外す（preview_staff_ids を空に）→ 対象者全員に表示され、最低文字数も通常どおり効く
--   ・締切なし（deadline = NULL）。「明日確実に皆やるから期限はいらない」とのこと。
--       締切が無いので、未完了でもロックはかからない。「あとで書く」でいつでも閉じられる。
--   ・裕太(s6)は対象外にする。試写で入れたテスト回答と完了記録は消す（空欄の回答が一覧に残るため）。
--       対象外の人には研修タブも全画面も出ない。回答の確認は管理画面の研修タブで行う。
--
--   ※このファイルは pending/ に置いてある。公開する時に migrations/ へ移して db push する。

DELETE FROM public.training_responses   WHERE training_id = 'training-01r' AND staff_id = 's6';
DELETE FROM public.training_completions WHERE training_id = 'training-01r' AND staff_id = 's6';

UPDATE public.trainings
SET preview_staff_ids = '{}',
    exempt_staff_ids  = ARRAY['s5','s6'],   -- 管理者・裕太
    deadline          = NULL,
    active            = true
WHERE id = 'training-01r';
