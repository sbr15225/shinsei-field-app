-- 053 全スタッフへ「通知をオンにして」お知らせ投稿（2026-06-29・勝間さん指示）
-- 目的: 打刻忘れ防止。アプリ起動時の未読ポップアップで全員に表示させる（read_by空で投稿）。
-- 注意: これはDB直挿入のためPush自体は飛ばない（未許可者には届かないので当然）。アプリ内ポップアップで周知する。
-- read_by の列型(text[] か jsonb)が環境により異なるため、型を判定して両対応で挿入する。

DO $$
DECLARE
  v_type text;
  v_text text := '【お願い】打刻忘れ防止のため、アプリの通知をオンにしてください。手順：①「打刻」画面のいちばん上にある「🔔Push通知を有効にする」ボタンを押す。②【iPhoneの方】先にSafari下の共有ボタンから「ホーム画面に追加」してアプリとして開いてから①を行ってください（Safariのタブのままだと通知が届きません）。これで出勤・退勤の打刻忘れに気づけるようになります。ご協力よろしくお願いします。';
BEGIN
  -- 既に同じお知らせがあれば二重投稿しない
  IF EXISTS (SELECT 1 FROM public.announcements WHERE id = 'ann_push_optin_20260629') THEN
    RETURN;
  END IF;

  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'read_by';

  IF v_type = 'ARRAY' THEN
    INSERT INTO public.announcements (id, author, role, text, created_at, read_by)
    VALUES ('ann_push_optin_20260629', '勝間', 'admin', v_text, now(), '{}'::text[]);
  ELSE
    INSERT INTO public.announcements (id, author, role, text, created_at, read_by)
    VALUES ('ann_push_optin_20260629', '勝間', 'admin', v_text, now(), '[]'::jsonb);
  END IF;
END $$;
