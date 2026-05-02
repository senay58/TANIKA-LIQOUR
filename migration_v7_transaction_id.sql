-- ==============================================================================
-- TANIKA LIQUOR - TRANSACTION TRACKING & CUSTOMER INFO (MIGRATION V7)
-- ==============================================================================

-- 1. Add customer_phone and transaction_id to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS transaction_id UUID;

-- 2. Update process_bulk_sales to handle these new fields
DROP FUNCTION IF EXISTS process_bulk_sales(JSONB, JSONB);
CREATE OR REPLACE FUNCTION process_bulk_sales(sales_data JSONB, credit_info JSONB DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    sale_item JSONB;
    p_id UUID; q_qty INTEGER; p_price NUMERIC;
    cust_info TEXT; cust_phone TEXT; desc_txt TEXT;
    pay_method TEXT; bank TEXT; ref_num TEXT;
    sp_num INT;
    current_stock INTEGER;
    new_sale_id UUID;
    t_id UUID := gen_random_uuid(); -- Unique ID for this entire cart
    total_sale_amount NUMERIC := 0;
    first_sale_id UUID := NULL;
BEGIN
    FOR sale_item IN SELECT * FROM jsonb_array_elements(sales_data)
    LOOP
        p_id       := (sale_item->>'product_id')::UUID;
        q_qty      := (sale_item->>'quantity')::INTEGER;
        p_price    := (sale_item->>'price_at_sale')::NUMERIC;
        cust_info  := (sale_item->>'customer_info')::TEXT;
        cust_phone := (sale_item->>'customer_phone')::TEXT; -- New field
        desc_txt   := (sale_item->>'description')::TEXT;
        pay_method := COALESCE((sale_item->>'payment_method')::TEXT, 'cash');
        bank       := (sale_item->>'bank_name')::TEXT;
        ref_num    := (sale_item->>'reference_number')::TEXT;
        sp_num     := (sale_item->>'salesperson_number')::INT;

        SELECT quantity INTO current_stock FROM products WHERE id = p_id;
        IF current_stock < q_qty THEN
            RAISE EXCEPTION 'Insufficient stock for product %', p_id;
        END IF;

        INSERT INTO sales (product_id, quantity, price_at_sale, customer_info, customer_phone, 
                           description, payment_method, bank_name, reference_number, 
                           salesperson_number, transaction_id)
        VALUES (p_id, q_qty, p_price, cust_info, cust_phone, desc_txt, pay_method, bank, ref_num, sp_num, t_id)
        RETURNING id INTO new_sale_id;

        IF first_sale_id IS NULL THEN
            first_sale_id := new_sale_id;
        END IF;

        UPDATE products SET quantity = quantity - q_qty WHERE id = p_id;
        
        total_sale_amount := total_sale_amount + (q_qty * p_price);
    END LOOP;

    -- Handle Credit or Cash Insertion
    IF credit_info IS NOT NULL THEN
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
        INSERT INTO public.cash_ledger (type, amount, description, reference_id)
        VALUES ('sale', total_sale_amount, 'Cart Sale (Ref: ' || t_id || ')', first_sale_id);
    END IF;

    RETURN TRUE;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
