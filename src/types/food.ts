import type { Prisma } from "@/generated/prisma";
import type { z } from "zod";
import type { foodSchema } from "@/lib/validation";
import type {
  adminFoodListInclude,
  publicMenuFoodSelect,
} from "@/lib/prismaSelects";
import type { Serialized } from "@/lib/serialize";

export type OptionalIngredient = { name: string; price: number };

export type FoodTypeSummary = Prisma.FoodTypeGetPayload<Record<string, never>>;

type MenuFoodRecord = Prisma.FoodGetPayload<{
  select: typeof publicMenuFoodSelect;
}>;

export type FoodItem = Serialized<MenuFoodRecord> & {
  isFavorite?: boolean;
  popularity?: number;
};

export type AdminFoodItem = Serialized<
  Prisma.FoodGetPayload<{
    include: typeof adminFoodListInclude;
  }>
>;

export type FoodInput = z.input<typeof foodSchema>;
export type CreateFoodInput = FoodInput;
export type UpdateFoodInput = FoodInput & { id: string };
