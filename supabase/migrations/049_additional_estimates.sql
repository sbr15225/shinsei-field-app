-- 049 追加見積（案件レベル）テーブル新規作成（2026-06-16・勝間さん指示）
-- 用途: 1案件に「追加見積」を何件でも登録。各行は 名前(外注会社名等)・概算・受注額。
--       受注額(contract_amount)の合計を projects.subcontract_cost(外注費) に自動反映する。
--       → 外注費の二重入力が不要になる。人工換算は 受注額合計 ÷ 70000 を切り上げ(管理者UIで計算)。
-- 注意: subcontract_cost への反映は api-gateway 側 recalcSubcontractCost() が
--       insert/update/delete のたびに SUM(contract_amount) で再計算して書き込む。
CREATE TABLE IF NOT EXISTS public.additional_estimates (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,            -- 外注会社名など
  estimated_amount INTEGER,                  -- 概算(円)
  contract_amount  INTEGER,                  -- 受注額(円) ← 合計が外注費に反映される
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- 案件IDでの取得を速くする
CREATE INDEX IF NOT EXISTS idx_additional_estimates_project_id
  ON public.additional_estimates(project_id);
