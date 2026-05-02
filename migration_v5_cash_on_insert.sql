-- ==============================================================================
-- MIGRATION V5: Track Cash Ledger on NEW Product INSERT (stock purchase)
-- Run this in Supabase SQL Editor
-- ==============================================================================

-- 1. Function that fires when a NEW product is inserted with quantity > 0
CREATE OR REPLACE FUNCTION public.track_new_product_cash_flow()
RETURNS TRIGGER AS $$
BEGIN
    -- When a brand new product is added with some initial stock, deduct from cash
    IF NEW.quantity > 0 THEN
        INSERT INTO public.cash_ledger (type, amount, description, reference_id)
        VALUES (
            'restock',
            -(NEW.quantity * COALESCE(NEW.price_in, 0)),
            'Initial stock: ' || NEW.quantity || ' units of ' || NEW.name,
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop if exists then create trigger for INSERT
DROP TRIGGER IF EXISTS on_new_product_insert ON public.products;
CREATE TRIGGER on_new_product_insert
    AFTER INSERT ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.track_new_product_cash_flow();

-- 3. Reload schema cache
NOTIFY pgrst, 'reload schema';
