-- Fix Duplicate Admin and Sales Configurations
-- This script removes any old configuration rows and updates the login functions
-- to only verify the password (since the username field was removed from the UI)

-- 1. Remove duplicate rows in admin_config
DELETE FROM public.admin_config 
WHERE id NOT IN (
    SELECT id FROM public.admin_config 
    ORDER BY updated_at DESC 
    LIMIT 1
);

-- 2. Remove duplicate rows in sales_config
DELETE FROM public.sales_config 
WHERE id NOT IN (
    SELECT id FROM public.sales_config 
    ORDER BY updated_at DESC 
    LIMIT 1
);

-- 3. Update the admin login verification to only check the password
CREATE OR REPLACE FUNCTION verify_admin_login(p_username text, p_password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_config
    WHERE password_hash = p_password
  );
END; $$;

-- 4. Update the sales login verification to only check the password
CREATE OR REPLACE FUNCTION verify_sales_login(p_username text, p_password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.sales_config
    WHERE password_hash = p_password
  );
END; $$;
