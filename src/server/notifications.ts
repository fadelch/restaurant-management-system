"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { idSchema, validationMessage } from "@/lib/validation";
import {
  getNotificationSummaryForCustomer,
  markAllNotificationsReadForCustomer,
  markNotificationReadForCustomer,
} from "@/server/customerAccessService";

const limitSchema = z.coerce.number().int().min(1).max(50).default(8);

export async function getNotificationSummary(limit: number = 8) {
  const user = await requireUser();
  const parsedLimit = limitSchema.safeParse(limit);
  if (!parsedLimit.success)
    throw new Error(validationMessage(parsedLimit.error));
  return getNotificationSummaryForCustomer(user.id, parsedLimit.data);
}

export async function markNotificationRead(id: string) {
  const user = await requireUser();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  return markNotificationReadForCustomer(user.id, parsed.data);
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  return markAllNotificationsReadForCustomer(user.id);
}
