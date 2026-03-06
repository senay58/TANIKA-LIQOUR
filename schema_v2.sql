-- Create a table for Admin Configuration (Custom Auth approach)
CREATE TABLE public.admin_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL,
  password_hash text NOT NULL, -- in production, should be hashed (e.g. bcrypt). Here storing raw/simple for MVP demo as per constraints.
  secret_code_hash text NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert initial default admin credentials
-- Username: admin
-- Password: password123
-- Secret: 123456
INSERT INTO public.admin_config (username, password_hash, secret_code_hash) 
VALUES ('admin', 'password123', '123456');

-- Update old RLS policies to be secure (blocking everything unless it's a known admin operation via custom RPC or we just use RLS with an auth token check)

-- Since we are using Custom Auth without Supabase's built-in Auth Session token, standard `auth.uid()` checks wont work for RLS.
-- Approach: If security is paramount, we should switch the Supabase Project to block public access, and in our React App, we send an HTTP header with our custom token, OR we use Supabase standard Auth in the background (anonymous user holding a custom JWT).
-- Given this is an MVP without backend server: Let's create an RPC function to verify credentials. RLS on `admin_config` should absolutely block SELECT to the public.

ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
-- Completely block public from reading the table directly to prevent credential scraping
CREATE POLICY "Block public read admin_config" ON public.admin_config FOR SELECT USING (false);

-- RPC for verifying password login
CREATE OR REPLACE FUNCTION verify_admin_login(p_username text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- runs as postgres role, bypassing RLS to check the table
AS $$
DECLARE
  is_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM admin_config
    WHERE username = p_username AND password_hash = p_password
  ) INTO is_valid;
  RETURN is_valid;
END;
$$;

-- RPC for verifying secret code login
CREATE OR REPLACE FUNCTION verify_admin_secret(p_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM admin_config
    WHERE secret_code_hash = p_secret
  ) INTO is_valid;
  RETURN is_valid;
END;
$$;

-- RPC to update credentials
CREATE OR REPLACE FUNCTION update_admin_credentials(p_username text, p_password text, p_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_config
  SET username = p_username,
      password_hash = p_password,
      secret_code_hash = p_secret,
      updated_at = now()
  WHERE id = (SELECT id FROM admin_config LIMIT 1);
  RETURN true;
END;
$$;

-- To truly lock down the other tables natively in Supabase without using its own JWTs, one might need a server middleware. 
-- Since this is purely frontend-to-Supabase, we rely on the React App to block the UI. 
-- For a higher tier of security, you would move to Supabase's native auth (Email/PW) combined with anon-disabling RLS. 
-- The user explicitly asked for "secret code" login without a password which breaks standard Auth models. So UI masking + RPCs are the solution for this architecture.
