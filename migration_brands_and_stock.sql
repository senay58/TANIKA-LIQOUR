-- ==============================================================================
-- TANIKA LIQUOR - DATA MIGRATION SCRIPT
-- ==============================================================================
-- This script safely restructures the database to support aggregated product
-- quantities, brand dropdowns, and separated stock entry tracking.
-- ==============================================================================

BEGIN; -- Run in transaction

-- 1. Create Brands Table
CREATE TABLE IF NOT EXISTS public.brands (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Populate Brands Table from existing Products
INSERT INTO public.brands (name)
SELECT DISTINCT brand FROM public.products WHERE brand IS NOT NULL AND brand != ''
ON CONFLICT (name) DO NOTHING;

-- 3. Update Products Table schema to use brand_id
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE RESTRICT;

-- Populate brand_id
UPDATE public.products p
SET brand_id = b.id
FROM public.brands b
WHERE p.brand = b.name;

-- 4. Create Stock Entries Table
CREATE TABLE IF NOT EXISTS public.stock_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid NOT NULL, -- Will add foreign key later after deduping
    price_in numeric(10, 2) NOT NULL,
    quantity_added integer NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Deduplicate Products
-- We need to group products by (name, volume, category_id, brand_id).
-- We'll pick the one with the latest updated_at as the "canonical" product.

DO $$
DECLARE
    r RECORD;
    canonical_id UUID;
    total_qty INT;
    latest_price_out NUMERIC;
BEGIN
    FOR r IN (
        SELECT name, volume, category_id, brand_id, array_agg(id) as ids
        FROM public.products
        GROUP BY name, volume, category_id, brand_id
        HAVING count(id) > 1
    )
    LOOP
        -- Find the canonical product (the most recently updated one)
        SELECT id INTO canonical_id FROM public.products WHERE id = ANY(r.ids) ORDER BY updated_at DESC LIMIT 1;
        
        -- Sum the quantities
        SELECT SUM(quantity) INTO total_qty FROM public.products WHERE id = ANY(r.ids);
        
        -- Insert ALL existing rows as stock entries into the canonical product
        INSERT INTO public.stock_entries (product_id, price_in, quantity_added, created_at)
        SELECT canonical_id, price_in, quantity, updated_at
        FROM public.products WHERE id = ANY(r.ids) AND quantity > 0;
        
        -- Update sales table to point to the canonical ID
        UPDATE public.sales SET product_id = canonical_id WHERE product_id = ANY(r.ids) AND product_id != canonical_id;
        
        -- Delete the non-canonical duplicates
        DELETE FROM public.products WHERE id = ANY(r.ids) AND id != canonical_id;
        
        -- Update the canonical product's quantity to the sum
        UPDATE public.products SET quantity = total_qty WHERE id = canonical_id;
    END LOOP;
END $$;

-- For products that weren't duplicated, we still need to create their initial stock entry
INSERT INTO public.stock_entries (product_id, price_in, quantity_added, created_at)
SELECT id, price_in, quantity, updated_at
FROM public.products
WHERE id NOT IN (SELECT product_id FROM public.stock_entries) AND quantity > 0;

-- 6. Cleanup Products Table
ALTER TABLE public.products DROP COLUMN brand;
-- We'll keep price_in on products for backward compatibility for now.


-- 7. Add Foreign Key to stock_entries
ALTER TABLE public.stock_entries ADD CONSTRAINT fk_stock_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- 8. RLS for new tables
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Allow anon write" ON public.brands FOR ALL USING (true);

ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read" ON public.stock_entries FOR SELECT USING (true);
CREATE POLICY "Allow anon write" ON public.stock_entries FOR ALL USING (true);

-- 9. Update Cash Ledger Triggers
-- Drop the old product restock trigger
DROP TRIGGER IF EXISTS on_product_restock ON public.products;

-- Create a new trigger for stock_entries
CREATE OR REPLACE FUNCTION public.track_stock_entry_cash_flow()
RETURNS TRIGGER AS $$
BEGIN
    -- Deduct the cost from the cash pile immediately when stock is added
    IF NEW.quantity_added > 0 AND NEW.price_in > 0 THEN
        INSERT INTO public.cash_ledger (type, amount, description, reference_id)
        VALUES (
            'restock', 
            -(NEW.quantity_added * NEW.price_in), 
            'Stock addition: ' || NEW.quantity_added || ' units (Product ID: ' || NEW.product_id || ')', 
            NEW.product_id
        );
        
        -- We ALSO need to update the aggregated product quantity!
        UPDATE public.products 
        SET quantity = quantity + NEW.quantity_added,
            updated_at = now()
        WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_stock_entry_added
    AFTER INSERT ON public.stock_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.track_stock_entry_cash_flow();

-- Update product manual quantity correction logic (if quantity decreases manually)
-- This logic remains on products table, but only handles negative adjustments since positive additions are handled by stock_entries.
CREATE OR REPLACE FUNCTION public.track_product_quantity_correction()
RETURNS TRIGGER AS $$
DECLARE
    quantity_diff INTEGER;
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

    IF TG_OP = 'UPDATE' THEN
        IF (OLD.quantity IS DISTINCT FROM NEW.quantity) THEN
            quantity_diff := NEW.quantity - OLD.quantity;
            
            -- If quantity DECREASED manually outside of a sale -> Inventory Correction
            -- Wait, what price do we refund? We don't have price_in on products anymore!
            -- We should find the average price_in, or the most recent price_in.
            IF quantity_diff < 0 AND NOT is_sale THEN
                DECLARE
                    latest_price NUMERIC;
                BEGIN
                    SELECT price_in INTO latest_price FROM public.stock_entries WHERE product_id = NEW.id ORDER BY created_at DESC LIMIT 1;
                    IF latest_price IS NULL THEN latest_price := 0; END IF;
                    
                    IF latest_price > 0 THEN
                        INSERT INTO public.cash_ledger (type, amount, description, reference_id)
                        VALUES ('adjustment', -(quantity_diff * latest_price), 'Inventory Correction / Refund: ' || ABS(quantity_diff) || ' units of ' || NEW.name, NEW.id);
                    END IF;
                END;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_product_qty_correction
    AFTER UPDATE OF quantity ON public.products
    FOR EACH ROW
    WHEN (NEW.quantity < OLD.quantity)
    EXECUTE FUNCTION public.track_product_quantity_correction();

COMMIT;
NOTIFY pgrst, 'reload schema';
