"use server";

import { z } from "zod";
import type { Prisma } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import { requireAdmin, requireRateLimitedAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  idSchema,
  validationMessage,
} from "@/lib/validation";
import { adminFoodInclude, adminOrderInclude } from "@/lib/prismaSelects";
import {
  paginatedResult,
  paginationArgs,
  parsePageInput,
} from "@/lib/pagination";
import { resolveOrderBy } from "@/lib/sorting";
import type { PageInput } from "@/types/pagination";

export async function getAuditLogPage(input: PageInput = {}) {
  await requireAdmin();
  const options = parsePageInput(input);
  const where: Prisma.AuditLogWhereInput = {
    AND: [
      options.search
        ? {
            OR: [
              {
                adminEmail: {
                  contains: options.search,
                  mode: "insensitive" as const,
                },
              },
              {
                action: {
                  contains: options.search,
                  mode: "insensitive" as const,
                },
              },
              {
                entityType: {
                  contains: options.search,
                  mode: "insensitive" as const,
                },
              },
              {
                entityId: {
                  contains: options.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {},
      options.filter !== "all" ? { entityType: options.filter } : {},
    ],
  };
  const orderBy = resolveOrderBy<Prisma.AuditLogOrderByWithRelationInput>(
    options.sort,
    options.direction,
    {
      createdAt: (direction) => ({ createdAt: direction }),
      action: (direction) => ({ action: direction }),
      entityType: (direction) => ({ entityType: direction }),
      adminEmail: (direction) => ({ adminEmail: direction }),
    },
    "createdAt",
  );
  const [items, total, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy,
      ...paginationArgs(options),
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      distinct: ["entityType"],
      select: { entityType: true },
      orderBy: { entityType: "asc" },
    }),
  ]);
  return {
    ...paginatedResult(items, total, options),
    filters: entityTypes.map((row) => row.entityType),
  };
}

export async function getInventoryPage(input: PageInput = {}) {
  await requireAdmin();
  const options = parsePageInput(input);
  const stockWhere: Prisma.FoodWhereInput =
    options.filter === "out"
      ? { qty: 0 }
      : options.filter === "low"
        ? { qty: { gt: 0, lte: prisma.food.fields.minStock } }
        : {};
  const where: Prisma.FoodWhereInput = {
    AND: [
      stockWhere,
      options.search
        ? {
            OR: [
              {
                name: {
                  contains: options.search,
                  mode: "insensitive" as const,
                },
              },
              {
                type: {
                  name: {
                    contains: options.search,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {},
    ],
  };
  const orderBy = resolveOrderBy<Prisma.FoodOrderByWithRelationInput>(
    options.sort,
    options.direction,
    {
      createdAt: (direction) => ({ createdAt: direction }),
      name: (direction) => ({ name: direction }),
      qty: (direction) => ({ qty: direction }),
      minStock: (direction) => ({ minStock: direction }),
      price: (direction) => ({ price: direction }),
    },
    "qty",
  );
  const [items, total, recentMovements] = await Promise.all([
    prisma.food.findMany({
      where,
      include: { type: true },
      orderBy,
      ...paginationArgs(options),
    }),
    prisma.food.count({ where }),
    prisma.stockMovement.findMany({
      include: {
        food: { select: { name: true } },
        admin: { select: { email: true } },
        order: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);
  return {
    ...paginatedResult(items, total, options),
    recentMovements,
  };
}

export async function getUsersPage(input: PageInput = {}) {
  await requireAdmin();
  const options = parsePageInput(input);
  const where: Prisma.UserWhereInput = {
    AND: [
      options.search
        ? {
            OR: [
              {
                name: {
                  contains: options.search,
                  mode: "insensitive" as const,
                },
              },
              {
                email: {
                  contains: options.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {},
      options.filter === "admin"
        ? { isAdmin: true }
        : options.filter === "banned"
          ? { isBanned: true }
          : options.filter === "active"
            ? { isBanned: false }
            : {},
    ],
  };
  const orderBy = resolveOrderBy<Prisma.UserOrderByWithRelationInput>(
    options.sort,
    options.direction,
    {
      createdAt: (direction) => ({ createdAt: direction }),
      name: (direction) => ({ name: direction }),
      email: (direction) => ({ email: direction }),
    },
    "createdAt",
  );
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        isBanned: true,
        createdAt: true,
      },
      orderBy,
      ...paginationArgs(options),
    }),
    prisma.user.count({ where }),
  ]);
  return paginatedResult(items, total, options);
}

export async function getFoodsPage(input: PageInput = {}) {
  await requireAdmin();
  const options = parsePageInput(input);
  const where: Prisma.FoodWhereInput = {
    AND: [
      options.search
        ? {
            OR: [
              {
                name: {
                  contains: options.search,
                  mode: "insensitive" as const,
                },
              },
              {
                type: {
                  name: {
                    contains: options.search,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {},
      options.filter === "available"
        ? { qty: { gt: 0 } }
        : options.filter === "out"
          ? { qty: 0 }
          : {},
    ],
  };
  const orderBy = resolveOrderBy<Prisma.FoodOrderByWithRelationInput>(
    options.sort,
    options.direction,
    {
      createdAt: (direction) => ({ createdAt: direction }),
      name: (direction) => ({ name: direction }),
      price: (direction) => ({ price: direction }),
      qty: (direction) => ({ qty: direction }),
    },
    "createdAt",
  );
  const [items, total] = await Promise.all([
    prisma.food.findMany({
      where,
      include: adminFoodInclude,
      orderBy,
      ...paginationArgs(options),
    }),
    prisma.food.count({ where }),
  ]);
  return paginatedResult(items, total, options);
}

export async function getFoodTypesPage(input: PageInput = {}) {
  await requireAdmin();
  const options = parsePageInput(input);
  const where: Prisma.FoodTypeWhereInput = options.search
    ? { name: { contains: options.search, mode: "insensitive" as const } }
    : {};
  const orderBy = resolveOrderBy<Prisma.FoodTypeOrderByWithRelationInput>(
    options.sort,
    options.direction,
    {
      createdAt: (direction) => ({ createdAt: direction }),
      name: (direction) => ({ name: direction }),
    },
    "name",
  );
  const [items, total] = await Promise.all([
    prisma.foodType.findMany({
      where,
      include: { foods: { select: { id: true } } },
      orderBy,
      ...paginationArgs(options),
    }),
    prisma.foodType.count({ where }),
  ]);
  return paginatedResult(items, total, options);
}

export async function getOrdersPage(input: PageInput = {}, finished = false) {
  await requireAdmin();
  const options = parsePageInput(input);
  const statuses = finished
    ? ["done", "completed", "cancelled", "canceled"]
    : ["pending", "preparing"];
  const where: Prisma.OrderWhereInput = {
    AND: [
      finished ? { adminArchivedAt: null } : {},
      {
        status: {
          in: options.filter !== "all" ? [options.filter] : statuses,
          mode: "insensitive" as const,
        },
      },
      options.search
        ? {
            OR: [
              {
                orderNumber: {
                  contains: options.search,
                  mode: "insensitive" as const,
                },
              },
              {
                customerName: {
                  contains: options.search,
                  mode: "insensitive" as const,
                },
              },
              {
                customerPhone: {
                  contains: options.search,
                  mode: "insensitive" as const,
                },
              },
              {
                user: {
                  email: {
                    contains: options.search,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {},
    ],
  };
  const orderBy = resolveOrderBy<Prisma.OrderOrderByWithRelationInput>(
    options.sort,
    options.direction,
    {
      createdAt: (direction) => ({ createdAt: direction }),
      total: (direction) => ({ total: direction }),
      status: (direction) => ({ status: direction }),
      customerName: (direction) => ({ customerName: direction }),
    },
    "createdAt",
  );
  const [items, total, archivedTotal] = await Promise.all([
    prisma.order.findMany({
      where,
      include: adminOrderInclude,
      orderBy,
      ...paginationArgs(options),
    }),
    prisma.order.count({ where }),
    finished
      ? prisma.order.count({
          where: {
            adminArchivedAt: { not: null },
            status: {
              in: statuses,
              mode: "insensitive",
            },
          },
        })
      : Promise.resolve(0),
  ]);
  return {
    ...paginatedResult(items, total, options),
    archivedTotal,
  };
}

export async function clearFinishedOrders() {
  const actor = await requireRateLimitedAdmin();
  const archivedAt = new Date();
  const result = await prisma.order.updateMany({
    where: {
      adminArchivedAt: null,
      status: {
        in: ["done", "completed", "cancelled", "canceled"],
        mode: "insensitive",
      },
    },
    data: { adminArchivedAt: archivedAt },
  });

  await writeAuditLog(actor, {
    action: "CLEAR_FINISHED_ORDERS",
    entityType: "Order",
    entityId: "finished-list",
    changes: { archivedCount: result.count, archivedAt },
  });

  return { count: result.count };
}

export async function restoreFinishedOrders() {
  const actor = await requireRateLimitedAdmin();
  const result = await prisma.order.updateMany({
    where: {
      adminArchivedAt: { not: null },
      status: {
        in: ["done", "completed", "cancelled", "canceled"],
        mode: "insensitive",
      },
    },
    data: { adminArchivedAt: null },
  });

  await writeAuditLog(actor, {
    action: "RESTORE_FINISHED_ORDERS",
    entityType: "Order",
    entityId: "finished-list",
    changes: { restoredCount: result.count },
  });

  return { count: result.count };
}

const adjustmentSchema = z.object({
  foodId: idSchema,
  newQty: z.coerce.number().int().min(0).max(1_000_000),
  minStock: z.coerce.number().int().min(0).max(1_000_000),
  reason: z
    .string()
    .trim()
    .min(2, "Enter a reason for the stock change.")
    .max(200),
});

export async function adjustInventory(input: z.input<typeof adjustmentSchema>) {
  const actor = await requireRateLimitedAdmin();
  const parsed = adjustmentSchema.safeParse(input);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  return prisma.$transaction(
    async (tx) => {
      const current = await tx.food.findUnique({
        where: { id: parsed.data.foodId },
      });
      if (!current) throw new Error("Food was not found.");
      const food = await tx.food.update({
        where: { id: current.id },
        data: { qty: parsed.data.newQty, minStock: parsed.data.minStock },
      });
      if (current.qty !== food.qty) {
        await tx.stockMovement.create({
          data: {
            foodId: food.id,
            adminId: actor.id,
            change: food.qty - current.qty,
            previousQty: current.qty,
            newQty: food.qty,
            reason: parsed.data.reason,
          },
        });
      }
      await writeAuditLog(
        actor,
        {
          action: "ADJUST_INVENTORY",
          entityType: "Food",
          entityId: food.id,
          changes: {
            before: { qty: current.qty, minStock: current.minStock },
            after: { qty: food.qty, minStock: food.minStock },
            reason: parsed.data.reason,
          },
        },
        tx,
      );
      return food;
    },
    { isolationLevel: "Serializable" },
  );
}
