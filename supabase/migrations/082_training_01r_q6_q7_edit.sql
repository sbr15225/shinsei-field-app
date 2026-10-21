-- [2026-09-20] 社内研修①(training-01r) の解説を勝間さんの指示で修正。文章は指示の原文ママ。
--
--   Q6（10問目）: 2か所を差し替え
--   Q7（11問目）: 解説を丸ごと差し替え
--   あわせて、試写中(s6)の回答を全問「確定」に直す。
--     自動保存が確定を上書きする不具合で、全問答えても完了できなくなっていたため
--     （不具合そのものは api-gateway と user.jsx で修正済み）。

-- ── Q6 その1 ──
UPDATE public.training_questions
SET explanation = replace(explanation,
  $t$売上に対して数％程度になる会社も多くあります。$t$,
  $t$売上に対して4〜7%程度の会社がほとんどです。$t$)
WHERE id = 'tr-6';

-- ── Q6 その2 ──
UPDATE public.training_questions
SET explanation = replace(explanation,
$t$重要なのは、
「100万円売ったら何十万円も自由に残る」
という単純な商売ではないということです。$t$,
$t$「100万円売ったら何十万円も手元に残る」ということではないのです。

最後に税金で純粋な儲けの30%ほどがなくなり、その後に消費税を払い、更に今年の売り上げの同程度の税金を先に納税する義務があります。

会社の事情にはなりますが、皆さんのご協力と理解があると大変嬉しい限りです。$t$)
WHERE id = 'tr-6';

-- ── Q7 丸ごと ──
UPDATE public.training_questions
SET explanation =
$t$1人工=日当ではなく
原価、労務費、経費などがかかります。

現場を予定人工より人工がかからなければお金は残ります。

100万で20人工=5万
100万で16人工=6.25万

このチリ積の世界をシビアにやれるかが鍵になります。

アプリの数字は全てを俯瞰した上で、少しシビアに設定してるので、目安にしてもらえると嬉しいです。$t$
WHERE id = 'tr-7';

-- 差し替えが実際に効いたことを確認（効いていなければここで止まり、何も反映されない）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.training_questions WHERE id='tr-6'
       AND explanation LIKE '%4〜7%程度の会社がほとんどです%'
       AND explanation LIKE '%皆さんのご協力と理解があると大変嬉しい限りです%'
       AND explanation NOT LIKE '%自由に残る%') THEN
    RAISE EXCEPTION 'Q6 の差し替えが効いていません';
  END IF;
END $$;

-- ── 試写(s6)の回答を確定に直す ──
UPDATE public.training_responses
SET confirmed = true
WHERE training_id = 'training-01r' AND staff_id = 's6';
