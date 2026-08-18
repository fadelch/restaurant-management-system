"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function isCancelled(status: string) {
  const value = status.toLowerCase();
  return value === "cancelled" || value === "canceled";
}

function isCompleted(status: string) {
  const value = status.toLowerCase();
  return value === "done" || value === "completed";
}

export async function getAdminDashboardStats() {
  await requireAdmin();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [orders, totalCustomers, lowStockFoods, lowStockCount] =
    await Promise.all([
      prisma.order.findMany({
        select: {
          total: true,
          status: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
              food: {
                select: {
                  id: true,
                  name: true,
                  type: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.user.count({ where: { isAdmin: false } }),
      prisma.food.findMany({
        where: { qty: { lte: prisma.food.fields.minStock } },
        select: { id: true, name: true, qty: true, minStock: true },
        orderBy: [{ qty: "asc" }, { name: "asc" }],
        take: 6,
      }),
      prisma.food.count({
        where: { qty: { lte: prisma.food.fields.minStock } },
      }),
    ]);

  const completedOrders = orders.filter((order) => isCompleted(order.status));
  const salesOrders = completedOrders;

  const totalSales = salesOrders.reduce((sum, order) => sum + order.total, 0);
  const ordersToday = orders.filter(
    (order) => order.createdAt >= todayStart,
  ).length;
  const pendingOrders = orders.filter(
    (order) => order.status.toLowerCase() === "pending",
  ).length;

  const dailyRevenue = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const key = dateKey(date);

    return {
      key,
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      value: salesOrders
        .filter((order) => dateKey(order.createdAt) === key)
        .reduce((sum, order) => sum + order.total, 0),
    };
  });

  const monthlyRevenue = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = monthKey(date);

    return {
      key,
      label: date.toLocaleDateString("en-US", { month: "short" }),
      value: salesOrders
        .filter((order) => monthKey(order.createdAt) === key)
        .reduce((sum, order) => sum + order.total, 0),
    };
  });

  const statusMap = new Map<string, number>();
  const foodSales = new Map<
    string,
    { id: string; name: string; quantity: number }
  >();
  const categorySales = new Map<
    string,
    { id: string; name: string; quantity: number }
  >();

  orders.forEach((order) => {
    const status = order.status.toLowerCase();
    statusMap.set(status, (statusMap.get(status) || 0) + 1);

    if (isCancelled(order.status)) return;

    order.items.forEach((item) => {
      const food = foodSales.get(item.food.id);
      foodSales.set(item.food.id, {
        id: item.food.id,
        name: item.food.name,
        quantity: (food?.quantity || 0) + item.quantity,
      });

      const type = item.food.type;
      const category = categorySales.get(type.id);
      categorySales.set(type.id, {
        id: type.id,
        name: type.name,
        quantity: (category?.quantity || 0) + item.quantity,
      });
    });
  });

  return {
    summary: {
      totalSales,
      ordersToday,
      pendingOrders,
      totalCustomers,
      lowStockCount,
    },
    lowStockFoods,
    bestSellingFoods: Array.from(foodSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5),
    dailyRevenue,
    monthlyRevenue,
    ordersByStatus: Array.from(statusMap, ([name, value]) => ({ name, value })),
    popularCategories: Array.from(categorySales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6),
  };
}
