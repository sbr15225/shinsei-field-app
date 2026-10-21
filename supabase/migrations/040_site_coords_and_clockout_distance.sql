-- [2026-05-29] 現場座標と退勤打刻のズレ距離を記録するためのカラム追加
-- 目的: 退勤打刻が現場から1km以上離れている場合に警告し、距離を記録して管理画面で可視化する
-- 背景: スタッフが帰宅途中/車内/自宅で退勤打刻し、位置情報が実際の現場とズレる問題への対策

-- projects: 案件の現場住所を座標化して保存（国土地理院APIでgeocode）
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS site_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS site_lng DOUBLE PRECISION;

-- clock_logs: 退勤打刻時の「現場からの距離(m)」。基準が無い日はNULL
ALTER TABLE clock_logs
  ADD COLUMN IF NOT EXISTS out_distance_m INTEGER;
