"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  idSchema,
  pageOptionsSchema,
  validationMessage,
} from "@/lib/validation";

type PageInput = Partial<z.input<typeof pageOptionsSchema>>;

function pageInput(input: PageInput) {
  const result = pageOptionsSchema.safeParse(input);
  if (!result.success) throw new Error(validationMessage(result.error));
  return result.data;
}

export async function getAuditLogPage(input: PageInput = {}) {
  await requireAdmin();
  const options = pageInput(input);
  const where = {
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
  const sortable = ["createdAt", "action", "entityType", "adminEmail"].includes(
    options.sort,
  )
    ? options.sort
    : "createdAt";
  const [items, total, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { [sortable]: options.direction },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      distinct: ["entityType"],
      select: { entityType: true },
      orderBy: { entityType: "asc" },
    }),
  ]);
  return {
    items,
    total,
    page: options.page,
    pageSize: options.pageSize,
    pages: Math.max(1, Math.ceil(total / options.pageSize)),
    filters: entityTypes.map((row) => row.entityType),
  };
}

export async function getInventoryPage(input: PageInput = {}) {
  await requireAdmin();
  const options = pageInput(input);
  const stockWhere =
    options.filter === "out"
      ? { qty: 0 }
      : options.filter === "low"
        ? { qty: { gt: 0, lte: prisma.food.fields.minStock } }
        : {};
  const where = {
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
  const sortable = ["createdAt", "name", "qty", "minStock", "price"].includes(
    options.sort,
  )
    ? options.sort
    : "qty";
  const [items, total, recentMovements] = await Promise.all([
    prisma.food.findMany({
      where,
      include: { type: true },
      orderBy: { [sortable]: options.direction },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
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
    items,
    total,
    page: options.page,
    pageSize: options.pageSize,
    pages: Math.max(1, Math.ceil(total / options.pageSize)),
    recentMovements,
  };
}

export async function getUsersPage(input: PageInput = {}) {
  await requireAdmin();
  const options = pageInput(input);
  const where = {
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
  const sortable = ["createdAt", "name", "email"].includes(options.sort)
    ? options.sort
    : "createdAt";
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
      orderBy: { [sortable]: options.direction },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return {
    items,
    total,
    page: options.page,
    pageSize: options.pageSize,
    pages: Math.max(1, Math.ceil(total / options.pageSize)),
  };
}

export async function getFoodsPage(input: PageInput = {}) {
  await requireAdmin();
  const options = pageInput(input);
  const where = {
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
  const sortable = ["createdAt", "name", "price", "qty"].includes(options.sort)
    ? options.sort
    : "createdAt";
  const [items, total] = await Promise.all([
    prisma.food.findMany({
      where,
      include: { type: true, orderItems: { select: { id: true } } },
      orderBy: { [sortable]: options.direction },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
    }),
    prisma.food.count({ where }),
  ]);
  return {
    items,
    total,
    page: options.page,
    pageSize: options.pageSize,
    pages: Math.max(1, Math.ceil(total / options.pageSize)),
  };
}

export async function getFoodTypesPage(input: PageInput = {}) {
  await requireAdmin();
  const options = pageInput(input);
  const where = options.search
    ? { name: { contains: options.search, mode: "insensitive" as const } }
    : {};
  const sortable = ["createdAt", "name"].includes(options.sort)
    ? options.sort
    : "name";
  const [items, total] = await Promise.all([
    prisma.foodType.findMany({
      where,
      include: { foods: { select: { id: true } } },
      orderBy: { [sortable]: options.direction },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
    }),
    prisma.foodType.count({ where }),
  ]);
  return {
    items,
    total,
    page: options.page,
    pageSize: options.pageSize,
    pages: Math.max(1, Math.ceil(total / options.pageSize)),
  };
}

export async function getOrdersPage(input: PageInput = {}, finished = false) {
  await requireAdmin();
  const options = pageInput(input);
  const statuses = finished
    ? ["done", "completed", "cancelled", "canceled"]
    : ["pending", "preparing"];
  const where = {
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
  const sortable = ["createdAt", "total", "status", "customerName"].includes(
    options.sort,
  )
    ? options.sort
    : "createdAt";
  const [items, total, archivedTotal] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { user: true, items: { include: { food: true } } },
      orderBy: { [sortable]: options.direction },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
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
    items,
    total,
    page: options.page,
    pageSize: options.pageSize,
    pages: Math.max(1, Math.ceil(total / options.pageSize)),
    archivedTotal,
  };
}

export async function clearFinishedOrders() {
  const actor = await requireAdmin();
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
  const actor = await requireAdmin();
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
  const actor = await requireAdmin();
  const parsed = adjustmentSchema.safeParse(input);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  const current = await prisma.food.findUnique({
    where: { id: parsed.data.foodId },
  });
  if (!current) throw new Error("Food was not found.");
  const updated = await prisma.$transaction(async (tx) => {
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
    return food;
  });
  await writeAuditLog(actor, {
    action: "ADJUST_INVENTORY",
    entityType: "Food",
    entityId: updated.id,
    changes: {
      before: { qty: current.qty, minStock: current.minStock },
      after: { qty: updated.qty, minStock: updated.minStock },
      reason: parsed.data.reason,
    },
  });
  return updated;
}
