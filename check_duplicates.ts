import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBrands() {
  const { data: brands, error: brandError } = await supabase.from('brands').select('*');
  const { data: products, error: productError } = await supabase.from('products').select('*');

  if (brandError || productError) {
    console.error(brandError || productError);
    return;
  }

  // Count products for each brand
  const brandList = brands.map(b => {
    const productCount = products.filter(p => p.brand_id === b.id).length;
    return { name: b.name, id: b.id, products: productCount, created: b.created_at };
  });

  // Find duplicates (case-insensitive, trim)
  const normalized = new Map();
  brandList.forEach(b => {
    const norm = b.name.trim().toLowerCase();
    if (!normalized.has(norm)) {
      normalized.set(norm, []);
    }
    normalized.get(norm).push(b);
  });

  const duplicates = [];
  for (const [name, list] of normalized.entries()) {
    if (list.length > 1) {
      duplicates.push({ name, list });
    }
  }
  
  // Look for Château specifically
  const chateau = brandList.filter(b => b.name.toLowerCase().includes('arcins'));

  console.log("=== DUPLICATES ===");
  console.log(JSON.stringify(duplicates, null, 2));

  console.log("=== CHÂTEAU D'ARCINS ===");
  console.log(JSON.stringify(chateau, null, 2));
}

checkBrands();
