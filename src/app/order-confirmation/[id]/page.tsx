"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Nav_bar from "@/components/nav_bar";
import { showMessage } from "@/components/MessageProvider";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { getCustomerOrderById } from "@/server/getCustomerOrders";
import type { CustomerOrder } from "@/types";
import { normalizeOptionalIngredients } from "@/lib/foodOptions";
import { multiplyUsd } from "@/lib/currency";
import { getCurrentSession } from "@/server/authActions";

export default function OrderConfirmationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { formatUsdWithLbp } = useCurrency();
  const orderId = params.id;
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      const session = await getCurrentSession();

      if (!session?.email) {
        router.replace(`/login?next=/order-confirmation/${orderId}`);
        return;
      }

      try {
        const data = await getCustomerOrderById(orderId, session.email);

        if (!data) {
          showMessage("Order not found.");
          router.replace("/profile/orders");
          return;
        }

        setOrder(data);
      } catch (error) {
        showMessage(
          error instanceof Error ? error.message : "Failed to load order.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (orderId) loadOrder();
  }, [orderId, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white">
        <p className="font-bold">Loading your confirmation...</p>
      </div>
    );
  }

  if (!order) return null;

  const total = formatUsdWithLbp(order.total, order.exchangeRateUsed);
  const estimatedTime = order.estimatedReadyAt
    ? new Date(order.estimatedReadyAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "We will update you soon";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Nav_bar />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <section className="overflow-hidden rounded-3xl border border-emerald-500/30 bg-[#111] shadow-2xl">
          <div className="bg-gradient-to-br from-emerald-950 to-[#120000] p-6 text-center sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-4xl font-black text-emerald-950">
              ✓
            </div>
            <p className="mt-5 text-sm font-black uppercase tracking-[0.25em] text-emerald-300">
              Order Confirmed
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-5xl">
              Thank you, {order.customerName || order.user?.name || "Customer"}!
            </h1>
            <p className="mt-3 text-gray-300">
              Your order has been received and is now pending confirmation.
            </p>
          </div>

          <div className="space-y-6 p-5 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Order Number
                </p>
                <p className="mt-2 break-all font-mono text-lg font-black text-red-300">
                  {order.orderNumber ||
                    `ORD-${order.id.slice(0, 8).toUpperCase()}`}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Estimated Time
                </p>
                <p className="mt-2 text-lg font-black text-emerald-300">
                  {estimatedTime}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Method
                </p>
                <p className="mt-2 text-lg font-black capitalize">
                  {order.fulfillmentType || "delivery"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <h2 className="text-xl font-black">Order Items</h2>
              <div className="mt-4 divide-y divide-white/10">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div>
                      <p className="font-bold">
                        {item.foodName || "Food item"}
                      </p>
                      <p className="text-sm text-gray-400">
                        Quantity: {item.quantity}
                      </p>
                      {item.extraCheese ? (
                        <p className="mt-1 text-xs font-bold text-yellow-300">
                          + Extra cheese
                        </p>
                      ) : null}
                      {item.removedIngredients?.length ? (
                        <p className="mt-1 text-xs text-red-300">
                          Without: {item.removedIngredients.join(", ")}
                        </p>
                      ) : null}
                      {normalizeOptionalIngredients(item.addedIngredients)
                        .length ? (
                        <p className="mt-1 text-xs text-blue-300">
                          Added:{" "}
                          {normalizeOptionalIngredients(item.addedIngredients)
                            .map((option) => option.name)
                            .join(", ")}
                        </p>
                      ) : null}
                      {item.customizationNote ? (
                        <p className="mt-1 text-xs text-gray-300">
                          Request: {item.customizationNote}
                        </p>
                      ) : null}
                    </div>
                    <p className="font-black text-green-300">
                      {formatUsdWithLbp(multiplyUsd(item.price, item.quantity), order.exchangeRateUsed).usd}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-sm text-gray-400">Payment</p>
                <p className="mt-1 font-black">
                  {order.paymentMethod || "Not specified"}
                </p>
                <span className="mt-3 inline-flex rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-black uppercase text-yellow-300">
                  {order.paymentStatus || "pending"}
                </span>
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Cash payment is marked Done after delivery or pickup.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-sm text-gray-400">Total</p>
                {order.subtotal !== undefined ? (
                  <p className="mt-2 text-sm text-gray-300">
                    Subtotal: {formatUsdWithLbp(order.subtotal, order.exchangeRateUsed).usd}
                  </p>
                ) : null}
                {order.deliveryFee ? (
                  <p className="text-sm text-gray-300">
                    Delivery: {formatUsdWithLbp(order.deliveryFee, order.exchangeRateUsed).usd}
                  </p>
                ) : null}
                {order.discountAmount ? (
                  <p className="text-sm font-bold text-emerald-300">
                    Discount{order.couponCode ? ` (${order.couponCode})` : ""}:
                    -{formatUsdWithLbp(order.discountAmount, order.exchangeRateUsed).usd}
                  </p>
                ) : null}
                <p className="mt-1 text-xl font-black text-green-300">
                  {total.usd}
                </p>
                <p className="text-sm text-gray-400">≈ {total.lbp}</p>
              </div>
            </div>

            {order.customerAddress ? (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-sm text-gray-400">Delivery Address</p>
                <p className="mt-1 font-bold">{order.customerAddress}</p>
              </div>
            ) : null}

            {order.orderNotes ? (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
                <p className="text-sm text-yellow-200/70">Order Notes</p>
                <p className="mt-1 font-bold text-yellow-100">
                  {order.orderNotes}
                </p>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => router.push("/profile/orders")}
                className="rounded-xl bg-red-600 px-5 py-3 font-black hover:bg-red-700"
              >
                View My Orders
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-xl border border-white/15 bg-black px-5 py-3 font-black hover:bg-white/10"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
