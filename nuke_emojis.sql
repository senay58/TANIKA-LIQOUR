BEGIN;

-- 1. Ensure the clean categories exist
INSERT INTO public.categories (name) VALUES 
('Beer'), ('Champagne'), ('Cognac'), ('Energy Drink'), 
('Gin'), ('Rum'), ('Tequila'), ('Vodka'), ('Whisky'), ('Wine')
ON CONFLICT (name) DO NOTHING;

-- 2. Force move any products stuck in emoji categories into the clean ones
-- We match by checking if the emoji category name CONTAINS the clean word
UPDATE public.products p
SET category_id = clean_c.id
FROM public.categories old_c
CROSS JOIN public.categories clean_c
WHERE p.category_id = old_c.id
  AND old_c.name != clean_c.name
  AND clean_c.name IN ('Beer', 'Champagne', 'Cognac', 'Energy Drink', 'Gin', 'Rum', 'Tequila', 'Vodka', 'Whisky', 'Wine')
  AND old_c.name ILIKE '%' || clean_c.name || '%';

-- 3. Delete ANY category that is not one of our clean 10 categories
-- Since we just moved all products out of them, this is 100% safe to do
DELETE FROM public.categories
WHERE name NOT IN (
    'Beer', 'Champagne', 'Cognac', 'Energy Drink', 
    'Gin', 'Rum', 'Tequila', 'Vodka', 'Whisky', 'Wine'
);

COMMIT;

-- Verification
SELECT name FROM public.categories ORDER BY name;
