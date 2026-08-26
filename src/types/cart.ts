import type { FoodItem, OptionalIngredient } from "@/types/food";

export type CartCustomization = {
  extraCheese: boolean;
  removedIngredients: string[];
  addedIngredients: OptionalIngredient[];
  customizationNote: string;
};

export type CartItem = FoodItem & {
  cartKey: string;
  cartQty: number;
  unitPrice: number;
  customization: CartCustomization;
};

