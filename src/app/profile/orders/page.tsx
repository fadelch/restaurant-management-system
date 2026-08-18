"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav_bar from "@/components/nav_bar";
import { showMessage } from "@/components/MessageProvider";
import { useCart } from "@/context/CartContext";
import { formatUsdWithLbp } from "@/lib/currency";
import { getCustomerOrders } from "@/server/getCustomerOrders";
import type { Order } from "@/types";
import { normalizeOptionalIngredients } from "@/lib/foodOptions";
import { getCurrentSession } from "@/server/authActions";
import FoodIssueReportPanel from "@/components/FoodIssueReportPanel";

function statusClass(status: string) {
  const value = status.toLowerCase();
  if (value === "done" || value === "completed")
    return "bg-emerald-500/15 text-emerald-300";
  if (value === "cancelled" || value === "canceled")
    return "bg-red-500/15 text-red-300";
  if (value === "preparing") return "bg-blue-500/15 text-blue-300";
  return "bg-yellow-500/15 text-yellow-300";
}

function paymentStatusClass(status: string) {
  const value = status.toLowerCase();
  if (value === "done") return "bg-emerald-500/15 text-emerald-300";
  if (value === "refunded") return "bg-violet-500/15 text-violet-300";
  if (value === "cancelled") return "bg-red-500/15 text-red-300";
  return "bg-yellow-500/15 text-yellow-300";
}

export default function CustomerOrdersPage() {
  const router = useRouter();
  const { reorderItems } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      const session = await getCurrentSession();

      if (!session?.email) {
        showMessage("Please log in to view your orders.");
        router.replace("/login?next=/profile/orders");
        return;
      }

      try {
        const data = await getCustomerOrders(session.email);
        setOrders((data as Order[]) || []);
      } catch (error) {
        showMessage(
          error instanceof Error ? error.message : "Failed to load orders.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [router]);

  const reorder = (order: Order) => {
    const items = (order.items || []).flatMap((item) =>
      item.food
        ? [
            {
              food: item.food,
              quantity: item.quantity,
              extraCheese: item.extraCheese,
              removedIngredients: item.removedIngredients,
              addedIngredients: item.addedIngredients,
              customizationNote: item.customizationNote,
            },
          ]
        : [],
    );

    if (reorderItems(items)) {
      router.push("/cart");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Nav_bar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 rounded-3xl border border-red-900/50 bg-[#1a0000] p-6 shadow-2xl sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-400">
            Customer Profile
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase sm:text-5xl">
            My Orders
          </h1>
          <p className="mt-3 text-gray-400">
            Track current orders, review previous purchases, and order your
            favorites again. Completed orders also let you report a food issue
            and request a refund for an affected item.
          </p>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-neutral-900 p-10 text-center font-bold">
            Loading your orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-neutral-900 p-10 text-center">
            <p className="text-2xl font-black">No orders yet</p>
            <p className="mt-2 text-gray-400">
              Your completed checkout orders will appear here.
            </p>
            <button
              type="button"
              onClick={() => router.push("/#menu")}
              className="mt-6 rounded-xl bg-red-600 px-6 py-3 font-black hover:bg-red-700"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const total = formatUsdWithLbp(order.total);

              return (
                <article
                  key={order.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-[#111] shadow-xl"
                >
                  <div className="flex flex-col justify-between gap-4 border-b border-white/10 bg-black/40 p-5 sm:flex-row sm:items-center sm:p-6">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Order Number
                      </p>
                      <h2 className="mt-1 font-mono text-lg font-black text-red-300">
                        {order.orderNumber ||
                          `ORD-${order.id.slice(0, 8).toUpperCase()}`}
                      </h2>
                      <p className="mt-2 text-sm text-gray-400">
                        {new Date(
                          order.createdAt || Date.now(),
                        ).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`w-fit rounded-full px-4 py-2 text-sm font-black uppercase ${statusClass(order.status)}`}
                      >
                        Order: {order.status}
                      </span>
                      <span
                        className={`w-fit rounded-full px-4 py-2 text-sm font-black uppercase ${paymentStatusClass(order.paymentStatus || "pending")}`}
                      >
                        Payment: {order.paymentStatus || "pending"}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div>
                      <h3 className="font-black">Ordered Products</h3>
                      <div className="mt-3 divide-y divide-white/10">
                        {order.items?.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between gap-4 py-3"
                          >
                            <div>
                              <p className="font-bold">
                                {item.food?.name || "Food item"}
                              </p>
                              <p className="text-sm text-gray-400">
                                {item.quantity} ×{" "}
                                {formatUsdWithLbp(item.price).usd}
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
                              {normalizeOptionalIngredients(
                                item.addedIngredients,
                              ).length ? (
                                <p className="mt-1 text-xs text-blue-300">
                                  Added:{" "}
                                  {normalizeOptionalIngredients(
                                    item.addedIngredients,
                                  )
                                    .map((option) => option.name)
                                    .join(", ")}
                                </p>
                              ) : null}
                              {item.customizationNote ? (
                                <p className="mt-1 text-xs text-gray-300">
                                  Request: {item.customizationNote}
                                </p>
                              ) : null}
                              {[
                                "done",
                                "completed",
                              ].includes(order.status.toLowerCase()) ? (
                                <FoodIssueReportPanel
                                  orderId={order.id}
                                  orderItemId={item.id}
                                  foodName={item.food?.name || "Food item"}
                                  maxQuantity={item.quantity}
                                  initialReports={item.issueReports || []}
                                />
                              ) : null}
                            </div>
                            <p className="font-black text-green-300">
                              {formatUsdWithLbp(item.price * item.quantity).usd}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-5">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500">
                          Total Price
                        </p>
                        <p className="mt-1 text-xl font-black text-green-300">
                          {total.usd}
                        </p>
                        <p className="text-sm text-gray-400">≈ {total.lbp}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500">
                          Payment Method
                        </p>
                        <p className="mt-1 font-bold">
                          {order.paymentMethod || "Not specified"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500">
                          Payment Status
                        </p>
                        <p className="mt-1 font-bold capitalize">
                          {order.paymentStatus || "pending"}
                        </p>
                        {(order.refundedAmount || 0) > 0 ? (
                          <p className="mt-1 text-sm font-bold text-violet-300">
                            Refunded: {formatUsdWithLbp(order.refundedAmount || 0).usd}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500">
                          Fulfillment
                        </p>
                        <p className="mt-1 font-bold capitalize">
                          {order.fulfillmentType || "delivery"}
                        </p>
                      </div>
                      {order.customerAddress ? (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-500">
                            Delivery Address
                          </p>
                          <p className="mt-1 break-words text-sm font-bold">
                            {order.customerAddress}
                          </p>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => reorder(order)}
                        className="w-full rounded-xl bg-red-600 px-4 py-3 font-black hover:bg-red-700"
                      >
                        Reorder
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
