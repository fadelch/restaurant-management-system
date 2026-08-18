"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function getUsers() {
  await requireAdmin();
  try {
    return await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        isBanned: true,
        createdAt: true,
        orders: { select: { id: true } },
      },
    });
  } catch (err) {
    console.log("Error fetching users:", err);
    throw new Error("Failed to fetch users.");
  }
}
