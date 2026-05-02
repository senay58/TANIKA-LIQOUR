-- ==============================================================================
-- TANIKA LIQUOUR - COMPLETE DATABASE SETUP & FIXES
-- PLEASE COPY THIS ENTIRE SCRIPT AND RUN IT IN YOUR SUPABASE SQL EDITOR
-- ==============================================================================

-- 1. Create the missing sales_config table
CREATE TABLE IF NOT EXISTS public.sales_config (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    username text NOT NULL DEFAULT 'sales',
    password_hash text NOT NULL DEFAULT 'sales123',
    salesperson_1_name text DEFAULT 'Salesperson 1',
    salesperson_2_name text DEFAULT 'Salesperson 2',
    updated_at timestamp with time zone DEFAULT now()
);

-- 1b. Insert default sales credentials if they don't exist
INSERT INTO public.sales_config (username, password_hash)
SELECT 'sales', 'sales123'
WHERE NOT EXISTS (SELECT 1 FROM public.sales_config);

-- 1c. Setup security for sales_config
ALTER TABLE public.sales_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Block public read sales_config" ON public.sales_config;
CREATE POLICY "Block public read sales_config" ON public.sales_config FOR SELECT USING (false);


-- 2. Add payment tracking & salesperson columns to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer'));
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS reference_number text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS salesperson_number INT CHECK (salesperson_number IN (1, 2));


-- 3. Create Credits Table
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

-- 4. Create Cash Ledger Table
CREATE TABLE IF NOT EXISTS public.cash_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('sale', 'restock', 'credit_payment', 'adjustment')),
    amount DECIMAL(12,2) NOT NULL, -- Positive for income, negative for expense
    description TEXT,
    reference_id UUID, -- sale_id or product_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4b. Enable RLS for new tables
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_ledger ENABLE ROW LEVEL SECURITY;

-- 4c. Create permissive policies for now (so API can access them)
DROP POLICY IF EXISTS "Permissive Credits" ON public.credits;
CREATE POLICY "Permissive Credits" ON public.credits FOR ALL USING (true);
DROP POLICY IF EXISTS "Permissive Cash Ledger" ON public.cash_ledger;
CREATE POLICY "Permissive Cash Ledger" ON public.cash_ledger FOR ALL USING (true);


-- 5. Trigger to track Restocking (Stock Up) in Cash Ledger
CREATE OR REPLACE FUNCTION public.track_restock_cash_flow()
RETURNS TRIGGER AS $$
DECLARE
    quantity_diff INTEGER;
    cost_per_unit DECIMAL(12,2);
BEGIN
    -- Only trigger if quantity increased
    IF NEW.quantity > OLD.quantity THEN
        quantity_diff := NEW.quantity - OLD.quantity;
        cost_per_unit := COALESCE(NEW.price_in, 0);
        
        INSERT INTO public.cash_ledger (type, amount, description, reference_id)
        VALUES ('restock', -(quantity_diff * cost_per_unit), 'Restocked ' || quantity_diff || ' units of ' || NEW.name, NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_product_restock ON public.products;
CREATE TRIGGER on_product_restock
    AFTER UPDATE OF quantity ON public.products
    FOR EACH ROW
    WHEN (NEW.quantity > OLD.quantity)
    EXECUTE FUNCTION public.track_restock_cash_flow();


-- 6. Helper function to get current cash pile
CREATE OR REPLACE FUNCTION public.get_current_cash_balance()
RETURNS DECIMAL(12,2) AS $$
    SELECT COALESCE(SUM(amount), 0) FROM public.cash_ledger;
$$ LANGUAGE sql;


-- 7. Create the verify_sales_login RPC
CREATE OR REPLACE FUNCTION verify_sales_login(p_username text, p_password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.sales_config
    WHERE username = p_username AND password_hash = p_password
  );
END; $$;

-- 8. Create the update_sales_credentials RPC
DROP FUNCTION IF EXISTS update_sales_credentials(text, text);
CREATE OR REPLACE FUNCTION update_sales_credentials(p_password text, p_username text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.sales_config
  SET username = p_username, password_hash = p_password, updated_at = now()
  WHERE id = (SELECT id FROM public.sales_config LIMIT 1);
  RETURN true;
END; $$;

-- 9. Create RPC to fetch salesperson names
CREATE OR REPLACE FUNCTION get_salesperson_names()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT json_build_object('sp1', COALESCE(salesperson_1_name, 'Salesperson 1'), 'sp2', COALESCE(salesperson_2_name, 'Salesperson 2'))
    INTO result
    FROM public.sales_config LIMIT 1;
    RETURN result;
END; $$;

-- 10. Create RPC to update salesperson names
CREATE OR REPLACE FUNCTION update_salesperson_names(p_sp1 text, p_sp2 text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.sales_config
    SET salesperson_1_name = p_sp1, salesperson_2_name = p_sp2, updated_at = now()
    WHERE id = (SELECT id FROM public.sales_config LIMIT 1);
    RETURN true;
END; $$;

-- 11. Drop the old broken trigger for cash flow (since it's now handled atomically)
DROP TRIGGER IF EXISTS on_sale_completed ON public.sales;
DROP FUNCTION IF EXISTS public.track_sale_cash_flow();


-- 12. Rewrite process_bulk_sales to natively handle credits and cash ledger
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


-- 13. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
