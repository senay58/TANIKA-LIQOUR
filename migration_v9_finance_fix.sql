-- ==============================================================================
-- TANIKA LIQUOR - FINANCE INJECTION & CORRECTION FIX
-- ==============================================================================

-- 1. Update cash_ledger type check to include 'injection'
ALTER TABLE public.cash_ledger DROP CONSTRAINT IF EXISTS cash_ledger_type_check;
ALTER TABLE public.cash_ledger ADD CONSTRAINT cash_ledger_type_check 
CHECK (type IN ('sale', 'restock', 'credit_payment', 'adjustment', 'injection'));

-- 2. Create an RPC for Manual Cash Injection with Passcode Protection
CREATE OR REPLACE FUNCTION inject_cash(p_amount NUMERIC, p_description TEXT, p_passcode TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Verify admin secret
    IF NOT verify_admin_secret(p_passcode) THEN
        RAISE EXCEPTION 'Invalid admin passcode.';
    END IF;

    INSERT INTO public.cash_ledger (type, amount, description)
    VALUES ('injection', p_amount, p_description);
    RETURN TRUE;
END; $$;

-- 3. Improve the Restock Trigger to handle Corrections (Quantity Decreases)
-- This logic will only fire if the quantity decrease is NOT from a sale.
-- We can use a session variable to flag sales.
CREATE OR REPLACE FUNCTION public.track_restock_cash_flow()
RETURNS TRIGGER AS $$
DECLARE
    quantity_diff INTEGER;
    cost_per_unit DECIMAL(12,2);
    is_sale_session TEXT;
    is_sale BOOLEAN := false;
BEGIN
    -- Check if this update is happening during a sale
    -- Use a safer way to check session variables
    BEGIN
        is_sale_session := current_setting('app.is_sale', true);
        IF is_sale_session = 'on' THEN
            is_sale := true;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        is_sale := false;
    END;

    -- Only proceed if quantity actually changed
    IF (OLD.quantity IS DISTINCT FROM NEW.quantity) THEN
        quantity_diff := NEW.quantity - OLD.quantity;
        cost_per_unit := COALESCE(NEW.price_in, 0);
        
        -- If quantity INCREASED -> Restock (Expense)
        IF quantity_diff > 0 AND cost_per_unit > 0 THEN
            INSERT INTO public.cash_ledger (type, amount, description, reference_id)
            VALUES ('restock', -(quantity_diff * cost_per_unit), 'Restocked ' || quantity_diff || ' units of ' || NEW.name, NEW.id);
        
        -- If quantity DECREASED and it's NOT a sale -> Correction (Refund/Adjustment)
        ELSIF quantity_diff < 0 AND NOT is_sale AND cost_per_unit > 0 THEN
            INSERT INTO public.cash_ledger (type, amount, description, reference_id)
            VALUES ('adjustment', -(quantity_diff * cost_per_unit), 'Inventory Correction: ' || ABS(quantity_diff) || ' units of ' || NEW.name, NEW.id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Update process_bulk_sales to set the session variable
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
    -- Set session flag to prevent inventory correction trigger from firing during sale
    PERFORM set_config('app.is_sale', 'on', true);

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

    -- Reset session flag
    PERFORM set_config('app.is_sale', 'off', true);

    RETURN TRUE;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Finalize the trigger to remove the 'WHEN' condition that restricted it to increases only
DROP TRIGGER IF EXISTS on_product_restock ON public.products;
CREATE TRIGGER on_product_restock
    AFTER UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.track_restock_cash_flow();

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
