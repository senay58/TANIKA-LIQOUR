-- Tanika Liquor - Phase 4 DB Schema Update (Analytics, Audit Logs, Cart Prep)
-- ==============================================================================
-- INSTRUCTIONS: Run this entire script in your Supabase SQL Editor to apply Phase 4 features.
-- ==============================================================================

-- 1. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type VARCHAR(50) NOT NULL, -- 'SALE', 'PRODUCT_ADDED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED', 'CATEGORY_ADDED'
    entity_id UUID, -- References the product, sale, or category ID involved
    entity_name VARCHAR(255),
    details JSONB, -- Stored snapshot of changes or relevant info
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Audit Logs Constraints & Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated admins
CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (1=1); -- Or standard check auth.uid() <> null if using real Supabase auth

-- (Optional) If we want explicit insert, though triggers will bypass RLS because they run as postgres role
CREATE POLICY "Admins can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (1=1);

-- 3. Triggers for Automatic Audit Logging
-- We will write trigger functions to log changes to the 'products', 'categories', and 'sales' tables automatically

-- Trigger Function for Products
CREATE OR REPLACE FUNCTION log_product_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (action_type, entity_id, entity_name, details)
        VALUES ('PRODUCT_ADDED', NEW.id, NEW.name, row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log if significant details changed (like price, volume, name). Quantity changes via Sales handle their own logging usually.
        IF OLD.name IS DISTINCT FROM NEW.name OR OLD.price_out IS DISTINCT FROM NEW.price_out OR OLD.price_in IS DISTINCT FROM NEW.price_in THEN
            INSERT INTO audit_logs (action_type, entity_id, entity_name, details)
            VALUES ('PRODUCT_UPDATED', NEW.id, NEW.name, jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (action_type, entity_id, entity_name, details)
        VALUES ('PRODUCT_DELETED', OLD.id, OLD.name, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Product Triggers
DROP TRIGGER IF EXISTS product_audit_trigger ON products;
CREATE TRIGGER product_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION log_product_changes();

-- Trigger Function for Sales
CREATE OR REPLACE FUNCTION log_sale_changes()
RETURNS TRIGGER AS $$
DECLARE
    prod_name VARCHAR;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT name INTO prod_name FROM products WHERE id = NEW.product_id;
        INSERT INTO audit_logs (action_type, entity_id, entity_name, details)
        VALUES ('SALE_CREATED', NEW.id, prod_name, row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_reversed = FALSE AND NEW.is_reversed = TRUE THEN
            SELECT name INTO prod_name FROM products WHERE id = NEW.product_id;
            INSERT INTO audit_logs (action_type, entity_id, entity_name, details)
            VALUES ('SALE_REVERSED', NEW.id, prod_name, row_to_json(NEW));
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Sale Triggers
DROP TRIGGER IF EXISTS sale_audit_trigger ON sales;
CREATE TRIGGER sale_audit_trigger
AFTER INSERT OR UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION log_sale_changes();

-- 4. Cart Processing Bulk RPC (To handle multiple items in one transaction safely)
CREATE OR REPLACE FUNCTION process_bulk_sales(sales_data JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    sale_item JSONB;
    p_id UUID;
    q_qty INTEGER;
    p_price NUMERIC;
    cust_info TEXT;
    desc_txt TEXT;
    current_stock INTEGER;
BEGIN
    FOR sale_item IN SELECT * FROM jsonb_array_elements(sales_data)
    LOOP
        p_id := (sale_item->>'product_id')::UUID;
        q_qty := (sale_item->>'quantity')::INTEGER;
        p_price := (sale_item->>'price_at_sale')::NUMERIC;
        cust_info := (sale_item->>'customer_info')::TEXT;
        desc_txt := (sale_item->>'description')::TEXT;

        -- Check stock
        SELECT quantity INTO current_stock FROM products WHERE id = p_id;
        IF current_stock < q_qty THEN
            RAISE EXCEPTION 'Insufficient stock for product %', p_id;
        END IF;

        -- Record sale
        INSERT INTO sales (product_id, quantity, price_at_sale, customer_info, description)
        VALUES (p_id, q_qty, p_price, cust_info, desc_txt);

        -- Decrement stock (The trigger above on sales will fire, and if we wanted a trigger on products we could, but direct UPDATE is fine here)
        UPDATE products SET quantity = quantity - q_qty WHERE id = p_id;
        
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- DONE.
-- ==============================================================================
