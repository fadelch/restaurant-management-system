ALTER TABLE "Food"
ADD COLUMN "optionalIngredients" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "OrderItem"
ADD COLUMN "addedIngredients" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "Food"
SET "optionalIngredients" = '[
  {"name":"Mushrooms","price":0.75},
  {"name":"Black olives","price":0.50},
  {"name":"Green peppers","price":0.50},
  {"name":"Onions","price":0.40},
  {"name":"Corn","price":0.50},
  {"name":"Extra pepperoni","price":1.25}
]'::jsonb
WHERE LOWER("name") LIKE '%pizza%'
   OR LOWER("name") LIKE '%pepperoni%'
   OR LOWER("name") LIKE '%peperoni%';
