-- ==============================================================================
-- TANIKA LIQUOUR - Phase 5 Migration: Roles, Sales Credentials, Payment Fields
-- Run this entire script in Supabase SQL Editor
-- ==============================================================================

-- 1. Sales Staff Credentials Table
CREATE TABLE IF NOT EXISTS public.sales_config (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    username text NOT NULL DEFAULT 'sales',
    password_hash text NOT NULL DEFAULT 'sales123',
    updated_at timestamp with time zone DEFAULT now()
);

-- Insert default sales credentials (username: sales / password: sales123)
INSERT INTO public.sales_config (username, password_hash)
VALUES ('sales', 'sales123')
ON CONFLICT DO NOTHING;

-- RLS for sales_config
ALTER TABLE public.sales_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Block public read sales_config" ON public.sales_config;
CREATE POLICY "Block public read sales_config" ON public.sales_config FOR SELECT USING (false);

-- 2. RPC: Verify sales staff login
CREATE OR REPLACE FUNCTION verify_sales_login(p_username text, p_password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.sales_config
    WHERE username = p_username AND password_hash = p_password
  );
END; $$;

-- 3. RPC: Admin updates sales staff credentials
CREATE OR REPLACE FUNCTION update_sales_credentials(p_username text, p_password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.sales_config
  SET username = p_username, password_hash = p_password, updated_at = now()
  WHERE id = (SELECT id FROM public.sales_config LIMIT 1);
  RETURN true;
END; $$;

-- 4. Add payment tracking columns to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'bank_transfer'));
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS reference_number text;

-- 5. Update process_bulk_sales RPC to support new payment fields
CREATE OR REPLACE FUNCTION process_bulk_sales(sales_data JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    sale_item JSONB;
    p_id UUID;
    q_qty INTEGER;
    p_price NUMERIC;
    cust_info TEXT;
    desc_txt TEXT;
    pay_method TEXT;
    bank TEXT;
    ref_num TEXT;
    current_stock INTEGER;
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

        SELECT quantity INTO current_stock FROM products WHERE id = p_id;
        IF current_stock < q_qty THEN
            RAISE EXCEPTION 'Insufficient stock for product %', p_id;
        END IF;

        INSERT INTO sales (product_id, quantity, price_at_sale, customer_info, description, payment_method, bank_name, reference_number)
        VALUES (p_id, q_qty, p_price, cust_info, desc_txt, pay_method, bank, ref_num);

        UPDATE products SET quantity = quantity - q_qty WHERE id = p_id;
    END LOOP;
    RETURN TRUE;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- DONE. Run this before deploying Phase 5.
-- ==============================================================================
