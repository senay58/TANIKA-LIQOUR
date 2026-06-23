-- ==============================================================================
-- TANIKA LIQUOR - COMPREHENSIVE SYSTEM AUDIT & PATCH
-- ==============================================================================
-- This script fixes and unifies every single financial, security, and inventory
-- trigger in the system top-to-bottom to guarantee mathematical perfection.
-- ==============================================================================

-- 1. UNIFY SECURITY (Enforce single Admin Password for everything)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION verify_admin_secret(p_secret text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Now uses password_hash instead of a separate passcode
  RETURN EXISTS (SELECT 1 FROM admin_config WHERE password_hash = p_secret);
END; $$;

CREATE OR REPLACE FUNCTION reset_entire_system(p_password TEXT, p_initial_cash NUMERIC DEFAULT 0)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM admin_config WHERE password_hash = p_password) THEN
        RAISE EXCEPTION 'Invalid admin password.';
    END IF;

    TRUNCATE public.credits, public.cash_ledger, public.sales, public.products, public.categories CASCADE;

    IF p_initial_cash > 0 THEN
        -- Properly logged as an injection
        INSERT INTO public.cash_ledger (type, amount, description)
        VALUES ('injection', p_initial_cash, 'Initial business investment / System Reset');
    END IF;

    RETURN TRUE;
END; $$;

CREATE OR REPLACE FUNCTION inject_cash(p_amount NUMERIC, p_description TEXT, p_passcode TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM admin_config WHERE password_hash = p_passcode) THEN
        RAISE EXCEPTION 'Invalid admin password.';
    END IF;

    INSERT INTO public.cash_ledger (type, amount, description)
    VALUES ('injection', p_amount, p_description);
    
    RETURN TRUE;
END; $$;

-- Explicitly grant RPC permissions
GRANT EXECUTE ON FUNCTION reset_entire_system(TEXT, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inject_cash(NUMERIC, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_admin_secret(TEXT) TO anon, authenticated;


-- 2. BULLETPROOF FINANCIAL CONSTRAINTS
-- ------------------------------------------------------------------------------
DO $$ 
DECLARE
    const_name text;
BEGIN
    -- Safely drop ANY check constraint on cash_ledger type
    FOR const_name IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc 
          ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'cash_ledger' AND tc.constraint_type = 'CHECK'
          AND cc.check_clause LIKE '%sale%'
    LOOP
        EXECUTE format('ALTER TABLE public.cash_ledger DROP CONSTRAINT %I', const_name);
    END LOOP;
END $$;

ALTER TABLE public.cash_ledger 
ADD CONSTRAINT cash_ledger_type_check 
CHECK (type IN ('sale', 'restock', 'credit_payment', 'adjustment', 'injection'));


-- 3. FLAWLESS INVENTORY & RESTOCK LOGIC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_restock_cash_flow()
RETURNS TRIGGER AS $$
DECLARE
    quantity_diff INTEGER;
    cost_per_unit DECIMAL(12,2);
    is_sale_session TEXT;
    is_sale BOOLEAN := false;
BEGIN
    -- Check if this update is happening during a sale
    BEGIN
        is_sale_session := current_setting('app.is_sale', true);
        IF is_sale_session = 'on' THEN
            is_sale := true;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        is_sale := false;
    END;

    IF TG_OP = 'INSERT' THEN
        -- Handle Brand New Product Addition
        -- Deduct the initial cost from the cash pile immediately
        IF NEW.quantity > 0 AND NEW.price_in > 0 THEN
            INSERT INTO public.cash_ledger (type, amount, description, reference_id)
            VALUES ('restock', -(NEW.quantity * NEW.price_in), 'Initial stock addition: ' || NEW.quantity || ' units of ' || NEW.name, NEW.id);
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle Existing Product Quantity Changes
        IF (OLD.quantity IS DISTINCT FROM NEW.quantity) THEN
            quantity_diff := NEW.quantity - OLD.quantity;
            cost_per_unit := COALESCE(NEW.price_in, 0);
            
            -- If quantity INCREASED -> Restock (Expense)
            IF quantity_diff > 0 AND cost_per_unit > 0 THEN
                INSERT INTO public.cash_ledger (type, amount, description, reference_id)
                VALUES ('restock', -(quantity_diff * cost_per_unit), 'Restocked ' || quantity_diff || ' units of ' || NEW.name, NEW.id);
            
            -- If quantity DECREASED manually outside of a sale -> Inventory Correction (Refunds cash for typo fixes)
            ELSIF quantity_diff < 0 AND NOT is_sale AND cost_per_unit > 0 THEN
                INSERT INTO public.cash_ledger (type, amount, description, reference_id)
                VALUES ('adjustment', -(quantity_diff * cost_per_unit), 'Inventory Correction / Refund: ' || ABS(quantity_diff) || ' units of ' || NEW.name, NEW.id);
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to BOTH Inserts and Updates
DROP TRIGGER IF EXISTS on_product_restock ON public.products;
CREATE TRIGGER on_product_restock
    AFTER INSERT OR UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.track_restock_cash_flow();


-- 4. BULK SALES RPC INTEGRITY
-- ------------------------------------------------------------------------------
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
    -- FLAG ON: Temporarily disable the inventory correction trigger from refunding cash
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

        -- This will trigger on_product_restock, but it will see 'app.is_sale' = 'on'
        UPDATE products SET quantity = quantity - q_qty WHERE id = p_id;
        total_sale_amount := total_sale_amount + (q_qty * p_price);
    END LOOP;

    -- Add cash securely AFTER stock is successfully deducted
    IF credit_info IS NOT NULL THEN
        INSERT INTO public.credits (sale_id, customer_name, customer_phone, amount, due_date, status)
        VALUES (first_sale_id, (credit_info->>'customer_name')::TEXT, (credit_info->>'customer_phone')::TEXT,
                total_sale_amount, (credit_info->>'due_date')::TIMESTAMP WITH TIME ZONE, 'pending');
    ELSE
        INSERT INTO public.cash_ledger (type, amount, description, reference_id)
        VALUES ('sale', total_sale_amount, 'Bulk Sale', first_sale_id);
    END IF;

    -- FLAG OFF: Re-enable the inventory correction trigger
    PERFORM set_config('app.is_sale', 'off', true);

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    -- Ensure flag is turned off even if an error occurs
    PERFORM set_config('app.is_sale', 'off', true);
    RAISE;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';
