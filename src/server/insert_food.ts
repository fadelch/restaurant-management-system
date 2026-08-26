"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { foodSchema, validationMessage } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";

export async function insert_food(data: {
  name: string;
  description?: string | null;
  ingredients?: string[];
  optionalIngredients?: { name: string; price: number }[];
  extraCheesePrice?: number;
  price: number;
  qty: number;
  minStock?: number;
  image?: string | null;
  typeId: string;
}) {
  try {
    const actor = await requireAdmin();
    const parsed = foodSchema.safeParse({
      ...data,
      minStock: data.minStock ?? 5,
    });
    if (!parsed.success) throw new Error(validationMessage(parsed.error));
    const {
      name,
      description,
      ingredients,
      optionalIngredients,
      extraCheesePrice,
      price,
      qty,
      minStock,
      typeId,
    } = parsed.data;
    const image = parsed.data.image || null;

    return await prisma.$transaction(async (tx) => {
      const foodType = await tx.foodType.findUnique({ where: { id: typeId } });
      if (!foodType) throw new Error("Selected food type does not exist.");
      const food = await tx.food.create({
        data: {
          name,
          description: description || null,
          ingredients,
          optionalIngredients,
          extraCheesePrice,
          price,
          qty,
          minStock,
          image,
          typeId,
        },
        include: { type: true },
      });
      if (qty > 0) {
        await tx.stockMovement.create({
          data: {
            foodId: food.id,
            adminId: actor.id,
            change: qty,
            previousQty: 0,
            newQty: qty,
            reason: "Initial stock",
          },
        });
      }
      await writeAuditLog(
        actor,
        {
          action: "CREATE_FOOD",
          entityType: "Food",
          entityId: food.id,
          changes: {
            name,
            description,
            ingredients,
            optionalIngredients,
            extraCheesePrice,
            price,
            qty,
            minStock,
            typeId,
          },
        },
        tx,
      );
      return food;
    });
  } catch (err) {
    console.log("Error inserting food:", err);
    throw err;
  }
}
