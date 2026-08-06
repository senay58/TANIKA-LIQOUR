BEGIN;

-- Helper procedure to merge categories
CREATE OR REPLACE PROCEDURE merge_category(p_clean_name TEXT, p_emoji_name TEXT)
LANGUAGE plpgsql AS $$
DECLARE
    v_clean_id UUID;
    v_emoji_id UUID;
BEGIN
    -- Make sure the clean category exists
    INSERT INTO public.categories (name) VALUES (p_clean_name) ON CONFLICT (name) DO NOTHING;
    
    -- Get IDs
    SELECT id INTO v_clean_id FROM public.categories WHERE name = p_clean_name LIMIT 1;
    SELECT id INTO v_emoji_id FROM public.categories WHERE name = p_emoji_name LIMIT 1;

    -- If both exist, move products and delete the emoji one
    IF v_clean_id IS NOT NULL AND v_emoji_id IS NOT NULL AND v_clean_id != v_emoji_id THEN
        UPDATE public.products SET category_id = v_clean_id WHERE category_id = v_emoji_id;
        DELETE FROM public.categories WHERE id = v_emoji_id;
    END IF;
END;
$$;

DO $$ 
BEGIN
    -- Merge specific emoji categories into clean text ones based on your screenshot
    CALL merge_category('Beer', '🍺 Beer');
    CALL merge_category('Champagne', '🍾 Champagne');
    CALL merge_category('Cognac', '🪵🥃 Cognac');
    CALL merge_category('Energy Drink', '⚡ Energy Drink');
    CALL merge_category('Gin', '🍸 Gin');
    CALL merge_category('Rum', '🏴‍☠️🥃 Rum');
    CALL merge_category('Tequila', '🌵 Tequila');
    CALL merge_category('Vodka', '❄️ Vodka');
    CALL merge_category('Whisky', '🥃 Whisky');
    CALL merge_category('Wine', '🍷 Wine');
END $$;

DROP PROCEDURE IF EXISTS merge_category(TEXT, TEXT);

COMMIT;

-- Verify the final list of categories
SELECT c.name, COUNT(p.id) as product_count
FROM public.categories c
LEFT JOIN public.products p ON p.category_id = c.id
GROUP BY c.name
ORDER BY c.name;
