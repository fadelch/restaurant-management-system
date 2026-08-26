"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { foodSchema, idSchema, validationMessage } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { deleteUploadedFoodImage } from "@/lib/uploads";

export async function updateFood(data: {
  id: string;
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
    const idResult = idSchema.safeParse(data.id);
    if (!idResult.success) throw new Error(validationMessage(idResult.error));
    const parsed = foodSchema.safeParse({
      ...data,
      minStock: data.minStock ?? 5,
    });
    if (!parsed.success) throw new Error(validationMessage(parsed.error));
    const id = idResult.data;
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
    const result = await prisma.$transaction(async (tx) => {
      const [existing, foodType] = await Promise.all([
        tx.food.findUnique({ where: { id } }),
        tx.foodType.findUnique({ where: { id: typeId } }),
      ]);
      if (!existing) throw new Error("Food not found.");
      if (!foodType) throw new Error("Selected food type does not exist.");
      const food = await tx.food.update({
        where: { id },
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
        include: { type: true, orderItems: { select: { id: true } } },
      });
      if (existing.qty !== qty) {
        await tx.stockMovement.create({
          data: {
            foodId: id,
            adminId: actor.id,
            change: qty - existing.qty,
            previousQty: existing.qty,
            newQty: qty,
            reason: "Food updated",
          },
        });
      }
      await writeAuditLog(
        actor,
        {
          action: "UPDATE_FOOD",
          entityType: "Food",
          entityId: id,
          changes: {
            before: existing,
            after: {
              name,
              description,
              ingredients,
              optionalIngredients,
              extraCheesePrice,
              price,
              qty,
              minStock,
              image,
              typeId,
            },
          },
        },
        tx,
      );
      return { food, previousImage: existing.image };
    }, { isolationLevel: "Serializable" });
    if (result.previousImage && result.previousImage !== image) {
      await deleteUploadedFoodImage(result.previousImage);
    }
    return result.food;
  } catch (err) {
    console.log("Error updating food:", err);
    throw err;
  }
}
