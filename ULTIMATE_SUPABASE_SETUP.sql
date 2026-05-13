-- ==============================================================================
-- TANIKA LIQUOR - ULTIMATE DATABASE SETUP (MASTER SCRIPT)
-- ==============================================================================
-- This script reconstructs the entire database structure, including:
-- 1. Tables (Categories, Products, Sales, Admin, Sales Config, Finance, Credits)
-- 2. Security (RLS Policies)
-- 3. Logic (RPC Functions for Auth, Sales, and Finance)
-- 4. Automation (Audit Triggers and Inventory Tracking)
-- ==============================================================================

-- 1. Enable Necessary Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Core Tables
-- ------------------------------------------------------------------------------

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  emoji text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Products
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

-- Sales
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL,
  price_at_sale numeric(10, 2) NOT NULL,
  description text,
  customer_info text,
  is_reversed boolean DEFAULT false,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer')),
  bank_name text,
  reference_number text,
  salesperson_number INT CHECK (salesperson_number IN (1, 2)),
  sale_date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Admin Configuration (Auth)
CREATE TABLE IF NOT EXISTS public.admin_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL,
  password_hash text NOT NULL,
  secret_code_hash text NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sales Portal Configuration (Auth & Names)
CREATE TABLE IF NOT EXISTS public.sales_config (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    username text NOT NULL DEFAULT 'sales',
    password_hash text NOT NULL DEFAULT 'sales123',
    salesperson_1_name text DEFAULT 'Salesperson 1',
    salesperson_2_name text DEFAULT 'Salesperson 2',
    updated_at timestamp with time zone DEFAULT now()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type VARCHAR(50) NOT NULL, 
    entity_id UUID, 
    entity_name VARCHAR(255),
    details JSONB, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Credits Table
CREATE TABLE IF NOT EXISTS public.credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    amount DECIMAL(12,2) NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cash Ledger Table
CREATE TABLE IF NOT EXISTS public.cash_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('sale', 'restock', 'credit_payment', 'adjustment')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Insert Initial Data
-- ------------------------------------------------------------------------------

-- Default Categories
INSERT INTO public.categories (name, emoji) VALUES
  ('Whiskey', '🥃'), ('Vodka', '🍸'), ('Gin', '🫒'), ('Rum', '🏴‍☠️'),
  ('Tequila', '🌵'), ('Wine', '🍷'), ('Beer', '🍺'), ('Brandy', '🥂'), ('Liqueur', '🍹')
ON CONFLICT (name) DO NOTHING;

-- Default Admin (admin | password123 | 123456)
INSERT INTO public.admin_config (username, password_hash, secret_code_hash) 
SELECT 'admin', 'password123', '123456'
WHERE NOT EXISTS (SELECT 1 FROM public.admin_config);

-- Default Sales Portal
INSERT INTO public.sales_config (username, password_hash)
SELECT 'sales', 'sales123'
WHERE NOT EXISTS (SELECT 1 FROM public.sales_config);

-- 4. Enable Row Level Security (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_ledger ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Allowing anon access for current app architecture)
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    -- Public Tables (Read/Write)
    CREATE POLICY "Allow anon read" ON public.categories FOR SELECT USING (true);
    CREATE POLICY "Allow anon write" ON public.categories FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow anon read" ON public.products FOR SELECT USING (true);
    CREATE POLICY "Allow anon write" ON public.products FOR ALL USING (true);
    CREATE POLICY "Allow anon read" ON public.sales FOR SELECT USING (true);
    CREATE POLICY "Allow anon write" ON public.sales FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow anon read" ON public.credits FOR SELECT USING (true);
    CREATE POLICY "Allow anon write" ON public.credits FOR ALL USING (true);
    CREATE POLICY "Allow anon read" ON public.cash_ledger FOR SELECT USING (true);
    CREATE POLICY "Allow anon write" ON public.cash_ledger FOR ALL USING (true);
    CREATE POLICY "Allow anon read" ON public.audit_logs FOR SELECT USING (true);

    -- Sensitive Tables (Strictly Block Reading Directly)
    CREATE POLICY "Block public read admin_config" ON public.admin_config FOR SELECT USING (false);
    CREATE POLICY "Block public read sales_config" ON public.sales_config FOR SELECT USING (false);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 6. RPC Functions
-- ------------------------------------------------------------------------------

-- Admin Auth
CREATE OR REPLACE FUNCTION verify_admin_login(p_username text, p_password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_config WHERE username = p_username AND password_hash = p_password);
END; $$;

CREATE OR REPLACE FUNCTION verify_admin_secret(p_secret text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_config WHERE secret_code_hash = p_secret);
END; $$;

CREATE OR REPLACE FUNCTION update_admin_credentials(p_username text, p_password text, p_secret text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE admin_config SET username = p_username, password_hash = p_password, secret_code_hash = p_secret, updated_at = now()
  WHERE id = (SELECT id FROM admin_config LIMIT 1);
  RETURN true;
END; $$;

-- Sales Auth & Config
CREATE OR REPLACE FUNCTION verify_sales_login(p_username text, p_password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM sales_config WHERE username = p_username AND password_hash = p_password);
END; $$;

CREATE OR REPLACE FUNCTION update_sales_credentials(p_password text, p_username text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE sales_config SET username = p_username, password_hash = p_password, updated_at = now()
  WHERE id = (SELECT id FROM sales_config LIMIT 1);
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION get_salesperson_names()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSONB;
BEGIN
    SELECT json_build_object('sp1', salesperson_1_name, 'sp2', salesperson_2_name)
    INTO result FROM sales_config LIMIT 1;
    RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION update_salesperson_names(p_sp1 text, p_sp2 text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE sales_config SET salesperson_1_name = p_sp1, salesperson_2_name = p_sp2, updated_at = now()
    WHERE id = (SELECT id FROM sales_config LIMIT 1);
    RETURN true;
END; $$;

-- Finance & Bulk Sales (The Core Logic)
CREATE OR REPLACE FUNCTION process_bulk_sales(sales_data JSONB, credit_info JSONB DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    sale_item JSONB;
    p_id UUID; q_qty INTEGER; p_price NUMERIC;
    cust_info TEXT; desc_txt TEXT;
    pay_method TEXT; bank TEXT; ref_num TEXT;
    sp_num INT;
    current_stock INTEGER;
    new_sale_id UUID;
    total_sale_amount NUMERIC := 0;
    first_sale_id UUID := NULL;
BEGIN
    FOR sale_item IN SELECT * FROM jsonb_array_elements(sales_data)
    LOOP
        p_id       := (sale_item->>'product_id')::UUID;
        q_qty      := (sale_item->>'quantity')::INTEGER;
        p_price    := (sale_item->>'price_at_sale')::NUMERIC;
        cust_info  := (sale_item->>'customer_info')::TEXT;
        desc_txt   := (sale_item->>'description')::TEXT;
        pay_method := COALESCE((sale_item->>'payment_method')::TEXT, 'cash');
        bank       := (sale_item->>'bank_name')::TEXT;
        ref_num    := (sale_item->>'reference_number')::TEXT;
        sp_num     := (sale_item->>'salesperson_number')::INT;

        SELECT quantity INTO current_stock FROM products WHERE id = p_id;
        IF current_stock < q_qty THEN
            RAISE EXCEPTION 'Insufficient stock for product %', p_id;
        END IF;

        INSERT INTO sales (product_id, quantity, price_at_sale, customer_info, description,
                           payment_method, bank_name, reference_number, salesperson_number)
        VALUES (p_id, q_qty, p_price, cust_info, desc_txt, pay_method, bank, ref_num, sp_num)
        RETURNING id INTO new_sale_id;

        IF first_sale_id IS NULL THEN first_sale_id := new_sale_id; END IF;

        UPDATE products SET quantity = quantity - q_qty WHERE id = p_id;
        total_sale_amount := total_sale_amount + (q_qty * p_price);
    END LOOP;

    IF credit_info IS NOT NULL THEN
        INSERT INTO public.credits (sale_id, customer_name, customer_phone, amount, due_date, status)
        VALUES (first_sale_id, (credit_info->>'customer_name')::TEXT, (credit_info->>'customer_phone')::TEXT,
                total_sale_amount, (credit_info->>'due_date')::TIMESTAMP WITH TIME ZONE, 'pending');
    ELSE
        INSERT INTO public.cash_ledger (type, amount, description, reference_id)
        VALUES ('sale', total_sale_amount, 'Bulk Sale', first_sale_id);
    END IF;

    RETURN TRUE;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_cash_balance()
RETURNS DECIMAL(12,2) AS $$
    SELECT COALESCE(SUM(amount), 0) FROM public.cash_ledger;
$$ LANGUAGE sql;

-- System Management
CREATE OR REPLACE FUNCTION reset_entire_system(p_password TEXT, p_initial_cash NUMERIC DEFAULT 0)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM admin_config WHERE password_hash = p_password) THEN
        RAISE EXCEPTION 'Invalid admin passcode.';
    END IF;

    TRUNCATE public.credits, public.cash_ledger, public.sales, public.products, public.categories CASCADE;

    IF p_initial_cash > 0 THEN
        INSERT INTO public.cash_ledger (amount, type, description)
        VALUES (p_initial_cash, 'sale', 'Initial business investment');
    END IF;

    RETURN TRUE;
END; $$;

-- 7. Trigger Functions for Automation
-- ------------------------------------------------------------------------------

-- Audit Logging
CREATE OR REPLACE FUNCTION log_product_changes() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (action_type, entity_id, entity_name, details) VALUES ('PRODUCT_ADDED', NEW.id, NEW.name, row_to_json(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.name IS DISTINCT FROM NEW.name OR OLD.price_out IS DISTINCT FROM NEW.price_out THEN
            INSERT INTO audit_logs (action_type, entity_id, entity_name, details) VALUES ('PRODUCT_UPDATED', NEW.id, NEW.name, jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (action_type, entity_id, entity_name, details) VALUES ('PRODUCT_DELETED', OLD.id, OLD.name, row_to_json(OLD));
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restock Tracking
CREATE OR REPLACE FUNCTION track_restock_cash_flow() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity > OLD.quantity THEN
        INSERT INTO public.cash_ledger (type, amount, description, reference_id)
        VALUES ('restock', -((NEW.quantity - OLD.quantity) * NEW.price_in), 'Restocked ' || (NEW.quantity - OLD.quantity) || ' units of ' || NEW.name, NEW.id);
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Apply Triggers
DROP TRIGGER IF EXISTS product_audit_trigger ON products;
CREATE TRIGGER product_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION log_product_changes();

DROP TRIGGER IF EXISTS on_product_restock ON products;
CREATE TRIGGER on_product_restock AFTER UPDATE OF quantity ON public.products FOR EACH ROW WHEN (NEW.quantity > OLD.quantity) EXECUTE FUNCTION track_restock_cash_flow();

-- Reload Schema
NOTIFY pgrst, 'reload schema';
