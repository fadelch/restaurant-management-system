import type { Prisma } from "@/generated/prisma";

export type NotificationItem = Prisma.NotificationGetPayload<{
  include: {
    announcement: {
      select: {
        id: true;
        eventDate: true;
        expiresAt: true;
        published: true;
      };
    };
  };
}>;

export type NotificationSummary = {
  items: NotificationItem[];
  unreadCount: number;
};

