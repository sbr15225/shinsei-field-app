-- [2026-09-20] 社内研修①(training-01r) Q6 解説の中間納付の言い回しを修正（勝間さん了承）。
--
--   「今年の売り上げの同程度の税金を先に納税」だと「売上と同じ額を税金で払う」と読めてしまう。
--   実際の中間納付は、前の期の税額の約半分を先に納めるもの。変えるのはこの一節だけ。

UPDATE public.training_questions
SET explanation = replace(explanation,
  $t$更に今年の売り上げの同程度の税金を先に納税する義務があります。$t$,
  $t$更に来年の税金の一部（今年の税額の半分ほど）を先に納税する義務があります。$t$)
WHERE id = 'tr-6';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.training_questions WHERE id='tr-6'
       AND explanation LIKE '%今年の税額の半分ほど%'
       AND explanation NOT LIKE '%売り上げの同程度%') THEN
    RAISE EXCEPTION 'Q6 の差し替えが効いていません';
  END IF;
END $$;
