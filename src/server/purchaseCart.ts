"use server";

import { requireUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import {
  checkoutForAuthenticatedUser,
  type CheckoutInput,
} from "@/server/checkoutService";

export async function purchaseCart(input: CheckoutInput) {
  const user = await requireUser();
  await enforceRateLimit({
    policy: "checkout-user",
    identifier: user.id,
    failurePolicy: "closed",
  });
  return checkoutForAuthenticatedUser(user, input);
}
