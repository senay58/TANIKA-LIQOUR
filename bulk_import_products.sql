-- ==============================================================================
-- TANIKA LIQUOR — BULK PRODUCT IMPORT SCRIPT
-- ==============================================================================
-- SAFE TO RUN ON LIVE DATABASE.
-- ✅ Does NOT touch: sales, credits, cash_ledger tables
-- ✅ Does NOT drop or recreate any triggers or functions
-- ✅ Existing products → metadata updated only (quantity left untouched)
-- ✅ New products     → inserted with initial stock via stock_entries (trigger fires correctly)
-- ==============================================================================

BEGIN;

-- ─── STEP 1: INSERT BRANDS ────────────────────────────────────────────────────
-- ON CONFLICT DO NOTHING preserves existing brand IDs so no sales references break.
INSERT INTO public.brands (name) VALUES
  ('Absolut'),
  ('Acacia'),
  ('Amarula'),
  ('Antica'),
  ('Awash'),
  ('Bacardi'),
  ('Baileys'),
  ('Beefeater'),
  ('Bols'),
  ('Bottega'),
  ('Camino'),
  ('Captain Morgan'),
  ('Casamigos'),
  ('Castel'),
  ('Champion'),
  ('ET'),
  ('Château Barreyres'),
  ('Château d''Arcins'),
  ('Chivas Regal'),
  ('Cîroc'),
  ('Don Julio'),
  ('Fentel'),
  ('Fernet Branca'),
  ('Fireball'),
  ('Glenfiddich'),
  ('Gordon''s'),
  ('Grey Goose'),
  ('Hennessy'),
  ('Jack Daniel''s'),
  ('Jägermeister'),
  ('Johnnie Walker'),
  ('José Cuervo'),
  ('Maison Castel'),
  ('Marathon'),
  ('Martini'),
  ('Moët & Chandon'),
  ('Patrón'),
  ('Red Bull'),
  ('Stoli'),
  ('Tanqueray'),
  ('White Horse'),
  ('XO')
ON CONFLICT (name) DO NOTHING;

-- ─── STEP 2: UPSERT PRODUCTS ──────────────────────────────────────────────────
DO $$
DECLARE
  v_brand_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  rec         RECORD;
BEGIN

  FOR rec IN (
    SELECT * FROM (VALUES
      -- (product_name,                                          brand_name,          category_name,   qty, price_in,  price_out, volume )
      ('Absolut Blue',                                           'Absolut',           'Vodka',           10,  6100.00,   7000.00, '750ml'),
      ('Acacia Medium Sweet White',                              'Acacia',            'Wine',             0,  1230.00,   1650.00, '750ml'),
      ('Amarula Cream',                                          'Amarula',           'Rum',              4,  7900.00,   9400.00, '750ml'),
      ('Antica Natural Sweet Red',                               'Antica',            'Wine',            14,  2000.00,   2400.00, '750ml'),
      ('Antica Natural Sweet Rosé',                              'Antica',            'Wine',             1,  2000.00,   2400.00, '750ml'),
      ('Antica Natural Sweet White',                             'Antica',            'Wine',             7,  2000.00,   2400.00, '750ml'),
      ('Awash Gebeta Red',                                       'Awash',             'Wine',             0,   808.00,   1450.00, '750ml'),
      ('Awash Gebeta Rosé',                                      'Awash',             'Wine',             7,   808.00,   1450.00, '750ml'),
      ('Bacardi Rum',                                            'Bacardi',           'Rum',              8,   450.00,   9000.00, '750ml'),
      ('Baileys Irish Cream',                                    'Baileys',           'Rum',              0,  6210.00,   7500.00, '750ml'),
      ('Beefeater',                                              'Beefeater',         'Gin',              1,  5800.00,   6200.00, '750ml'),
      ('Black Label Duty Free',                                  'Johnnie Walker',    'Whisky',          29, 10500.00,  12000.00, '1L'),
      ('Bols Triple Sec',                                        'Bols',              'Rum',              5,  6000.00,   7400.00, '750ml'),
      ('Bottega White',                                          'Bottega',           'Champagne',        3,  4313.00,   5400.00, '750ml'),
      ('Camino',                                                 'Camino',            'Tequila',          5,  6500.00,   8500.00, '750ml'),
      ('Camino Silver',                                          'Camino',            'Tequila',          5,  7200.00,   8500.00, '750ml'),
      ('Captain Morgan Gold',                                    'Captain Morgan',    'Rum',              5,  7000.00,  12300.00, '750ml'),
      ('Casamigos Silver',                                       'Casamigos',         'Tequila',          3, 15000.00,  25000.00, '750ml'),
      ('Casamigos Tequila',                                      'Casamigos',         'Tequila',          1, 24365.00,  25000.00, '750ml'),
      ('Castel Acacia Medium Sweet Red',                         'Castel',            'Wine',             6,  1030.00,   1450.00, '750ml'),
      ('Castel Acacia Medium Sweet Rosé',                        'Castel',            'Wine',             1,  1030.00,   1450.00, '750ml'),
      ('Castel Cuvée Prestige Dry Red Malbec',                   'Castel',            'Wine',             7,  1500.00,   2200.00, '750ml'),
      ('Castel Cuvée Prestige Dry Red White',                    'Castel',            'Wine',             6,  1700.00,   2700.00, '750ml'),
      ('Castel Rift Valley Cabernet Sauvignon',                  'Castel',            'Wine',             5,  1030.00,   1450.00, '750ml'),
      ('Castel Rift Valley Malbec',                              'Castel',            'Wine',             6,  1030.00,   1450.00, '750ml'),
      ('Castel Rift Valley Syrah',                               'Castel',            'Wine',            10,  1030.00,   1450.00, '750ml'),
      ('Champion Coffee',                                        'Champion',          'Gin',             42,  2400.00,   2900.00, '750ml'),
      ('Champion Gin',                                           'Champion',          'Gin',             35,  2400.00,   2900.00, '750ml'),
      ('Champion Vodka',                                         'ET',                'Vodka',           29,  2200.00,   2900.00, '750ml'),
      ('Château Barreyres',                                      'Château Barreyres', 'Wine',             0,  3200.00,   3000.00, '750ml'),
      ('Château d''Arcins',                                      'Château d''Arcins', 'Wine',             0,  3200.00,   4000.00, '750ml'),
      ('Chivas Regal 18',                                        'Chivas Regal',      'Whisky',           6, 18500.00,  28000.00, '750ml'),
      ('Chivas Regal 12 Years',                                  'Chivas Regal',      'Whisky',           0,  8090.00,  10500.00, '750ml'),
      ('Cîroc',                                                  'Cîroc',             'Vodka',            5, 12500.00,  14000.00, '750ml'),
      ('Don Julio Reposado',                                     'Don Julio',         'Tequila',          4, 18000.00,  24750.00, '750ml'),
      ('Don Julio Añejo',                                        'Don Julio',         'Tequila',          3, 18500.00,  25000.00, '750ml'),
      ('Johnnie Walker Double Black',                            'Johnnie Walker',    'Whisky',          17, 10200.00,  13800.00, '750ml'),
      ('Fentel Pro Rosé',                                        'Fentel',            'Wine',             8,  2900.00,   3700.00, '750ml'),
      ('Fernet Branca',                                          'Fernet Branca',     'Rum',              0, 10170.00,  12300.00, '750ml'),
      ('Fireball Cinnamon',                                      'Fireball',          'Whisky',           5,  3500.00,   4500.00, '750ml'),
      ('Glenfiddich 15 Years',                                   'Glenfiddich',       'Whisky',           2, 20330.00,  24850.00, '750ml'),
      ('Johnnie Walker Gold Label',                              'Johnnie Walker',    'Whisky',          16, 15000.00,  17800.00, '750ml'),
      ('Gordon''s Gin',                                          'Gordon''s',         'Gin',             40,  5900.00,   6500.00, '750ml'),
      ('Johnnie Walker Green Label',                             'Johnnie Walker',    'Whisky',           5, 27000.00,  33000.00, '750ml'),
      ('Grey Goose',                                             'Grey Goose',        'Vodka',            8, 12780.00,  13800.00, '750ml'),
      ('Hennessy XO',                                            'Hennessy',          'Cognac',           1, 55500.00,  76000.00, '750ml'),
      ('Jack Daniel''s Old No. 7',                               'Jack Daniel''s',    'Whisky',           1,  8990.00,  10500.00, '750ml'),
      ('Jägermeister',                                           'Jägermeister',      'Rum',             10,  5700.00,   6500.00, '750ml'),
      ('Johnnie Walker Black Label',                             'Johnnie Walker',    'Whisky',          48,  8900.00,  10400.00, '750ml'),
      ('Johnnie Walker Blue Label',                              'Johnnie Walker',    'Whisky',           1, 59500.00,  63530.00, '750ml'),
      ('Johnnie Walker Platinum 18 Years',                       'Johnnie Walker',    'Whisky',           0, 27500.00,  32000.00, '750ml'),
      ('Johnnie Walker Red Label',                               'Johnnie Walker',    'Whisky',          18,  5200.00,   6800.00, '750ml'),
      ('José Cuervo Silver',                                     'José Cuervo',       'Tequila',          6, 10800.00,  12000.00, '750ml'),
      ('José Cuervo Gold',                                       'José Cuervo',       'Tequila',         12, 10800.00,  12000.00, '750ml'),
      ('Johnnie Walker King George V',                           'Johnnie Walker',    'Whisky',           1, 97000.00, 130000.00, '750ml'),
      ('Maison Castel Cabernet Sauvignon',                       'Maison Castel',     'Wine',             4,  2100.00,   3800.00, '750ml'),
      ('Maison Castel Chablis',                                  'Maison Castel',     'Wine',             5,  3500.00,   4200.00, '750ml'),
      ('Maison Castel Chardonnay',                               'Maison Castel',     'Wine',             6,  2100.00,   4000.00, '750ml'),
      ('Maison Castel Côtes du Rhône Grenache Syrah',            'Maison Castel',     'Wine',             0,  2300.00,   4000.00, '750ml'),
      ('Maison Castel Ice Sparkling Demi Sec Cuvée Blanche',     'Maison Castel',     'Champagne',        0,  2800.00,   3500.00, '750ml'),
      ('Maison Castel Ice Sparkling Demi Sec Cuvée Rosé',        'Maison Castel',     'Champagne',        2,  2800.00,   3500.00, '750ml'),
      ('Maison Castel Sparkling Cuvée Blanche',                  'Maison Castel',     'Champagne',        1,  2900.00,   3400.00, '750ml'),
      ('Marathon Premium Gin',                                   'Marathon',          'Gin',             14,  1600.00,   2800.00, '750ml'),
      ('Marathon Premium Vodka',                                 'Marathon',          'Vodka',            4,  1600.00,   2800.00, '750ml'),
      ('Martini Rosso',                                          'Martini',           'Rum',              5,  6500.00,   8000.00, '750ml'),
      ('Moët & Chandon Impérial',                                'Moët & Chandon',    'Champagne',        4, 14375.00,  19100.00, '750ml'),
      ('Patrón Sambuca',                                         'Patrón',            'Rum',              5,  4800.00,   6900.00, '750ml'),
      ('Patrón Silver',                                          'Patrón',            'Tequila',          5,  6693.00,  24200.00, '750ml'),
      ('Red Bull',                                               'Red Bull',          'Energy Drink',    15,   450.00,    650.00, '250ml'),
      ('Stolichnaya Vodka',                                      'Stoli',             'Vodka',            5,  3950.00,   4600.00, '750ml'),
      ('Stolichnaya Vodka 50 ml',                                'Stoli',             'Vodka',            2,  3000.00,   3500.00, '50ml'),
      ('Stolichnaya Vodka 75 ml',                                'Stoli',             'Vodka',           28,  3500.00,   4150.00, '75ml'),
      ('Tanqueray',                                              'Tanqueray',         'Gin',              6,  7000.00,   8200.00, '750ml'),
      ('White Horse',                                            'White Horse',       'Whisky',           7,  4950.00,   6800.00, '750ml'),
      ('XO Coffee',                                              'XO',                'Tequila',          1, 22000.00,  24750.00, '750ml')
    ) AS t(p_name, p_brand, p_cat, p_qty, p_price_in, p_price_out, p_volume)
  )
  LOOP
    -- Resolve brand_id
    SELECT id INTO v_brand_id FROM public.brands WHERE name = rec.p_brand LIMIT 1;

    -- Resolve category_id
    SELECT id INTO v_cat_id FROM public.categories WHERE name = rec.p_cat LIMIT 1;

    -- Check if product already exists (match by name)
    SELECT id INTO v_prod_id FROM public.products WHERE name = rec.p_name LIMIT 1;

    IF v_prod_id IS NOT NULL THEN
      -- ── EXISTING PRODUCT ──────────────────────────────────────────────────────
      -- Update metadata only. Quantity is NOT changed — it reflects live sales.
      UPDATE public.products SET
        brand_id    = v_brand_id,
        category_id = v_cat_id,
        price_in    = rec.p_price_in,
        price_out   = rec.p_price_out,
        volume      = rec.p_volume,
        updated_at  = NOW()
      WHERE id = v_prod_id;

    ELSE
      -- ── NEW PRODUCT ───────────────────────────────────────────────────────────
      -- Insert with quantity = 0. The stock_entry below fires the trigger which
      -- correctly updates products.quantity and logs the cost to cash_ledger.
      INSERT INTO public.products
        (name, brand_id, category_id, price_in, price_out, quantity, min_stock, volume)
      VALUES
        (rec.p_name, v_brand_id, v_cat_id, rec.p_price_in, rec.p_price_out, 0, 3, rec.p_volume)
      RETURNING id INTO v_prod_id;

      -- Add initial stock only if quantity > 0
      IF rec.p_qty > 0 THEN
        INSERT INTO public.stock_entries (product_id, price_in, quantity_added)
        VALUES (v_prod_id, rec.p_price_in, rec.p_qty);
        -- The on_stock_entry_added trigger fires here:
        -- → Updates products.quantity += qty
        -- → Inserts restock record into cash_ledger
      END IF;

    END IF;

  END LOOP;
END $$;

COMMIT;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
