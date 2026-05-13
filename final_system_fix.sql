-- ==============================================================================
-- TANIKA LIQUOR - FINAL SYSTEM INTEGRITY FIX
-- ==============================================================================
-- This script fixes:
-- 1. Category Deletion (RLS & Constraints)
-- 2. Sales Reversal/Undo (RLS)
-- 3. Cash Flow Tracking (Initial stock on insert)
-- 4. Audit Logging for Categories
-- ==============================================================================

-- 1. FIX CATEGORY DELETION CONSTRAINTS
-- Change ON DELETE RESTRICT to ON DELETE SET NULL so categories can be deleted
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

-- 2. FIX RLS POLICIES (Allow DELETE and UPDATE)
DO $$ BEGIN
    -- Fix Categories Policies
    DROP POLICY IF EXISTS "Allow anon read" ON public.categories;
    DROP POLICY IF EXISTS "Allow anon write" ON public.categories;
    CREATE POLICY "Allow anon select categories" ON public.categories FOR SELECT USING (true);
    CREATE POLICY "Allow anon insert categories" ON public.categories FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow anon update categories" ON public.categories FOR UPDATE USING (true);
    CREATE POLICY "Allow anon delete categories" ON public.categories FOR DELETE USING (true);

    -- Fix Sales Policies (Needed for Undo/Reversal)
    DROP POLICY IF EXISTS "Allow anon read" ON public.sales;
    DROP POLICY IF EXISTS "Allow anon write" ON public.sales;
    CREATE POLICY "Allow anon select sales" ON public.sales FOR SELECT USING (true);
    CREATE POLICY "Allow anon insert sales" ON public.sales FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow anon update sales" ON public.sales FOR UPDATE USING (true);
    CREATE POLICY "Allow anon delete sales" ON public.sales FOR DELETE USING (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3. FIX CASH FLOW TRACKING (Include initial stock on INSERT)
CREATE OR REPLACE FUNCTION track_restock_cash_flow() RETURNS TRIGGER AS $$
DECLARE
    restock_qty INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        restock_qty := NEW.quantity;
    ELSIF TG_OP = 'UPDATE' THEN
        restock_qty := NEW.quantity - OLD.quantity;
    END IF;

    IF restock_qty > 0 THEN
        INSERT INTO public.cash_ledger (type, amount, description, reference_id)
        VALUES ('restock', -(restock_qty * NEW.price_in), 
                'Stock addition: ' || restock_qty || ' units of ' || NEW.name, NEW.id);
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply trigger to handle both INSERT and UPDATE
DROP TRIGGER IF EXISTS on_product_restock ON products;
CREATE TRIGGER on_product_restock 
    AFTER INSERT OR UPDATE OF quantity ON public.products 
    FOR EACH ROW 
    EXECUTE FUNCTION track_restock_cash_flow();

-- 4. ADD AUDIT LOGGING FOR CATEGORIES
CREATE OR REPLACE FUNCTION log_category_changes() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (action_type, entity_id, entity_name, details) 
        VALUES ('CATEGORY_ADDED', NEW.id, NEW.name, row_to_json(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (action_type, entity_id, entity_name, details) 
        VALUES ('CATEGORY_DELETED', OLD.id, OLD.name, row_to_json(OLD));
    END IF;
    RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS category_audit_trigger ON categories;
CREATE TRIGGER category_audit_trigger 
    AFTER INSERT OR DELETE ON categories 
    FOR EACH ROW EXECUTE FUNCTION log_category_changes();

-- 5. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';
