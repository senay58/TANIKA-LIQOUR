-- ==============================================================================
-- TANIKA LIQUOR - SYSTEM RESET FUNCTIONALITY
-- ==============================================================================

CREATE OR REPLACE FUNCTION reset_entire_system(p_password TEXT, p_initial_cash NUMERIC DEFAULT 0)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    is_valid BOOLEAN;
BEGIN
    -- 1. Verify the admin password
    SELECT EXISTS (
        SELECT 1 FROM admin_config 
        WHERE password_hash = p_password
    ) INTO is_valid;

    IF NOT is_valid THEN
        RAISE EXCEPTION 'Invalid admin passcode. System reset aborted.';
    END IF;

    -- 2. Truncate all data tables (TRUNCATE is faster than DELETE)
    TRUNCATE public.credits CASCADE;
    TRUNCATE public.cash_ledger CASCADE;
    TRUNCATE public.sales CASCADE;
    TRUNCATE public.products CASCADE;
    TRUNCATE public.categories CASCADE;

    -- 3. Insert initial investment cash if provided
    IF p_initial_cash > 0 THEN
        INSERT INTO public.cash_ledger (amount, type, description)
        VALUES (p_initial_cash, 'sale', 'Initial business investment / starting cash after reset');
    END IF;

    RETURN TRUE;
END; $$;
