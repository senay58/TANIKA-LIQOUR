-- 1. Create Credits Table
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

-- 2. Create Cash Ledger Table
CREATE TABLE IF NOT EXISTS public.cash_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('sale', 'restock', 'credit_payment', 'adjustment')),
    amount DECIMAL(12,2) NOT NULL, -- Positive for income, negative for expense
    description TEXT,
    reference_id UUID, -- sale_id or product_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Trigger to track Sales in Cash Ledger
CREATE OR REPLACE FUNCTION public.track_sale_cash_flow()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track if it's not a credit sale, or track it as a placeholder?
    -- For simplicity, we track the 'received' amount. 
    -- If it's fully on credit, we don't add to cash yet.
    -- However, the user request says 'when sales team sales bottles it should depletes from stock and cash rises'.
    -- We'll assume cash rises by the total_amount of the sale.
    INSERT INTO public.cash_ledger (type, amount, description, reference_id)
    VALUES ('sale', NEW.total_amount, 'Sale #' || NEW.id, NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_sale_completed ON public.sales;
CREATE TRIGGER on_sale_completed
    AFTER INSERT ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.track_sale_cash_flow();

-- 4. Trigger to track Restocking (Stock Up) in Cash Ledger
CREATE OR REPLACE FUNCTION public.track_restock_cash_flow()
RETURNS TRIGGER AS $$
DECLARE
    quantity_diff INTEGER;
    cost_per_unit DECIMAL(12,2);
BEGIN
    -- Only trigger if quantity increased
    IF NEW.quantity > OLD.quantity THEN
        quantity_diff := NEW.quantity - OLD.quantity;
        cost_per_unit := NEW.price_in;
        
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

-- 5. Helper function to get current cash pile
CREATE OR REPLACE FUNCTION public.get_current_cash_balance()
RETURNS DECIMAL(12,2) AS $$
    SELECT COALESCE(SUM(amount), 0) FROM public.cash_ledger;
$$ LANGUAGE sql;
