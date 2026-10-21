-- ============================================================
-- PIN照合用のDB関数 (bcrypt)
-- Edge Function (auth-pin) から呼ばれる
-- ============================================================

CREATE OR REPLACE FUNCTION verify_pin(input_pin TEXT, stored_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN stored_hash = crypt(input_pin, stored_hash);
END;
$$;

-- anon からは呼べないようにする（service_role 専用）
REVOKE EXECUTE ON FUNCTION verify_pin FROM anon;
REVOKE EXECUTE ON FUNCTION verify_pin FROM authenticated;
GRANT EXECUTE ON FUNCTION verify_pin TO service_role;
