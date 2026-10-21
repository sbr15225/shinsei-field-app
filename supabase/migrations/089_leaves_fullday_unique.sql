-- [2026-09-24] 丸一日休む種別を、同一スタッフ・同一日で1件までにするDB制約。
--
--   027 の leaves_active_unique は (staff_id, date, type) なので、有給と振休のように
--   種別が違うと通ってしまう。画面と api-gateway は v214 で直したが、
--   直接SQLや将来の新しい経路から入るのを防げないため、DB側にも制約を置く。
--
--   027 の索引はそのまま残す。休日出勤(holiday)・遅刻早退(late)の同種別重複は
--   引き続きそちらが弾く（これらは「休む」ではないので下の排他グループには入れない）。
--
--   既存の重複（大塚さん 2026-09-04）は 088 で解消済み。残っていると索引作成が失敗する。

CREATE UNIQUE INDEX IF NOT EXISTS leaves_fullday_unique
  ON public.leaves(staff_id, date)
  WHERE status IN ('申請中', '承認')
    AND type IN ('paid', 'furikae', 'special', 'absence');
