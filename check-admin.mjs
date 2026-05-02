import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase.from('admin_config').select('*');
  if (error) {
    console.error("Error fetching admin_config:", error);
    return;
  }
  console.log("Admin Config Content:", data);
}

check();
