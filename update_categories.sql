BEGIN;

DO $$ 
DECLARE
    cat_id UUID;
BEGIN
    -- 1. Ensure all categories exist in the categories table
    INSERT INTO public.categories (name)
    VALUES 
        ('Vodka'), ('Wine'), ('Rum'), ('Gin'), ('Whisky'), 
        ('Champagne'), ('Tequila'), ('Cognac'), ('Energy Drink')
    ON CONFLICT (name) DO NOTHING;

    -- 2. Helper procedure to update a product's category
    -- We can just do an update query linking product name to category name
    UPDATE public.products p
    SET category_id = c.id
    FROM public.categories c
    WHERE c.name = 'Vodka' AND p.name IN (
        'Absolut Blue', 'Champion Vodka', 'Cîroc', 'Grey Goose', 
        'Marathon Premium Vodka', 'Stolichnaya Vodka', 'Stolichnaya Vodka 50 ml', 'Stolichnaya Vodka 75 ml'
    );

    UPDATE public.products p
    SET category_id = c.id
    FROM public.categories c
    WHERE c.name = 'Wine' AND p.name IN (
        'Acacia Medium Sweet White', 'Antica Natural Sweet Red', 'Antica Natural Sweet Rosé', 
        'Antica Natural Sweet White', 'Awash Gebeta Red', 'Awash Gebeta Rosé', 
        'Castel Acacia Medium Sweet Red', 'Castel Acacia Medium Sweet Rosé', 
        'Castel Cuvée Prestige Dry Red Malbec', 'Castel Cuvée Prestige Dry Red White', 
        'Castel Rift Valley Cabernet Sauvignon', 'Castel Rift Valley Malbec', 
        'Castel Rift Valley Syrah', 'Château Barreyres', 'Château d''Arcins', 'Fentel Pro Rosé', 
        'Maison Castel Cabernet Sauvignon', 'Maison Castel Chablis', 'Maison Castel Chardonnay', 
        'Maison Castel Côtes du Rhône Grenache Syrah'
    );

    UPDATE public.products p
    SET category_id = c.id
    FROM public.categories c
    WHERE c.name = 'Rum' AND p.name IN (
        'Amarula Cream', 'Bacardi Rum', 'Baileys Irish Cream', 'Bols Triple Sec', 
        'Captain Morgan Gold', 'Fernet Branca', 'Jägermeister', 'Martini Rosso', 'Patrón Sambuca'
    );

    UPDATE public.products p
    SET category_id = c.id
    FROM public.categories c
    WHERE c.name = 'Gin' AND p.name IN (
        'Beefeater', 'Champion Coffee', 'Champion Gin', 'Gordon''s Gin', 
        'Marathon Premium Gin', 'Tanqueray'
    );

    UPDATE public.products p
    SET category_id = c.id
    FROM public.categories c
    WHERE c.name = 'Whisky' AND p.name IN (
        'Black Label Duty Free', 'Chivas Regal 18', 'Chivas Regal 12 Years', 
        'Johnnie Walker Double Black', 'Fireball Cinnamon', 'Glenfiddich 15 Years', 
        'Johnnie Walker Gold Label', 'Johnnie Walker Green Label', 'Jack Daniel''s Old No. 7', 
        'Johnnie Walker Black Label', 'Johnnie Walker Blue Label', 'Johnnie Walker Platinum 18 Years', 
        'Johnnie Walker Red Label', 'Johnnie Walker King George V', 'White Horse'
    );

    UPDATE public.products p
    SET category_id = c.id
    FROM public.categories c
    WHERE c.name = 'Champagne' AND p.name IN (
        'Bottega White', 'Maison Castel Ice Sparkling Demi Sec Cuvée Blanche', 
        'Maison Castel Ice Sparkling Demi Sec Cuvée Rosé', 'Maison Castel Sparkling Cuvée Blanche', 
        'Moët & Chandon Impérial'
    );

    UPDATE public.products p
    SET category_id = c.id
    FROM public.categories c
    WHERE c.name = 'Tequila' AND p.name IN (
        'Camino', 'Camino Silver', 'Casamigos Silver', 'Casamigos Tequila', 
        'Don Julio Reposado', 'Don Julio Añejo', 'José Cuervo Silver', 
        'José Cuervo Gold', 'Patrón Silver', 'XO Coffee'
    );

    UPDATE public.products p
    SET category_id = c.id
    FROM public.categories c
    WHERE c.name = 'Cognac' AND p.name IN (
        'Hennessy XO'
    );

    UPDATE public.products p
    SET category_id = c.id
    FROM public.categories c
    WHERE c.name = 'Energy Drink' AND p.name IN (
        'Red Bull'
    );

END $$;

COMMIT;

-- Verify results
SELECT 
    p.name AS product_name,
    c.name AS category_name
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
ORDER BY c.name, p.name;
