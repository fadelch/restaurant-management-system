import "server-only";

import type { Prisma } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import { customerOrderInclude } from "@/lib/prismaSelects";
import { serializeForClient } from "@/lib/serialize";

const notificationInclude = {
  announcement: {
    select: {
      id: true,
      eventDate: true,
      expiresAt: true,
      published: true,
    },
  },
} satisfies Prisma.NotificationInclude;

export async function getOrdersForCustomer(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: customerOrderInclude(userId),
    orderBy: { createdAt: "desc" },
  });
  return serializeForClient(orders);
}

export async function getOrderForCustomer(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: customerOrderInclude(userId),
  });
  return serializeForClient(order);
}

export async function getNotificationSummaryForCustomer(
  userId: string,
  limit: number,
) {
  const where: Prisma.NotificationWhereInput = {
    userId,
    announcement: {
      published: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  };
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: notificationInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { ...where, read: false } }),
  ]);
  return { items, unreadCount };
}

export async function markNotificationReadForCustomer(
  userId: string,
  notificationId: string,
) {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
  if (result.count !== 1) throw new Error("Notification not found.");
  return { id: notificationId };
}

export async function markAllNotificationsReadForCustomer(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return { count: result.count };
}
