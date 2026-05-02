-- ==============================================================================
-- TANIKA - Phase 5 Hotfix: Fix RPC param order + add salesperson tracking
-- Run this in Supabase SQL Editor
-- ==============================================================================

-- Fix 1: update_sales_credentials - params must be alphabetical for PostgREST
-- (p_password comes before p_username alphabetically)
CREATE OR REPLACE FUNCTION update_sales_credentials(p_password text, p_username text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.sales_config
  SET username = p_username, password_hash = p_password, updated_at = now()
  WHERE id = (SELECT id FROM public.sales_config LIMIT 1);
  RETURN true;
END; $$;

-- Fix 2: Add salesperson tracking to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS salesperson_number INT CHECK (salesperson_number IN (1, 2));

-- Fix 3: Update process_bulk_sales to include salesperson_number
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
