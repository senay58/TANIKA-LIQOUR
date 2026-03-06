-- Create a table for Categories
CREATE TABLE public.categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  emoji text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert initial categories
INSERT INTO public.categories (name, emoji) VALUES
  ('Whiskey', '🥃'),
  ('Vodka', '🍸'),
  ('Gin', '🫒'),
  ('Rum', '🏴‍☠️'),
  ('Tequila', '🌵'),
  ('Wine', '🍷'),
  ('Beer', '🍺'),
  ('Brandy', '🥂'),
  ('Liqueur', '🍹');

-- Create a table for Products
CREATE TABLE public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE RESTRICT,
  brand text NOT NULL,
  price_in numeric(10, 2) NOT NULL,
  price_out numeric(10, 2) NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  volume text NOT NULL,
  image_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create a table for Sales History
CREATE TABLE public.sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL,
  price_at_sale numeric(10, 2) NOT NULL,
  description text,
  customer_info text,
  is_reversed boolean DEFAULT false,
  sale_date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: You may want to set up Row Level Security (RLS) policies depending on your authentication setup.
-- For a simple internal tool without auth initially, you can disable RLS or allow anon access conditionally.
-- Assuming anon access is needed for this simple demo:
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read access on categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow anon write access on categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access on categories" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete access on categories" ON public.categories FOR DELETE USING (true);

CREATE POLICY "Allow anon read access on products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow anon write access on products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access on products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete access on products" ON public.products FOR DELETE USING (true);

CREATE POLICY "Allow anon read access on sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Allow anon write access on sales" ON public.sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access on sales" ON public.sales FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete access on sales" ON public.sales FOR DELETE USING (true);
