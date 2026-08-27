import type { Prisma } from "@/generated/prisma";
import type { z } from "zod";
import type { foodSchema } from "@/lib/validation";
import type { publicMenuFoodSelect } from "@/lib/prismaSelects";

export type OptionalIngredient = { name: string; price: number };

export type FoodTypeSummary = Prisma.FoodTypeGetPayload<Record<string, never>>;

type MenuFoodRecord = Prisma.FoodGetPayload<{
  select: typeof publicMenuFoodSelect;
}>;

export type FoodItem = MenuFoodRecord & {
  isFavorite?: boolean;
  popularity?: number;
};

export type AdminFoodItem = Prisma.FoodGetPayload<{
  include: {
    type: true;
    orderItems: { select: { id: true } };
  };
}>;

export type FoodInput = z.input<typeof foodSchema>;
export type CreateFoodInput = FoodInput;
export type UpdateFoodInput = FoodInput & { id: string };
