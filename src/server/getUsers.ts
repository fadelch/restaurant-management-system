"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { managedUserSelect } from "@/lib/prismaSelects";

export async function getUsers() {
  await requireAdmin();
  try {
    return await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: managedUserSelect,
    });
  } catch (err) {
    console.log("Error fetching users:", err);
    throw new Error("Failed to fetch users.");
  }
}
