import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBrandsDetailed() {
  const { data: brands, error: brandError } = await supabase.from('brands').select('*');
  const { data: products, error: productError } = await supabase.from('products').select('*');

  if (brandError || productError) {
    console.error(brandError || productError);
    return;
  }

  const searchNames = [
    "Fernet Branca", "Gordon's", "Hennessy", "Jack Daniel's", "Stoli", "Château d'Arcins"
  ];

  const brandList = brands.filter(b => {
    return searchNames.some(search => b.name.toLowerCase() === search.toLowerCase());
  }).map(b => {
    const brandProducts = products.filter(p => p.brand_id === b.id);
    const totalQuantity = brandProducts.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
    return { 
      name: b.name, 
      distinctProducts: brandProducts.length,
      totalItemsInStock: totalQuantity
    };
  });

  console.log(JSON.stringify(brandList, null, 2));
}

checkBrandsDetailed();
