-- ==============================================================================
-- TANIKA LIQUOR - INITIAL STOCK CASH DEDUCTION FIX
-- ==============================================================================

-- 1. Update the function to handle both INSERT and UPDATE
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
        -- Handle New Product Insertion
        IF NEW.quantity > 0 AND NEW.price_in > 0 THEN
            INSERT INTO public.cash_ledger (type, amount, description, reference_id)
            VALUES ('restock', -(NEW.quantity * NEW.price_in), 'Initial stock: ' || NEW.quantity || ' units of ' || NEW.name, NEW.id);
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle Existing Product Updates (Restock or Correction)
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
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Update the trigger to fire on BOTH INSERT and UPDATE
DROP TRIGGER IF EXISTS on_product_restock ON public.products;
CREATE TRIGGER on_product_restock
    AFTER INSERT OR UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.track_restock_cash_flow();

-- 3. Reload schema
NOTIFY pgrst, 'reload schema';
