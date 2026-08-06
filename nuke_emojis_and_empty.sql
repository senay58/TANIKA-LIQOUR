BEGIN;

-- 1. Ensure the clean categories exist
INSERT INTO public.categories (name) VALUES 
('Beer'), ('Champagne'), ('Cognac'), ('Energy Drink'), 
('Gin'), ('Rum'), ('Tequila'), ('Vodka'), ('Whisky'), ('Wine')
ON CONFLICT (name) DO NOTHING;

-- 2. Force move any products stuck in emoji categories into the clean ones
UPDATE public.products p
SET category_id = clean_c.id
FROM public.categories old_c
CROSS JOIN public.categories clean_c
WHERE p.category_id = old_c.id
  AND old_c.name != clean_c.name
  AND clean_c.name IN ('Beer', 'Champagne', 'Cognac', 'Energy Drink', 'Gin', 'Rum', 'Tequila', 'Vodka', 'Whisky', 'Wine')
  AND old_c.name ILIKE '%' || clean_c.name || '%';

-- 3. Delete ANY category that is not one of our clean 10 categories
DELETE FROM public.categories
WHERE name NOT IN (
    'Beer', 'Champagne', 'Cognac', 'Energy Drink', 
    'Gin', 'Rum', 'Tequila', 'Vodka', 'Whisky', 'Wine'
);

-- 4. Delete ANY category (even clean ones) that has ZERO products attached to it
DELETE FROM public.categories
WHERE id NOT IN (
    SELECT DISTINCT category_id 
    FROM public.products 
    WHERE category_id IS NOT NULL
);

COMMIT;

-- Verification
SELECT c.name, COUNT(p.id) as product_count
FROM public.categories c
LEFT JOIN public.products p ON p.category_id = c.id
GROUP BY c.name
ORDER BY c.name;
