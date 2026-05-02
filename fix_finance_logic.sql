-- ==============================================================================
-- TANIKA LIQUOUR - FINANCE & CREDITS FIX
-- PLEASE COPY THIS ENTIRE SCRIPT AND RUN IT IN YOUR SUPABASE SQL EDITOR
-- ==============================================================================

-- 1. Add Custom Names for Salespersons
ALTER TABLE public.sales_config ADD COLUMN IF NOT EXISTS salesperson_1_name text DEFAULT 'Salesperson 1';
ALTER TABLE public.sales_config ADD COLUMN IF NOT EXISTS salesperson_2_name text DEFAULT 'Salesperson 2';

-- 1b. Create RPC to fetch salesperson names (since table is blocked from public read)
CREATE OR REPLACE FUNCTION get_salesperson_names()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT json_build_object('sp1', salesperson_1_name, 'sp2', salesperson_2_name)
    INTO result
    FROM public.sales_config LIMIT 1;
    RETURN result;
END; $$;

-- 1c. Create RPC to update salesperson names
CREATE OR REPLACE FUNCTION update_salesperson_names(p_sp1 text, p_sp2 text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.sales_config
    SET salesperson_1_name = p_sp1, salesperson_2_name = p_sp2, updated_at = now()
    WHERE id = (SELECT id FROM public.sales_config LIMIT 1);
    RETURN true;
END; $$;

-- 2. Drop the old broken trigger for cash flow
DROP TRIGGER IF EXISTS on_sale_completed ON public.sales;
DROP FUNCTION IF EXISTS public.track_sale_cash_flow();

-- 3. Rewrite process_bulk_sales to natively handle credits and cash ledger
DROP FUNCTION IF EXISTS process_bulk_sales(JSONB);
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

        IF first_sale_id IS NULL THEN
            first_sale_id := new_sale_id;
        END IF;

        UPDATE products SET quantity = quantity - q_qty WHERE id = p_id;
        
        total_sale_amount := total_sale_amount + (q_qty * p_price);
    END LOOP;

    -- Handle Credit or Cash Insertion ATOMICALLY
    IF credit_info IS NOT NULL THEN
        -- Insert into credits table, linked to the first sale ID for reference
        INSERT INTO public.credits (sale_id, customer_name, customer_phone, amount, due_date, status)
        VALUES (
            first_sale_id,
            (credit_info->>'customer_name')::TEXT,
            (credit_info->>'customer_phone')::TEXT,
            total_sale_amount,
            (credit_info->>'due_date')::TIMESTAMP WITH TIME ZONE,
            'pending'
        );
    ELSE
        -- Insert into cash ledger
        INSERT INTO public.cash_ledger (type, amount, description, reference_id)
        VALUES ('sale', total_sale_amount, 'Bulk Sale', first_sale_id);
    END IF;

    RETURN TRUE;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
