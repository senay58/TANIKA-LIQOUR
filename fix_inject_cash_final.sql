-- ==============================================================================
-- TANIKA LIQUOR - BULLETPROOF INJECT CASH FIX
-- ==============================================================================

-- 1. Remove ANY existing check constraints on cash_ledger type
DO $$ 
DECLARE
    const_name text;
BEGIN
    FOR const_name IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc 
          ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'cash_ledger' 
          AND tc.constraint_type = 'CHECK'
          AND cc.check_clause LIKE '%sale%'
    LOOP
        EXECUTE format('ALTER TABLE public.cash_ledger DROP CONSTRAINT %I', const_name);
    END LOOP;
END $$;

-- 2. Add the correct check constraint
ALTER TABLE public.cash_ledger 
ADD CONSTRAINT cash_ledger_type_check 
CHECK (type IN ('sale', 'restock', 'credit_payment', 'adjustment', 'injection'));

-- 3. Create the function
CREATE OR REPLACE FUNCTION inject_cash(p_amount NUMERIC, p_description TEXT, p_passcode TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    is_valid_admin BOOLEAN;
BEGIN
    -- Verify admin secret (passcode)
    SELECT EXISTS (
        SELECT 1 FROM admin_config WHERE secret_code_hash = p_passcode
    ) INTO is_valid_admin;

    IF NOT is_valid_admin THEN
        RAISE EXCEPTION 'Invalid admin passcode.';
    END IF;

    -- Insert the record
    INSERT INTO public.cash_ledger (type, amount, description)
    VALUES ('injection', p_amount, p_description);
    
    RETURN TRUE;
END; $$;

-- 4. Explicitly grant permissions
GRANT EXECUTE ON FUNCTION inject_cash(NUMERIC, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION inject_cash(NUMERIC, TEXT, TEXT) TO authenticated;

-- 5. Reload schema cache
NOTIFY pgrst, 'reload schema';
