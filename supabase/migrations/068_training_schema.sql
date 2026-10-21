-- [2026-09-05] 社内研修①「考えることが出来る職人になる」のスキーマ。
--
--   アンケート(surveys)と分けた理由:
--     アンケートは「1問1答を集める」だけだが、研修は 設問→回答→解説 の順送りで、
--     どこまで進んだか(current_index)と完了したか(training_completions)を持つ必要がある。
--     surveys に列を足していくと、期限判定や強制モーダルの条件がアンケートと絡んで読めなくなる。
--
--   アクセス方針: anon には一切権限を与えない。読み書きはすべて api-gateway(service_role) の
--     専用アクション経由。migration 057/062/063 で anon の SELECT/INSERT/UPDATE/DELETE を
--     全テーブルから剥奪済みなので、新規テーブルも同じ方針を最初から適用する。

-- ── 研修そのもの ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.trainings (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  intro       TEXT,                       -- 導入画面の本文
  outro       TEXT,                       -- 全問完了後の締めメッセージ
  deadline    TIMESTAMPTZ,                -- 締切（時刻まで持つ。NULL=期限なし）
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 設問 ────────────────────────────────────
--   code は "Q1-1" 形式。sort_order で並べる（code の文字列順では Q10 が Q2 より前に来るため）。
--   explanation が NULL または空文字 = 模範解答なし（Q1-2 と Q8-1〜Q8-4）。
CREATE TABLE IF NOT EXISTS public.training_questions (
  id            TEXT PRIMARY KEY,
  training_id   TEXT NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,            -- "Q1-1"
  section       TEXT NOT NULL,            -- "Q1 保温工事の基本"
  sort_order    INTEGER NOT NULL,
  text          TEXT NOT NULL,            -- 設問文
  note          TEXT,                     -- ※ヒント
  explanation   TEXT,                     -- ポイント（解説）。NULL/空 = 模範解答なし
  no_answer_msg TEXT,                     -- 模範解答なしの時に出す一言
  min_chars     INTEGER NOT NULL DEFAULT 20,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_training_questions_order
  ON public.training_questions(training_id, sort_order);

-- ── 回答 ────────────────────────────────────
--   1人1問1レコード。書き直しは UPDATE（UNIQUE制約で担保）。
--   answer は入力途中でも保存する（自動保存）。confirmed = 「次へ」を押して確定したか。
CREATE TABLE IF NOT EXISTS public.training_responses (
  id           TEXT PRIMARY KEY,
  training_id  TEXT NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  question_id  TEXT NOT NULL REFERENCES public.training_questions(id) ON DELETE CASCADE,
  staff_id     TEXT NOT NULL,
  staff_name   TEXT NOT NULL DEFAULT '',
  answer       TEXT NOT NULL DEFAULT '',
  confirmed    BOOLEAN NOT NULL DEFAULT false,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_training_responses_uniq
  ON public.training_responses(question_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_training_responses_staff
  ON public.training_responses(training_id, staff_id);

-- ── 完了記録 ────────────────────────────────
--   全問 confirmed になった時点で1行入る。これがある人はロック対象外。
CREATE TABLE IF NOT EXISTS public.training_completions (
  id           TEXT PRIMARY KEY,
  training_id  TEXT NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  staff_id     TEXT NOT NULL,
  staff_name   TEXT NOT NULL DEFAULT '',
  completed_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_training_completions_uniq
  ON public.training_completions(training_id, staff_id);

-- ── 権限 ────────────────────────────────────
--   RLS を有効化し、ポリシーは作らない＝anon/authenticated からは読めも書けもしない。
--   service_role は RLS をバイパスするので api-gateway だけが触れる。
ALTER TABLE public.trainings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_responses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_completions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.trainings            FROM anon, authenticated;
REVOKE ALL ON public.training_questions   FROM anon, authenticated;
REVOKE ALL ON public.training_responses   FROM anon, authenticated;
REVOKE ALL ON public.training_completions FROM anon, authenticated;
