UPDATE "Food"
SET "optionalIngredients" = '[
  {"name":"Jalapenos","price":0.50},
  {"name":"Spicy sauce","price":0.30},
  {"name":"Extra crispy chicken","price":2.50}
]'::jsonb
WHERE jsonb_array_length("optionalIngredients") = 0
  AND (LOWER("name") LIKE '%zinger%' OR LOWER("name") LIKE '%chicken burger%');

UPDATE "Food"
SET "optionalIngredients" = '[
  {"name":"Jalapenos","price":0.50},
  {"name":"Caramelized onions","price":0.75},
  {"name":"Extra beef patty","price":2.75}
]'::jsonb
WHERE jsonb_array_length("optionalIngredients") = 0
  AND (LOWER("name") LIKE '%la7me%' OR LOWER("name") LIKE '%beef%' OR LOWER("name") LIKE '%burger%');

UPDATE "Food"
SET "optionalIngredients" = '[
  {"name":"Jalapenos","price":0.50},
  {"name":"Extra pickles","price":0.30},
  {"name":"Extra crispy chicken","price":2.00}
]'::jsonb
WHERE jsonb_array_length("optionalIngredients") = 0
  AND (LOWER("name") LIKE '%twister%' OR LOWER("name") LIKE '%wrap%');
