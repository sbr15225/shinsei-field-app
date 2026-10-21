-- [2026-07-21] お盆休み希望調査アンケートを作成（回答期限 2026-07-31 = 期限内は任意回答）
-- 期限機能(migration 064)の初回利用。勝間さん依頼:「家族との話し合いの時間を持たせたい」
INSERT INTO surveys (id, title, questions, active, deadline)
VALUES (
  gen_random_uuid()::text,
  'お盆休みの希望調査',
  '[
    {"text":"希望する休みの日程を教えてください（例：8/13〜8/16）","type":"text","options":[]},
    {"text":"上記以外で出勤できない日があれば教えてください（なければ「なし」）","type":"text","options":[]}
  ]'::jsonb,
  true,
  '2026-07-31'
);
