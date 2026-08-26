import type { Prisma } from "@/generated/prisma";
import type { z } from "zod";
import type { foodSchema } from "@/lib/validation";

export type OptionalIngredient = { name: string; price: number };

export type FoodTypeSummary = Prisma.FoodTypeGetPayload<Record<string, never>>;

type MenuFoodRecord = Prisma.FoodGetPayload<{
  include: {
    type: true;
    orderItems: { select: { id: true; quantity: true } };
  };
}>;

export type FoodItem = Omit<MenuFoodRecord, "orderItems"> & {
  orderItems?: MenuFoodRecord["orderItems"];
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
