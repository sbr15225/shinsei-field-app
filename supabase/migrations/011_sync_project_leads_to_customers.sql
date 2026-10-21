-- 011: 既存projectsのlead(顧客名)で、customersテーブルに未登録のものを補完
-- [2026-04-15] 顧客管理タブで案件側の顧客が表示されない問題対応
-- (本来 lead は自由文字列だが、UX的には顧客マスタに自動同期しておきたい)

INSERT INTO customers (id, name, created_at)
SELECT gen_random_uuid()::text, lead, NOW()
FROM (
  SELECT DISTINCT lead FROM projects
  WHERE lead IS NOT NULL AND lead != ''
    AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.name = projects.lead)
) AS missing;
