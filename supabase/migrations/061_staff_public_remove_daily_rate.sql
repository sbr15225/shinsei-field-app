-- [2026-07-14] 旧056から061へリネーム（056_hironoと番号重複しschema_migrationsのPK衝突でpush不可のため。内容は2026-07-09にSQL Editorで手動適用済み・冪等）
-- migration 056: staff_public ビューから daily_rate（日給）を除外
--
-- 経緯: 2026-07-09 セキュリティ監査。staff_public は anon が SELECT でき、
--   フロントの公開anonキーを知る第三者に全スタッフの日給が読めていた。
--   日給は給与情報のため admin 限定にすべき値。user.jsx は dailyRate を
--   一切使っておらず、admin のみが人件費計算・単価編集で使用する。
--   → ビューから daily_rate を外し、admin は api-gateway の list_staff_rates
--     アクション（admin検証あり・service_role経由）で取得する方式に変更。
--
-- 注意: 028 で is_executive を追加済み。列構成を維持したまま daily_rate のみ除外する。

DROP VIEW IF EXISTS staff_public;
CREATE VIEW staff_public
  WITH (security_invoker = false)
  AS SELECT id, name, role, is_executive, created_at FROM staff;

-- anon に VIEW への SELECT を許可（028 と同じ。daily_rate は含まれない）
GRANT SELECT ON staff_public TO anon;
