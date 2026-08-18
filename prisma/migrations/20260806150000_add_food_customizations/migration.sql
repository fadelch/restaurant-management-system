ALTER TABLE "Food"
ADD COLUMN "description" TEXT,
ADD COLUMN "ingredients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "extraCheesePrice" DOUBLE PRECISION NOT NULL DEFAULT 1.5;

ALTER TABLE "OrderItem"
ADD COLUMN "extraCheese" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "removedIngredients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "customizationNote" TEXT;

UPDATE "Food"
SET
  "description" = CASE
    WHEN LOWER("name") LIKE '%zinger%' THEN 'Crispy chicken fillet served in a toasted bun with fresh vegetables and creamy sauce.'
    WHEN LOWER("name") LIKE '%la7me%' OR LOWER("name") LIKE '%beef%' THEN 'Juicy grilled beef burger served with fresh vegetables, pickles, cheese, and burger sauce.'
    WHEN LOWER("name") LIKE '%pepperoni%' OR LOWER("name") LIKE '%peperoni%' THEN 'Oven-baked pizza topped with tomato sauce, melted mozzarella, and pepperoni.'
    WHEN LOWER("name") LIKE '%twister%' THEN 'Toasted tortilla wrap filled with crispy chicken, fresh vegetables, pickles, and creamy sauce.'
    ELSE "description"
  END,
  "ingredients" = CASE
    WHEN LOWER("name") LIKE '%zinger%' THEN ARRAY['Crispy chicken', 'Lettuce', 'Pickles', 'Creamy sauce', 'Sesame bun']
    WHEN LOWER("name") LIKE '%la7me%' OR LOWER("name") LIKE '%beef%' THEN ARRAY['Beef patty', 'Cheddar cheese', 'Lettuce', 'Tomato', 'Pickles', 'Onion', 'Burger sauce', 'Sesame bun']
    WHEN LOWER("name") LIKE '%pepperoni%' OR LOWER("name") LIKE '%peperoni%' THEN ARRAY['Pizza dough', 'Tomato sauce', 'Mozzarella', 'Pepperoni']
    WHEN LOWER("name") LIKE '%twister%' THEN ARRAY['Crispy chicken', 'Tortilla', 'Lettuce', 'Tomato', 'Pickles', 'Creamy sauce']
    ELSE "ingredients"
  END;
