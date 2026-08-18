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
    const existing = await prisma.food.findUnique({ where: { id } });
    if (!existing) throw new Error("Food not found.");

    const foodType = await prisma.foodType.findUnique({
      where: {
        id: typeId,
      },
    });

    if (!foodType) {
      throw new Error("Selected food type does not exist.");
    }

    const food = await prisma.food.update({
      where: {
        id,
      },
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
      include: {
        type: true,
        orderItems: true,
      },
    });
    if (existing.qty !== qty) {
      await prisma.stockMovement.create({
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
    if (existing.image && existing.image !== image) {
      await deleteUploadedFoodImage(existing.image);
    }
    await writeAuditLog(actor, {
      action: "UPDATE_FOOD",
      entityType: "Food",
      entityId: id,
      changes: {
        before: {
          name: existing.name,
          description: existing.description,
          ingredients: existing.ingredients,
          optionalIngredients: existing.optionalIngredients,
          extraCheesePrice: existing.extraCheesePrice,
          price: existing.price,
          qty: existing.qty,
          minStock: existing.minStock,
          image: existing.image,
          typeId: existing.typeId,
        },
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
    });
    return food;
  } catch (err) {
    console.log("Error updating food:", err);
    throw err;
  }
}
