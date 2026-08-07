import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmptyBrands() {
  const { data: brands, error: brandError } = await supabase.from('brands').select('*');
  const { data: products, error: productError } = await supabase.from('products').select('*');

  if (brandError || productError) {
    console.error(brandError || productError);
    return;
  }

  const emptyBrands = brands.filter(b => {
    // Check if any product has this brand's id in `brand_id` column
    return !products.some(p => p.brand_id === b.id);
  });

  console.log(JSON.stringify(emptyBrands, null, 2));
}

checkEmptyBrands();
