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

  const searchNames = [
    "anjo", "cinamon", "Fernet", "Fernet branca", "gin", "gordon", "henessy", "Hennessy", 
    "Jack Daniel", "patron", "Patron", "patrol", "repisado", "rosso", "Stoli", "Stolichnaya", 
    "Stolli", "vodca", "Vodka"
  ];

  const brandList = brands.filter(b => {
    return searchNames.some(search => b.name.toLowerCase().includes(search.toLowerCase()));
  }).map(b => {
    const productCount = products.filter(p => p.brand_id === b.id).length;
    return { name: b.name, products: productCount };
  });

  console.log(JSON.stringify(brandList, null, 2));
}

checkBrands();
