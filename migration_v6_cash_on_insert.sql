-- ==============================================================================
-- TANIKA LIQUOR - CASH PILE FIX (MIGRATION V6)
-- RUN THIS IN SUPABASE SQL EDITOR TO ENSURE STOCK PURCHASES DEDUCT CASH
-- ==============================================================================

-- 1. Trigger to track INITIAL STOCK (Insert) in Cash Ledger
CREATE OR REPLACE FUNCTION public.track_new_product_cash_flow()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if quantity is > 0 and price_in is set
    IF NEW.quantity > 0 AND COALESCE(NEW.price_in, 0) > 0 THEN
        INSERT INTO public.cash_ledger (type, amount, description, reference_id)
        VALUES ('restock', -(NEW.quantity * NEW.price_in), 'Initial stock purchase: ' || NEW.name, NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_new_product_insert ON public.products;
CREATE TRIGGER on_new_product_insert
    AFTER INSERT ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.track_new_product_cash_flow();


-- 2. Enhanced Trigger to track RESTOCKING (Update) in Cash Ledger
-- This ensures that if only the quantity increases, we record the expense
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
        
        IF cost_per_unit > 0 THEN
            INSERT INTO public.cash_ledger (type, amount, description, reference_id)
            VALUES ('restock', -(quantity_diff * cost_per_unit), 'Restocked ' || quantity_diff || ' units of ' || NEW.name, NEW.id);
        END IF;
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
