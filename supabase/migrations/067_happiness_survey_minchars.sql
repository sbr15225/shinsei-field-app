-- [2026-09-04] 幸せアンケートの各設問に最低文字数(30文字)を設定する。
--
--   設問ごとの属性(minChars)として持たせ、アプリ全体の一律ルールにはしない。
--   一律にすると「希望する休みの日程（例：8/13〜8/16）」のような、短くて正しい回答を求める
--   設問（065のお盆調査など）が送信できなくなるため。minChars 未設定 = 従来通り1文字以上でOK。
--
--   既存の回答（川畑さん・119文字）はこの制限の影響を受けない。
--   検証は送信時にだけ走るので、回答済みレコードは書き換わらない。

UPDATE surveys
SET questions = (
  SELECT jsonb_agg(q || '{"minChars":30}'::jsonb ORDER BY ord)
  FROM jsonb_array_elements(questions) WITH ORDINALITY AS t(q, ord)
)
WHERE title = '幸せと働き方について';
