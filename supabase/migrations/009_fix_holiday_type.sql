-- 009_fix_holiday_type.sql
-- 既存のleavesレコード（type='holiday'かつholiday_type=null）を
-- 日付から曜日・季節を判定して一括補正する
-- 実行日: 2026-04-15

UPDATE leaves
SET holiday_type = CASE
  WHEN EXTRACT(DOW FROM date::date) = 0                                        THEN 'sunday'
  WHEN EXTRACT(DOW FROM date::date) = 6                                        THEN 'saturday'
  WHEN EXTRACT(MONTH FROM date::date) = 8
   AND EXTRACT(DAY  FROM date::date) BETWEEN 13 AND 16                         THEN 'obon'
  WHEN EXTRACT(MONTH FROM date::date) = 12
   AND EXTRACT(DAY  FROM date::date) >= 30                                     THEN 'newyear'
  WHEN EXTRACT(MONTH FROM date::date) = 1
   AND EXTRACT(DAY  FROM date::date) <= 3                                      THEN 'newyear'
  ELSE NULL
END
WHERE type = 'holiday'
  AND holiday_type IS NULL;
