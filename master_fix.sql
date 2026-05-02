-- ==============================================================================
-- TANIKA LIQUOUR - MASTER DATABASE FIX
-- PLEASE COPY THIS ENTIRE SCRIPT AND RUN IT IN YOUR SUPABASE SQL EDITOR
-- ==============================================================================

-- 1. Create the missing sales_config table
CREATE TABLE IF NOT EXISTS public.sales_config (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    username text NOT NULL DEFAULT 'sales',
    password_hash text NOT NULL DEFAULT 'sales123',
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Insert default sales credentials if they don't exist
INSERT INTO public.sales_config (username, password_hash)
SELECT 'sales', 'sales123'
WHERE NOT EXISTS (SELECT 1 FROM public.sales_config);

-- 3. Setup security for sales_config
ALTER TABLE public.sales_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Block public read sales_config" ON public.sales_config;
CREATE POLICY "Block public read sales_config" ON public.sales_config FOR SELECT USING (false);

-- 4. Create the verify_sales_login RPC
CREATE OR REPLACE FUNCTION verify_sales_login(p_username text, p_password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.sales_config
    WHERE username = p_username AND password_hash = p_password
  );
END; $$;

-- 5. Create the update_sales_credentials RPC (with exactly the parameter names expected)
DROP FUNCTION IF EXISTS update_sales_credentials(text, text);
CREATE OR REPLACE FUNCTION update_sales_credentials(p_password text, p_username text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.sales_config
  SET username = p_username, password_hash = p_password, updated_at = now()
  WHERE id = (SELECT id FROM public.sales_config LIMIT 1);
  RETURN true;
END; $$;

-- 6. Add payment tracking columns to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer'));
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS reference_number text;

-- 7. Add salesperson tracking column to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS salesperson_number INT CHECK (salesperson_number IN (1, 2));

-- 8. Update the process_bulk_sales RPC to include all new fields
CREATE OR REPLACE FUNCTION process_bulk_sales(sales_data JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    sale_item JSONB;
    p_id UUID; q_qty INTEGER; p_price NUMERIC;
    cust_info TEXT; desc_txt TEXT;
    pay_method TEXT; bank TEXT; ref_num TEXT;
    sp_num INT;
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
        sp_num     := (sale_item->>'salesperson_number')::INT;

        SELECT quantity INTO current_stock FROM products WHERE id = p_id;
        IF current_stock < q_qty THEN
            RAISE EXCEPTION 'Insufficient stock for product %', p_id;
        END IF;

        INSERT INTO sales (product_id, quantity, price_at_sale, customer_info, description,
                           payment_method, bank_name, reference_number, salesperson_number)
        VALUES (p_id, q_qty, p_price, cust_info, desc_txt, pay_method, bank, ref_num, sp_num);

        UPDATE products SET quantity = quantity - q_qty WHERE id = p_id;
    END LOOP;
    RETURN TRUE;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Reload Schema Cache so Supabase API picks up the changes immediately
NOTIFY pgrst, 'reload schema';
