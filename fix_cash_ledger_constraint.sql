-- Fix for the cash ledger check constraint to allow 'adjustment'

ALTER TABLE public.cash_ledger DROP CONSTRAINT IF EXISTS cash_ledger_type_check;
ALTER TABLE public.cash_ledger ADD CONSTRAINT cash_ledger_type_check CHECK (type IN ('sale', 'restock', 'credit_payment', 'adjustment'));
