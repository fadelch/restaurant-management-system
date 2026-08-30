"use client";

import { useCallback, useEffect, useState } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import { getOrdersPage } from "@/server/adminData";
import AdminPageControls from "@/components/AdminPageControls";
import { formatUsdWithLbp } from "@/lib/currency";
import type { AdminOrder } from "@/types";
import { normalizeOptionalIngredients } from "@/lib/foodOptions";

function normalizeStatus(status: string) {
  const value = status.toLowerCase();

  if (value === "completed") {
    return "done";
  }

  if (value === "canceled") {
    return "cancelled";
  }

  return value;
}

export default function OrderTable() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pages, setPages] = useState(1);
  const [query, setQuery] = useState<{
    page: number;
    pageSize: number;
    search: string;
    filter: string;
    sort: string;
    direction: "asc" | "desc";
  }>({
    page: 1,
    pageSize: 10,
    search: "",
    filter: "all",
    sort: "createdAt",
    direction: "desc",
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getOrdersPage(query, false);
      setOrders(data.items);
      setPages(data.pages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Orders could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);
  useEffect(() => {
    const timer = setTimeout(fetchOrders, 250);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  return (
    <AnimatedSection variant="fade-up" delay={250}>
      <div className="rounded-2xl border border-red-900/40 bg-[#1a0000] p-5 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-black uppercase underline decoration-white underline-offset-4">
            Active Orders
          </h2>

          <p className="mt-6 text-sm text-gray-400">
            Only pending and preparing orders appear here. Done and cancelled
            orders move to Order Items.
          </p>
        </div>

        <AdminPageControls
          {...query}
          pages={pages}
          filters={[
            { value: "pending", label: "Pending" },
            { value: "preparing", label: "Preparing" },
          ]}
          sorts={[
            { value: "createdAt", label: "Newest" },
            { value: "total", label: "Total" },
            { value: "status", label: "Status" },
            { value: "customerName", label: "Customer" },
          ]}
          onChange={(next) => setQuery((current) => ({ ...current, ...next }))}
        />
        {error ? (
          <div className="mb-4 rounded-xl bg-red-500/10 p-4 text-red-200">
            {error}
            <button
              type="button"
              onClick={fetchOrders}
              className="ml-3 cursor-pointer rounded bg-red-600 px-3 py-1 font-bold"
            >
              Retry
            </button>
          </div>
        ) : null}
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full table-fixed border-collapse text-left text-xs lg:text-sm">
            <thead>
              <tr className="bg-red-900/90 text-xs uppercase tracking-wider text-red-100">
                <th className="w-[9%] px-3 py-4">Order</th>
                <th className="w-[9%] px-3 py-4">Customer</th>
                <th className="w-[12%] px-3 py-4">Contact</th>
                <th className="w-[8%] px-3 py-4">Status</th>
                <th className="w-[8%] px-3 py-4">Payment</th>
                <th className="w-[8%] px-3 py-4">Pay Status</th>
                <th className="w-[13%] px-3 py-4">Fulfillment</th>
                <th className="w-[7%] px-3 py-4">Map</th>
                <th className="w-[5%] px-3 py-4">Items</th>
                <th className="w-[7%] px-3 py-4">USD</th>
                <th className="w-[8%] px-3 py-4">LBP</th>
                <th className="w-[8%] px-3 py-4 text-center">Modify</th>
                <th className="w-[8%] px-3 py-4 text-center">Delete</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10 bg-black/50">
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-5 py-14 text-center">
                    <div className="h-12 animate-pulse rounded-xl bg-white/5" />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-5 py-14 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-950/60 text-3xl">
                      🧾
                    </div>

                    <p className="mt-4 text-lg font-bold text-white">
                      No active orders found
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      Pending and preparing orders will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const total = formatUsdWithLbp(order.total);
                  const status = normalizeStatus(order.status);

                  return (
                    <tr
                      key={order.id}
                      className="transition hover:bg-red-950/30"
                    >
                      <td className="break-words px-3 py-4 font-mono text-[10px] text-gray-400">
                        {order.orderNumber || `${order.id.slice(0, 8)}...`}
                      </td>

                      <td className="break-words px-3 py-4 font-bold text-white">
                        {order.customerName || order.user?.name || "Unknown"}
                      </td>

                      <td className="break-words px-3 py-4 text-gray-300">
                        <span className="block">
                          {order.customerPhone || "No phone"}
                        </span>
                        <span className="mt-1 block text-[10px] text-gray-500">
                          {order.user?.email || "-"}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                            status === "preparing"
                              ? "bg-blue-500/10 text-blue-300"
                              : "bg-yellow-500/10 text-yellow-300"
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="break-words px-3 py-4 text-gray-300">
                        {order.paymentMethod || "-"}
                      </td>

                      <td className="break-words px-3 py-4 text-gray-300">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                            order.paymentStatus === "done"
                              ? "bg-emerald-500/10 text-emerald-300"
                              : order.paymentStatus === "refunded"
                                ? "bg-violet-500/10 text-violet-300"
                                : order.paymentStatus === "cancelled"
                                  ? "bg-red-500/10 text-red-300"
                                  : "bg-yellow-500/10 text-yellow-300"
                          }`}
                        >
                          {order.paymentStatus || "pending"}
                        </span>
                      </td>

                      <td className="break-words px-3 py-4 text-gray-300">
                        <span className="block font-bold capitalize text-white">
                          {order.fulfillmentType || "delivery"}
                        </span>
                        <span className="mt-1 block text-[10px] text-gray-400">
                          {order.customerAddress || "Restaurant pickup"}
                        </span>
                        {order.orderNotes ? (
                          <span className="mt-1 block text-[10px] text-yellow-300">
                            Note: {order.orderNotes}
                          </span>
                        ) : null}
                      </td>

                      <td className="px-3 py-4">
                        {order.mapLocation ? (
                          <a
                            href={order.mapLocation}
                            target="_blank"
                            rel="noreferrer"
                            className="cursor-pointer font-bold text-green-300 hover:underline"
                          >
                            Map
                          </a>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>

                      <td className="px-3 py-4 text-gray-300">
                        <span className="font-black">
                          {order.items?.length || 0}
                        </span>
                        <div className="mt-2 max-h-36 space-y-2 overflow-y-auto text-[10px]">
                          {order.items?.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-lg border border-white/10 bg-black/30 p-2"
                            >
                              <p className="font-bold text-white">
                                {item.quantity}× {item.foodName || "Food"}
                              </p>
                              {item.extraCheese ? (
                                <p className="text-yellow-300">
                                  + Extra cheese
                                </p>
                              ) : null}
                              {item.removedIngredients?.length ? (
                                <p className="text-red-300">
                                  Without: {item.removedIngredients.join(", ")}
                                </p>
                              ) : null}
                              {normalizeOptionalIngredients(
                                item.addedIngredients,
                              ).length ? (
                                <p className="text-blue-300">
                                  Added:{" "}
                                  {normalizeOptionalIngredients(
                                    item.addedIngredients,
                                  )
                                    .map((option) => option.name)
                                    .join(", ")}
                                </p>
                              ) : null}
                              {item.customizationNote ? (
                                <p className="text-gray-300">
                                  Request: {item.customizationNote}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="break-words px-3 py-4 font-bold text-green-300">
                        {total.usd}
                      </td>

                      <td className="break-words px-3 py-4 text-gray-300">
                        {total.lbp}
                      </td>

                      <td className="px-3 py-4 text-center">
                        <a
                          href={`/Admin/order/update/${order.id}`}
                          className="inline-flex cursor-pointer rounded-xl bg-green-700 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-green-950/40 transition hover:-translate-y-1 hover:bg-green-800"
                        >
                          Modify
                        </a>
                      </td>

                      <td className="px-3 py-4 text-center">
                        <a
                          href={`/Admin/order/delete/${order.id}`}
                          className="inline-flex cursor-pointer rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-red-950/40 transition hover:-translate-y-1 hover:bg-red-700"
                        >
                          Cancel / Archive
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AnimatedSection>
  );
}
