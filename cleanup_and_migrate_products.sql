-- ==============================================================================
-- TANIKA LIQUOR — PRODUCT CLEAN-UP & SALES MIGRATION SCRIPT
-- ==============================================================================
-- What this script does:
-- 1. Creates a helper procedure to safely migrate sales/stock to the correct product
-- 2. For every old product name → migrates its sales to the canonical new product
-- 3. Handles donjulio split by price_in (18000 → Reposado, 18500 → Añejo)
-- 4. Deletes all old/duplicate products cleanly
-- 5. Reports any leftover products not in the 75-product list that still have sales
-- 6. Deletes any leftover products with NO sales
--
-- SAFE: Everything runs inside a transaction. If anything fails, it all rolls back.
-- ==============================================================================

BEGIN;

-- ── STEP 0: Create helper procedure ──────────────────────────────────────────
-- This procedure finds any products matching any old name, transfers their
-- sales + stock_entries to the canonical new product, then deletes the old records.
CREATE OR REPLACE PROCEDURE migrate_product(p_new_name TEXT, p_old_names TEXT[])
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id    UUID;
    v_old_name  TEXT;
    v_found     UUID[];
    v_old_ids   UUID[] := ARRAY[]::UUID[];
BEGIN
    -- Get the canonical new product (newest created_at in case of duplicates)
    SELECT id INTO v_new_id
    FROM public.products
    WHERE name = p_new_name
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_new_id IS NULL THEN
        RAISE WARNING 'NEW product not found in DB: [%]', p_new_name;
        RETURN;
    END IF;

    -- Collect all old product IDs that match any of the old names (case-insensitive)
    FOREACH v_old_name IN ARRAY p_old_names LOOP
        SELECT ARRAY(
            SELECT id FROM public.products
            WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_old_name))
              AND id != v_new_id
        ) INTO v_found;
        IF v_found IS NOT NULL AND array_length(v_found, 1) > 0 THEN
            v_old_ids := v_old_ids || v_found;
        END IF;
    END LOOP;

    IF array_length(v_old_ids, 1) IS NULL THEN
        RAISE NOTICE 'No old products to migrate for → [%]', p_new_name;
        RETURN;
    END IF;

    -- Transfer sales
    UPDATE public.sales SET product_id = v_new_id WHERE product_id = ANY(v_old_ids);
    -- Transfer stock entries
    UPDATE public.stock_entries SET product_id = v_new_id WHERE product_id = ANY(v_old_ids);
    -- Transfer cash ledger references (restock records)
    UPDATE public.cash_ledger SET reference_id = v_new_id WHERE reference_id = ANY(v_old_ids);
    -- Delete the old products
    DELETE FROM public.products WHERE id = ANY(v_old_ids);

    RAISE NOTICE 'Deleted % old product(s) → merged into "%"',
        array_length(v_old_ids, 1), p_new_name;
END;
$$;


-- ── STEP 1: Run all migrations ────────────────────────────────────────────────
DO $$
DECLARE
    v_new_id  UUID;
    v_old_id  UUID;
BEGIN

    -- ── Vodka ──────────────────────────────────────────────────────────────────
    CALL migrate_product('Absolut Blue',          ARRAY['Absolute blue', 'Absolut Blue']);
    CALL migrate_product('Champion Vodka',         ARRAY['champion vodca', 'Champion Vodka']);
    CALL migrate_product('Cîroc',                  ARRAY['ciroc', 'Cîroc']);
    CALL migrate_product('Grey Goose',             ARRAY['Grey Goose']);
    CALL migrate_product('Marathon Premium Vodka', ARRAY['Marathon Premium Vodka']);
    CALL migrate_product('Stolichnaya Vodka',      ARRAY['stochinia vodca', 'Stolichnaya Vodka']);
    CALL migrate_product('Stolichnaya Vodka 50 ml',ARRAY['stochinia vodca 50 ml', 'Stolichnaya Vodka 50 ml']);
    CALL migrate_product('Stolichnaya Vodka 75 ml',ARRAY['stochinia vodka 75 ML', 'Stolichnaya Vodka 75 ml']);

    -- ── Gin ────────────────────────────────────────────────────────────────────
    CALL migrate_product('Beefeater',              ARRAY['beffeter', 'Beefeater']);
    CALL migrate_product('Champion Coffee',        ARRAY['champion coffee', 'Champion Coffee']);
    CALL migrate_product('Champion Gin',           ARRAY['champion gin', 'Champion Gin']);
    CALL migrate_product('Gordon''s Gin',          ARRAY['gordon', 'Gordon gin', 'Gordon''s Gin']);
    CALL migrate_product('Marathon Premium Gin',   ARRAY['Marathon Premium Gin']);
    CALL migrate_product('Tanqueray',              ARRAY['tanquary', 'Tanqueray']);

    -- ── Whisky ─────────────────────────────────────────────────────────────────
    CALL migrate_product('Black Label Duty Free',           ARRAY['Black leabl duty free', 'Black Label Duty Free']);
    CALL migrate_product('Chivas Regal 18',                 ARRAY['chivas regal 18', 'Chivas Regal 18']);
    CALL migrate_product('Chivas Regal 12 Years',           ARRAY['Chivas Regal 12 Years']);
    CALL migrate_product('Fireball Cinnamon',               ARRAY['fireball', 'Fireball Cinnamon']);
    CALL migrate_product('Glenfiddich 15 Years',            ARRAY['Glenfiddich 15 Years']);
    CALL migrate_product('Jack Daniel''s Old No. 7',        ARRAY['Jack Daniel''s Old No. 7']);
    CALL migrate_product('Johnnie Walker Black Label',      ARRAY['black leable', 'Johnnie Walker Black Label']);
    CALL migrate_product('Johnnie Walker Blue Label',       ARRAY['Johnnie Walker Blue Label']);
    CALL migrate_product('Johnnie Walker Double Black',     ARRAY['dubble black', 'Dubble black', 'Johnnie Walker Double Black']);
    CALL migrate_product('Johnnie Walker Gold Label',       ARRAY['Gold Label', 'Gold leable', 'Gold Leable', 'Johnnie Walker Gold Label']);
    CALL migrate_product('Johnnie Walker Green Label',      ARRAY['green leable', 'Johnnie Walker Green Label']);
    CALL migrate_product('Johnnie Walker King George V',    ARRAY['king jorje', 'Johnnie Walker King George V']);
    CALL migrate_product('Johnnie Walker Platinum 18 Years',ARRAY['Johnnie Walker Platinum 18 Years']);
    CALL migrate_product('Johnnie Walker Red Label',        ARRAY['Johnnie Walker Red Label']);
    CALL migrate_product('White Horse',                     ARRAY['White Horse']);

    -- ── Rum / Liqueur / Cream ──────────────────────────────────────────────────
    CALL migrate_product('Amarula Cream',      ARRAY['Amarula Cream']);
    CALL migrate_product('Bacardi Rum',        ARRAY['Bacardi Rum']);
    CALL migrate_product('Baileys Irish Cream',ARRAY['Baileys Irish Cream']);
    CALL migrate_product('Bols Triple Sec',    ARRAY['bols triple', 'Bols Triple Sec']);
    CALL migrate_product('Captain Morgan Gold',ARRAY['captain morgan', 'Captain Morgan Gold']);
    CALL migrate_product('Fernet Branca',      ARRAY['Fernet Branca']);
    CALL migrate_product('Jägermeister',       ARRAY['Jägermeister']);
    CALL migrate_product('Martini Rosso',      ARRAY['martin rosso', 'Martini Rosso']);
    CALL migrate_product('Patrón Sambuca',     ARRAY['patrol sambuca', 'Patrón Sambuca']);

    -- ── Tequila ────────────────────────────────────────────────────────────────
    CALL migrate_product('Camino',             ARRAY['Camino']);
    CALL migrate_product('Camino Silver',      ARRAY['Camino Silver']);
    CALL migrate_product('Casamigos Silver',   ARRAY['Casamigos', 'Casamigos Silver']);
    CALL migrate_product('Casamigos Tequila',  ARRAY['Casamigos Tequila']);
    CALL migrate_product('José Cuervo Gold',   ARRAY['Josses curvo gold', 'José Cuervo Gold']);
    CALL migrate_product('José Cuervo Silver', ARRAY['Jose''s curvo silver', 'José Cuervo Silver']);
    CALL migrate_product('Patrón Silver',      ARRAY['Patrón Silver']);
    CALL migrate_product('XO Coffee',          ARRAY['xo coffee', 'XO Coffee']);

    -- ── Don Julio — SPECIAL CASE: split by price_in ───────────────────────────
    -- Don Julio Reposado: old product named 'donjulio' with price_in = 18000
    SELECT id INTO v_new_id FROM public.products WHERE name = 'Don Julio Reposado' ORDER BY created_at DESC LIMIT 1;
    SELECT id INTO v_old_id FROM public.products
        WHERE LOWER(TRIM(name)) = 'donjulio'
          AND ABS(price_in - 18000) < 200
        ORDER BY created_at ASC LIMIT 1;
    IF v_new_id IS NOT NULL AND v_old_id IS NOT NULL AND v_old_id != v_new_id THEN
        UPDATE public.sales        SET product_id  = v_new_id WHERE product_id  = v_old_id;
        UPDATE public.stock_entries SET product_id = v_new_id WHERE product_id  = v_old_id;
        UPDATE public.cash_ledger  SET reference_id = v_new_id WHERE reference_id = v_old_id;
        DELETE FROM public.products WHERE id = v_old_id;
        RAISE NOTICE 'donjulio (price_in≈18000) → Don Julio Reposado: DONE';
    ELSE
        RAISE WARNING 'Could not match donjulio with price_in≈18000. Check manually!';
    END IF;

    -- Don Julio Añejo: old product named 'donjulio' with price_in = 18500
    SELECT id INTO v_new_id FROM public.products WHERE name = 'Don Julio Añejo' ORDER BY created_at DESC LIMIT 1;
    SELECT id INTO v_old_id FROM public.products
        WHERE LOWER(TRIM(name)) = 'donjulio'
          AND ABS(price_in - 18500) < 200
        ORDER BY created_at ASC LIMIT 1;
    IF v_new_id IS NOT NULL AND v_old_id IS NOT NULL AND v_old_id != v_new_id THEN
        UPDATE public.sales        SET product_id  = v_new_id WHERE product_id  = v_old_id;
        UPDATE public.stock_entries SET product_id = v_new_id WHERE product_id  = v_old_id;
        UPDATE public.cash_ledger  SET reference_id = v_new_id WHERE reference_id = v_old_id;
        DELETE FROM public.products WHERE id = v_old_id;
        RAISE NOTICE 'donjulio (price_in≈18500) → Don Julio Añejo: DONE';
    ELSE
        RAISE WARNING 'Could not match donjulio with price_in≈18500. Check manually!';
    END IF;

    -- ── Cognac ─────────────────────────────────────────────────────────────────
    CALL migrate_product('Hennessy XO', ARRAY['henessy xo', 'Hennessy XO']);

    -- ── Wine ───────────────────────────────────────────────────────────────────
    CALL migrate_product('Acacia Medium Sweet White',                          ARRAY['Acacia medium sweet white', 'Acacia Medium Sweet White']);
    CALL migrate_product('Antica Natural Sweet Red',                           ARRAY['Antica Natural Sweet Red']);
    CALL migrate_product('Antica Natural Sweet Rosé',                          ARRAY['Antica Natural Sweet Rosé']);
    CALL migrate_product('Antica Natural Sweet White',                         ARRAY['Antica Natural Sweet White']);
    CALL migrate_product('Awash Gebeta Red',                                   ARRAY['Awash Gebeta Red']);
    CALL migrate_product('Awash Gebeta Rosé',                                  ARRAY['Awash Gebeta Rosé']);
    CALL migrate_product('Castel Acacia Medium Sweet Red',                     ARRAY['Castel Acacia Medium Sweet Red']);
    CALL migrate_product('Castel Acacia Medium Sweet Rosé',                    ARRAY['Castel Acacia Medium Sweet Rosé']);
    CALL migrate_product('Castel Cuvée Prestige Dry Red Malbec',               ARRAY['Castel Cuvée Prestige Dry Red Malbec']);
    CALL migrate_product('Castel Cuvée Prestige Dry Red White',                ARRAY['Castel Cuvée Prestige Dry Red White']);
    CALL migrate_product('Castel Rift Valley Cabernet Sauvignon',              ARRAY['Castel Rift Valley Cabernet Sauvignon']);
    CALL migrate_product('Castel Rift Valley Malbec',                          ARRAY['Castel Rift Valley Malbec']);
    CALL migrate_product('Castel Rift Valley Syrah',                           ARRAY['Castel Rift Valley Syrah']);
    CALL migrate_product('Château Barreyres',                                  ARRAY['Château Barreyres']);
    CALL migrate_product('Château d''Arcins',                                  ARRAY['Château d''Arcins']);
    CALL migrate_product('Fentel Pro Rosé',                                    ARRAY['fentel prorose', 'Fentel Pro Rosé']);
    CALL migrate_product('Maison Castel Cabernet Sauvignon',                   ARRAY['Maison Castel Cabernet Sauvignon']);
    CALL migrate_product('Maison Castel Chablis',                              ARRAY['Maison Castel Chablis']);
    CALL migrate_product('Maison Castel Chardonnay',                           ARRAY['Maison Castel Chardonnay']);
    CALL migrate_product('Maison Castel Côtes du Rhône Grenache Syrah',        ARRAY['Maison Castel Côtes du Rhône Grenache Syrah']);

    -- ── Champagne ──────────────────────────────────────────────────────────────
    CALL migrate_product('Bottega White',                                      ARRAY['Bottega White']);
    CALL migrate_product('Maison Castel Ice Sparkling Demi Sec Cuvée Blanche', ARRAY['Maison Castel Ice Sparkling Demi Sec Cuvee Blanche','Maison Castel Ice Sparkling Demi Sec Cuvée Blanche']);
    CALL migrate_product('Maison Castel Ice Sparkling Demi Sec Cuvée Rosé',    ARRAY['Maison Castel Ice Sparkling Demi Sec Cuvee Rosé',   'Maison Castel Ice Sparkling Demi Sec Cuvée Rosé']);
    CALL migrate_product('Maison Castel Sparkling Cuvée Blanche',              ARRAY['Maison Castel Sparkling Cuvee Blanche',             'Maison Castel Sparkling Cuvée Blanche']);
    CALL migrate_product('Moët & Chandon Impérial',                            ARRAY['Moët & Chandon Impérial']);

    -- ── Energy Drink ───────────────────────────────────────────────────────────
    CALL migrate_product('Red Bull', ARRAY['Red Bull']);

END $$;


-- ── STEP 2: Report & clean up anything NOT in the 75-product list ─────────────
DO $$
DECLARE
    v_report TEXT;
    v_deleted INT;
BEGIN

    -- Report products outside the 75-list that STILL HAVE SALES (do NOT delete)
    SELECT STRING_AGG(p.name || ' (' || sale_count::TEXT || ' sales)', E'\n')
    INTO v_report
    FROM (
        SELECT p.name, COUNT(s.id) AS sale_count
        FROM public.products p
        LEFT JOIN public.sales s ON s.product_id = p.id
        WHERE p.name NOT IN (
            'Absolut Blue','Acacia Medium Sweet White','Amarula Cream',
            'Antica Natural Sweet Red','Antica Natural Sweet Rosé','Antica Natural Sweet White',
            'Awash Gebeta Red','Awash Gebeta Rosé','Bacardi Rum',
            'Baileys Irish Cream','Beefeater','Black Label Duty Free',
            'Bols Triple Sec','Bottega White','Camino','Camino Silver',
            'Captain Morgan Gold','Casamigos Silver','Casamigos Tequila',
            'Castel Acacia Medium Sweet Red','Castel Acacia Medium Sweet Rosé',
            'Castel Cuvée Prestige Dry Red Malbec','Castel Cuvée Prestige Dry Red White',
            'Castel Rift Valley Cabernet Sauvignon','Castel Rift Valley Malbec',
            'Castel Rift Valley Syrah','Champion Coffee','Champion Gin','Champion Vodka',
            'Château Barreyres','Château d''Arcins','Chivas Regal 18','Chivas Regal 12 Years',
            'Cîroc','Don Julio Reposado','Don Julio Añejo',
            'Johnnie Walker Double Black','Fentel Pro Rosé','Fernet Branca',
            'Fireball Cinnamon','Glenfiddich 15 Years','Johnnie Walker Gold Label',
            'Gordon''s Gin','Johnnie Walker Green Label','Grey Goose','Hennessy XO',
            'Jack Daniel''s Old No. 7','Jägermeister','Johnnie Walker Black Label',
            'Johnnie Walker Blue Label','Johnnie Walker Platinum 18 Years',
            'Johnnie Walker Red Label','José Cuervo Silver','José Cuervo Gold',
            'Johnnie Walker King George V','Maison Castel Cabernet Sauvignon',
            'Maison Castel Chablis','Maison Castel Chardonnay',
            'Maison Castel Côtes du Rhône Grenache Syrah',
            'Maison Castel Ice Sparkling Demi Sec Cuvée Blanche',
            'Maison Castel Ice Sparkling Demi Sec Cuvée Rosé',
            'Maison Castel Sparkling Cuvée Blanche',
            'Marathon Premium Gin','Marathon Premium Vodka','Martini Rosso',
            'Moët & Chandon Impérial','Patrón Sambuca','Patrón Silver',
            'Red Bull','Stolichnaya Vodka','Stolichnaya Vodka 50 ml',
            'Stolichnaya Vodka 75 ml','Tanqueray','White Horse','XO Coffee'
        )
        GROUP BY p.name
        HAVING COUNT(s.id) > 0
    ) p;

    IF v_report IS NOT NULL THEN
        RAISE WARNING E'=== MANUAL REVIEW NEEDED ===\nThe following products are outside the 75-product list and still have sales attached.\nThey were NOT deleted — please review them manually:\n%', v_report;
    END IF;

    -- Delete products outside the 75-list that have ZERO sales (safe to remove)
    DELETE FROM public.products
    WHERE name NOT IN (
        'Absolut Blue','Acacia Medium Sweet White','Amarula Cream',
        'Antica Natural Sweet Red','Antica Natural Sweet Rosé','Antica Natural Sweet White',
        'Awash Gebeta Red','Awash Gebeta Rosé','Bacardi Rum',
        'Baileys Irish Cream','Beefeater','Black Label Duty Free',
        'Bols Triple Sec','Bottega White','Camino','Camino Silver',
        'Captain Morgan Gold','Casamigos Silver','Casamigos Tequila',
        'Castel Acacia Medium Sweet Red','Castel Acacia Medium Sweet Rosé',
        'Castel Cuvée Prestige Dry Red Malbec','Castel Cuvée Prestige Dry Red White',
        'Castel Rift Valley Cabernet Sauvignon','Castel Rift Valley Malbec',
        'Castel Rift Valley Syrah','Champion Coffee','Champion Gin','Champion Vodka',
        'Château Barreyres','Château d''Arcins','Chivas Regal 18','Chivas Regal 12 Years',
        'Cîroc','Don Julio Reposado','Don Julio Añejo',
        'Johnnie Walker Double Black','Fentel Pro Rosé','Fernet Branca',
        'Fireball Cinnamon','Glenfiddich 15 Years','Johnnie Walker Gold Label',
        'Gordon''s Gin','Johnnie Walker Green Label','Grey Goose','Hennessy XO',
        'Jack Daniel''s Old No. 7','Jägermeister','Johnnie Walker Black Label',
        'Johnnie Walker Blue Label','Johnnie Walker Platinum 18 Years',
        'Johnnie Walker Red Label','José Cuervo Silver','José Cuervo Gold',
        'Johnnie Walker King George V','Maison Castel Cabernet Sauvignon',
        'Maison Castel Chablis','Maison Castel Chardonnay',
        'Maison Castel Côtes du Rhône Grenache Syrah',
        'Maison Castel Ice Sparkling Demi Sec Cuvée Blanche',
        'Maison Castel Ice Sparkling Demi Sec Cuvée Rosé',
        'Maison Castel Sparkling Cuvée Blanche',
        'Marathon Premium Gin','Marathon Premium Vodka','Martini Rosso',
        'Moët & Chandon Impérial','Patrón Sambuca','Patrón Silver',
        'Red Bull','Stolichnaya Vodka','Stolichnaya Vodka 50 ml',
        'Stolichnaya Vodka 75 ml','Tanqueray','White Horse','XO Coffee'
    )
    AND id NOT IN (SELECT DISTINCT product_id FROM public.sales WHERE product_id IS NOT NULL);

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % extra/test products with no sales.', v_deleted;
    RAISE NOTICE '=== CLEANUP COMPLETE ===';
END $$;


-- ── STEP 3: Drop the helper procedure ────────────────────────────────────────
DROP PROCEDURE IF EXISTS migrate_product(TEXT, TEXT[]);


COMMIT;

-- ── Final check: How many products remain? ────────────────────────────────────
SELECT COUNT(*) AS total_products,
       STRING_AGG(name, ', ' ORDER BY name) AS product_names
FROM public.products;
