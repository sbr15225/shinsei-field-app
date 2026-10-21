-- migration 028: staff_public view に is_executive カラムを追加
-- [2026-05-07] Codex レビュー指摘 #7
-- 経緯: 2026-04-24 に staff.is_executive を追加したが、staff_public view を再作成し忘れていた。
--       shared.js は staff_public 経由で is_executive を読むが view に存在せず、
--       全員 isExecutive=false 扱いとなり「役員=裕太」のフラグが効いていなかった。
--       admin.html の打刻忘れ通知除外 / user.html の打刻タブ非表示 等が機能しない原因。

DROP VIEW IF EXISTS staff_public;
CREATE VIEW staff_public
  WITH (security_invoker = false)
  AS SELECT id, name, role, daily_rate, is_executive, created_at FROM staff;

-- anon に VIEW への SELECT を許可（既存と同じ）
GRANT SELECT ON staff_public TO anon;
