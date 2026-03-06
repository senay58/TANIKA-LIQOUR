-- CRITICAL PATCH: Fixes "update requires a WHERE clause" on admin config
CREATE OR REPLACE FUNCTION update_admin_credentials(p_username text, p_password text, p_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- We must use a WHERE clause here to satisfy PostgREST safe updates
  UPDATE admin_config
  SET username = p_username,
      password_hash = p_password,
      secret_code_hash = p_secret,
      updated_at = now()
  WHERE id = (SELECT id FROM admin_config LIMIT 1);
  RETURN true;
END;
$$;
