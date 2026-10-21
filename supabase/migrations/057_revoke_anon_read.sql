-- migration 057: anon ロールからの SELECT 権限を剥奪（全読み取りを認証必須化・③完全版）
--
-- 経緯: 2026-07-09 セキュリティ監査。従来フロントは公開 anon キーで直接 PostgREST を叩いて
--   各テーブルを読んでおり、ログインしていない第三者でも clock_logs（GPS・勤務時間）・
--   contacts（連絡先）等を読めた。フロントの読み取りを api-gateway の rest_read
--   （service_role・セッション認証必須）へ全面移行したうえで、anon の SELECT 権限自体を剥奪する。
--
-- 方式: RLS ポリシーの個別 DROP は取りこぼしリスクが高いため、GRANT 階層で REVOKE する。
--   テーブル権限が無ければ RLS ポリシーの許可に関わらず anon は SELECT できない。
--   service_role はこの REVOKE の影響を受けない（別ロール・full 権限）ため gateway 経由の読み取りは継続。
--
-- ⚠️ 適用順序: 必ず「api-gateway(rest_read) と 新フロント(sb() 経由化) を本番反映し、
--   アプリが全データを正常に表示することを確認した後」に適用すること。
--   逆順で適用するとアプリ全体が読めなくなる。
--
-- 復旧（元に戻す場合）: 末尾のコメント参照。

REVOKE SELECT ON
  projects, entries, clock_logs, leaves, handover_memos, announcements, customers,
  attachments, clock_modifications, expense_items, subcontractors, additional_works,
  additional_estimates, contacts, leave_balances, project_expenses, company_info,
  surveys, survey_responses, ai_chat_logs, vehicles, vehicle_troubles, vehicle_oil_changes,
  invoice_uploads, material_costs, app_settings, annual_backups, project_specs,
  progress_reports, instagram_settings
FROM anon;

-- PIN を隠すための staff_public ビューも anon から剥奪（日給は 056 で既に列除外済み）
REVOKE SELECT ON staff_public FROM anon;

-- ── 復旧用（万一アプリが読めなくなったら以下を実行して即時ロールバック）────────────
-- GRANT SELECT ON
--   projects, entries, clock_logs, leaves, handover_memos, announcements, customers,
--   attachments, clock_modifications, expense_items, subcontractors, additional_works,
--   additional_estimates, contacts, leave_balances, project_expenses, company_info,
--   surveys, survey_responses, ai_chat_logs, vehicles, vehicle_troubles, vehicle_oil_changes,
--   invoice_uploads, material_costs, app_settings, annual_backups, project_specs,
--   progress_reports, instagram_settings
-- TO anon;
-- GRANT SELECT ON staff_public TO anon;
