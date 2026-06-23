-- ==============================================================================
-- TANIKA LIQUOR - SEED CATEGORIES
-- ==============================================================================
-- This script safely inserts your requested categories.
-- Categories can be deleted from the Admin UI as long as there are no 
-- products currently assigned to them (to prevent breaking your inventory).
-- ==============================================================================

-- 1. Insert the exact categories and emojis requested
INSERT INTO public.categories (name, emoji) VALUES
  ('Cognac', '🪵🥃'),
  ('Whisky', '🥃'),
  ('Rum', '🏴☠️🥃'),
  ('Tequila', '🌵'),
  ('Vodka', '❄️'),
  ('Gin', '🍸'),
  ('Champagne', '🍾'),
  ('Wine', '🍷'),
  ('Beer', '🍺'),
  ('Energy Drink', '⚡️')
ON CONFLICT (name) DO UPDATE 
SET emoji = EXCLUDED.emoji; -- Updates the emoji if the category already exists
