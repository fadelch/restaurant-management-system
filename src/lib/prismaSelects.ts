import "server-only";

import type { Prisma } from "@/generated/prisma";

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UserSelect;

export const managedUserSelect = {
  ...publicUserSelect,
  isAdmin: true,
  isBanned: true,
  createdAt: true,
  orders: { select: { id: true } },
} satisfies Prisma.UserSelect;

export const publicMenuFoodSelect = {
  id: true,
  name: true,
  description: true,
  ingredients: true,
  optionalIngredients: true,
  extraCheesePrice: true,
  qty: true,
  price: true,
  image: true,
  typeId: true,
  type: { select: { id: true, name: true } },
} satisfies Prisma.FoodSelect;

export const adminFoodInclude = {
  type: true,
  orderItems: { select: { id: true } },
} satisfies Prisma.FoodInclude;

export const adminOrderInclude = {
  user: { select: publicUserSelect },
  items: { include: { food: true } },
} satisfies Prisma.OrderInclude;

export function customerOrderInclude(userId: string) {
  return {
    user: { select: publicUserSelect },
    items: {
      include: {
        food: { include: { type: true } },
        issueReports: {
          where: { userId },
          orderBy: { createdAt: "desc" as const },
        },
      },
    },
  } satisfies Prisma.OrderInclude;
}
