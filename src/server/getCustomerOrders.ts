"use server";

import { requireUser } from "@/lib/auth";
import { idSchema, validationMessage } from "@/lib/validation";
import {
  getOrderForCustomer,
  getOrdersForCustomer,
} from "@/server/customerAccessService";

export async function getCustomerOrders(userEmail: string) {
  void userEmail;
  const user = await requireUser();

  return getOrdersForCustomer(user.id);
}

export async function getCustomerOrderById(orderId: string, userEmail: string) {
  void userEmail;
  const user = await requireUser();
  const parsed = idSchema.safeParse(orderId);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  return getOrderForCustomer(user.id, parsed.data);
}
