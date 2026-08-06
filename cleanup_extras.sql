BEGIN;

-- Helper procedure (same as before)
CREATE OR REPLACE PROCEDURE migrate_product_exact(p_new_name TEXT, p_old_names TEXT[])
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id    UUID;
    v_old_name  TEXT;
    v_found     UUID[];
    v_old_ids   UUID[] := ARRAY[]::UUID[];
BEGIN
    SELECT id INTO v_new_id FROM public.products WHERE name = p_new_name ORDER BY created_at DESC LIMIT 1;
    IF v_new_id IS NULL THEN RETURN; END IF;

    FOREACH v_old_name IN ARRAY p_old_names LOOP
        SELECT ARRAY(
            SELECT id FROM public.products WHERE name = v_old_name AND id != v_new_id
        ) INTO v_found;
        IF v_found IS NOT NULL AND array_length(v_found, 1) > 0 THEN
            v_old_ids := v_old_ids || v_found;
        END IF;
    END LOOP;

    IF array_length(v_old_ids, 1) > 0 THEN
        UPDATE public.sales SET product_id = v_new_id WHERE product_id = ANY(v_old_ids);
        UPDATE public.stock_entries SET product_id = v_new_id WHERE product_id = ANY(v_old_ids);
        UPDATE public.cash_ledger SET reference_id = v_new_id WHERE reference_id = ANY(v_old_ids);
        DELETE FROM public.products WHERE id = ANY(v_old_ids);
    END IF;
END;
$$;

DO $$
BEGIN
    -- 1. Black leable duty free (with trailing space)
    CALL migrate_product_exact('Black Label Duty Free', ARRAY['Black leable duty free ']);
    
    -- 2. Gordon's Gin (curly apostrophe)
    CALL migrate_product_exact('Gordon''s Gin', ARRAY['Gordon’s Gin']);
    
    -- 3. Jack Daniel's (curly apostrophe)
    CALL migrate_product_exact('Jack Daniel''s Old No. 7', ARRAY['Jack Daniel’s Old No. 7']);
    
    -- 4. Stolichnaya Premium
    CALL migrate_product_exact('Stolichnaya Vodka', ARRAY['Stolichnaya Premium']);
END $$;

DROP PROCEDURE IF EXISTS migrate_product_exact(TEXT, TEXT[]);

COMMIT;

SELECT COUNT(*) AS total_products, STRING_AGG(name, ', ' ORDER BY name) AS product_names FROM public.products;
