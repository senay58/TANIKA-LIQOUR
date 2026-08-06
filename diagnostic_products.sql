-- Run this in Supabase SQL Editor to see ALL current products
-- So we can identify which old ones need to be mapped to new ones

SELECT 
    p.id,
    p.name AS product_name,
    b.name AS brand,
    c.name AS category,
    p.quantity,
    p.price_out,
    (SELECT COUNT(*) FROM public.sales s WHERE s.product_id = p.id) AS sales_count
FROM public.products p
LEFT JOIN public.brands b ON b.id = p.brand_id
LEFT JOIN public.categories c ON c.id = p.category_id
ORDER BY b.name, p.name;
