-- 029_field_photos.sql
-- 引継ぎメモ・追加工事に写真添付カラム追加 + Storage バケット作成

-- handover_memos に画像URL
ALTER TABLE handover_memos ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

-- additional_works に画像URL
ALTER TABLE additional_works ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

-- 写真保存用 Storage バケット（公開読み取り可）
INSERT INTO storage.buckets (id, name, public)
VALUES ('field-photos', 'field-photos', true)
ON CONFLICT (id) DO NOTHING;

-- field-photos バケットの RLS: 認証済みユーザーのみアップロード可、全員読み取り可
CREATE POLICY "field_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'field-photos');

CREATE POLICY "field_photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'field-photos');

NOTIFY pgrst, 'reload schema';
