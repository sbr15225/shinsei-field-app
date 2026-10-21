-- 030_field_photos_rls_fix.sql
-- field-photos バケットの INSERT を service_role のみに制限（anon アップロード防止）

DROP POLICY IF EXISTS "field_photos_insert" ON storage.objects;

CREATE POLICY "field_photos_insert" ON storage.objects
  FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'field-photos');

NOTIFY pgrst, 'reload schema';
