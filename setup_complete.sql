-- ==============================================================================
-- TANIKA LIQUOUR - COMPLETE DATABASE SETUP
-- ==============================================================================
-- This script reconstructs the entire database structure, including tables,
-- initial data, security policies, triggers, and RPC functions.
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  emoji text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Insert Initial Categories
INSERT INTO public.categories (name, emoji) VALUES
  ('Whiskey', '🥃'),
  ('Vodka', '🍸'),
  ('Gin', '🫒'),
  ('Rum', '🏴‍☠️'),
  ('Tequila', '🌵'),
  ('Wine', '🍷'),
  ('Beer', '🍺'),
  ('Brandy', '🥂'),
  ('Liqueur', '🍹')
ON CONFLICT (name) DO NOTHING;

-- 4. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE RESTRICT,
  brand text NOT NULL,
  price_in numeric(10, 2) NOT NULL,
  price_out numeric(10, 2) NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  volume text NOT NULL,
  image_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Sales History Table
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL,
  price_at_sale numeric(10, 2) NOT NULL,
  description text,
  customer_info text,
  is_reversed boolean DEFAULT false,
  sale_date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Admin Configuration Table (Custom Auth)
CREATE TABLE IF NOT EXISTS public.admin_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL,
  password_hash text NOT NULL,
  secret_code_hash text NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Insert Default Admin Credentials
-- Username: admin | Password: password123 | Secret: 123456
INSERT INTO public.admin_config (username, password_hash, secret_code_hash) 
VALUES ('admin', 'password123', '123456')
ON CONFLICT DO NOTHING;

-- 8. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type VARCHAR(50) NOT NULL, 
    entity_id UUID, 
    entity_name VARCHAR(255),
    details JSONB, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Enable Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies (Allowing anon access for flexibility as per current app design)
DO $$ 
BEGIN
    -- Categories
    DROP POLICY IF EXISTS "Allow anon read access on categories" ON public.categories;
    CREATE POLICY "Allow anon read access on categories" ON public.categories FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow anon write access on categories" ON public.categories;
    CREATE POLICY "Allow anon write access on categories" ON public.categories FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon update access on categories" ON public.categories;
    CREATE POLICY "Allow anon update access on categories" ON public.categories FOR UPDATE USING (true);
    DROP POLICY IF EXISTS "Allow anon delete access on categories" ON public.categories;
    CREATE POLICY "Allow anon delete access on categories" ON public.categories FOR DELETE USING (true);

    -- Products
    DROP POLICY IF EXISTS "Allow anon read access on products" ON public.products;
    CREATE POLICY "Allow anon read access on products" ON public.products FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow anon write access on products" ON public.products;
    CREATE POLICY "Allow anon write access on products" ON public.products FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon update access on products" ON public.products;
    CREATE POLICY "Allow anon update access on products" ON public.products FOR UPDATE USING (true);
    DROP POLICY IF EXISTS "Allow anon delete access on products" ON public.products;
    CREATE POLICY "Allow anon delete access on products" ON public.products FOR DELETE USING (true);

    -- Sales
    DROP POLICY IF EXISTS "Allow anon read access on sales" ON public.sales;
    CREATE POLICY "Allow anon read access on sales" ON public.sales FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow anon write access on sales" ON public.sales;
    CREATE POLICY "Allow anon write access on sales" ON public.sales FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow anon update access on sales" ON public.sales;
    CREATE POLICY "Allow anon update access on sales" ON public.sales FOR UPDATE USING (true);
    DROP POLICY IF EXISTS "Allow anon delete access on sales" ON public.sales;
    CREATE POLICY "Allow anon delete access on sales" ON public.sales FOR DELETE USING (true);

    -- Admin Config (Strictly Block Reading Directly)
    DROP POLICY IF EXISTS "Block public read admin_config" ON public.admin_config;
    CREATE POLICY "Block public read admin_config" ON public.admin_config FOR SELECT USING (false);

    -- Audit Logs
    DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
    CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (true);
END $$;

-- 11. RPC functions for Admin Auth
CREATE OR REPLACE FUNCTION verify_admin_login(p_username text, p_password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE is_valid boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM admin_config WHERE username = p_username AND password_hash = p_password) INTO is_valid;
  RETURN is_valid;
END; $$;

CREATE OR REPLACE FUNCTION verify_admin_secret(p_secret text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE is_valid boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM admin_config WHERE secret_code_hash = p_secret) INTO is_valid;
  RETURN is_valid;
END; $$;

CREATE OR REPLACE FUNCTION update_admin_credentials(p_username text, p_password text, p_secret text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE admin_config SET username = p_username, password_hash = p_password, secret_code_hash = p_secret, updated_at = now()
  WHERE id = (SELECT id FROM admin_config LIMIT 1);
  RETURN true;
END; $$;

-- 12. Trigger Functions for Audit Logging
CREATE OR REPLACE FUNCTION log_product_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (action_type, entity_id, entity_name, details)
        VALUES ('PRODUCT_ADDED', NEW.id, NEW.name, row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.name IS DISTINCT FROM NEW.name OR OLD.price_out IS DISTINCT FROM NEW.price_out OR OLD.price_in IS DISTINCT FROM NEW.price_in THEN
            INSERT INTO audit_logs (action_type, entity_id, entity_name, details)
            VALUES ('PRODUCT_UPDATED', NEW.id, NEW.name, jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (action_type, entity_id, entity_name, details)
        VALUES ('PRODUCT_DELETED', OLD.id, OLD.name, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_sale_changes()
RETURNS TRIGGER AS $$
DECLARE prod_name VARCHAR;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT name INTO prod_name FROM products WHERE id = NEW.product_id;
        INSERT INTO audit_logs (action_type, entity_id, entity_name, details)
        VALUES ('SALE_CREATED', NEW.id, prod_name, row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_reversed = FALSE AND NEW.is_reversed = TRUE THEN
            SELECT name INTO prod_name FROM products WHERE id = NEW.product_id;
            INSERT INTO audit_logs (action_type, entity_id, entity_name, details)
            VALUES ('SALE_REVERSED', NEW.id, prod_name, row_to_json(NEW));
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Apply Triggers
DROP TRIGGER IF EXISTS product_audit_trigger ON products;
CREATE TRIGGER product_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION log_product_changes();

DROP TRIGGER IF EXISTS sale_audit_trigger ON sales;
CREATE TRIGGER sale_audit_trigger AFTER INSERT OR UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION log_sale_changes();

-- 14. Bulk Sale Processing RPC
CREATE OR REPLACE FUNCTION process_bulk_sales(sales_data JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    sale_item JSONB;
    p_id UUID;
    q_qty INTEGER;
    p_price NUMERIC;
    cust_info TEXT;
    desc_txt TEXT;
    current_stock INTEGER;
BEGIN
    FOR sale_item IN SELECT * FROM jsonb_array_elements(sales_data)
    LOOP
        p_id := (sale_item->>'product_id')::UUID;
        q_qty := (sale_item->>'quantity')::INTEGER;
        p_price := (sale_item->>'price_at_sale')::NUMERIC;
        cust_info := (sale_item->>'customer_info')::TEXT;
        desc_txt := (sale_item->>'description')::TEXT;

        SELECT quantity INTO current_stock FROM products WHERE id = p_id;
        IF current_stock < q_qty THEN
            RAISE EXCEPTION 'Insufficient stock for product %', p_id;
        END IF;

        INSERT INTO sales (product_id, quantity, price_at_sale, customer_info, description)
        VALUES (p_id, q_qty, p_price, cust_info, desc_txt);

        UPDATE products SET quantity = quantity - q_qty WHERE id = p_id;
    END LOOP;
    RETURN TRUE;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
