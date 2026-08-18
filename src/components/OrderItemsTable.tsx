"use client";

import { useCallback, useEffect, useState } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import {
  clearFinishedOrders,
  getOrdersPage,
  restoreFinishedOrders,
} from "@/server/adminData";
import AdminPageControls from "@/components/AdminPageControls";
import { showMessage } from "@/components/MessageProvider";
import { formatUsdWithLbp } from "@/lib/currency";
import type { OrderItem } from "@/types";
import { normalizeOptionalIngredients } from "@/lib/foodOptions";

type FinishedOrderItem = OrderItem & {
  orderStatus: string;
  orderUserEmail?: string | null;
  orderCreatedAt?: string | Date;
};

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

export default function OrderItemsTable() {
  const [items, setItems] = useState<FinishedOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pages, setPages] = useState(1);
  const [finishedCount, setFinishedCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);
  const [changingArchive, setChangingArchive] = useState(false);
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

  const fetchOrderItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getOrdersPage(query, true);
      const orders = result.items;

      const finishedItems = orders.flatMap((order) => {
        const status = normalizeStatus(order.status);

        if (status !== "done" && status !== "cancelled") {
          return [];
        }

        return (order.items || []).map((item) => ({
          ...item,
          orderStatus: status,
          orderUserEmail: order.user?.email || null,
          orderCreatedAt: order.createdAt,
        }));
      });

      setItems((finishedItems as FinishedOrderItem[]) || []);
      setPages(result.pages);
      setFinishedCount(result.total);
      setArchivedCount(result.archivedTotal);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Finished orders could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);
  useEffect(() => {
    const timer = setTimeout(fetchOrderItems, 250);
    return () => clearTimeout(timer);
  }, [fetchOrderItems]);

  const clearList = async () => {
    const confirmed = window.confirm(
      "Clear all finished order items from this admin list? Order history, refunds, analytics, and food safety reports will be kept.",
    );
    if (!confirmed) return;

    try {
      setChangingArchive(true);
      const result = await clearFinishedOrders();
      setQuery((current) => ({ ...current, page: 1 }));
      await fetchOrderItems();
      showMessage(
        result.count
          ? `${result.count} finished order(s) cleared from this list.`
          : "The finished order list is already clear.",
      );
    } catch (err) {
      showMessage(
        err instanceof Error ? err.message : "Finished orders could not be cleared.",
      );
    } finally {
      setChangingArchive(false);
    }
  };

  const restoreList = async () => {
    try {
      setChangingArchive(true);
      const result = await restoreFinishedOrders();
      setQuery((current) => ({ ...current, page: 1 }));
      await fetchOrderItems();
      showMessage(`${result.count} finished order(s) restored.`);
    } catch (err) {
      showMessage(
        err instanceof Error ? err.message : "Finished orders could not be restored.",
      );
    } finally {
      setChangingArchive(false);
    }
  };

  return (
    <AnimatedSection variant="fade-up" delay={300}>
      <div className="rounded-2xl border border-red-900/40 bg-[#1a0000] p-5 shadow-2xl">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h2 className="text-2xl font-black uppercase underline decoration-white underline-offset-4">
              Finished Order Items
            </h2>

            <p className="mt-6 text-sm text-gray-400">
              Food items from orders marked as done or cancelled. Clearing the
              list hides these records from this table without deleting order
              history.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {archivedCount > 0 ? (
              <button
                type="button"
                disabled={changingArchive}
                onClick={restoreList}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-black text-gray-200 hover:bg-white/5 disabled:opacity-50"
              >
                Restore cleared ({archivedCount})
              </button>
            ) : null}
            <button
              type="button"
              disabled={changingArchive || loading || finishedCount === 0}
              onClick={clearList}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {changingArchive ? "Working..." : "Clear finished list"}
            </button>
          </div>
        </div>

        <AdminPageControls
          {...query}
          pages={pages}
          filters={[
            { value: "done", label: "Done" },
            { value: "cancelled", label: "Cancelled" },
          ]}
          sorts={[
            { value: "createdAt", label: "Newest" },
            { value: "total", label: "Total" },
            { value: "status", label: "Status" },
          ]}
          onChange={(next) => setQuery((current) => ({ ...current, ...next }))}
        />
        {error ? (
          <div className="mb-4 rounded-xl bg-red-500/10 p-4 text-red-200">
            {error}
            <button
              type="button"
              onClick={fetchOrderItems}
              className="ml-3 cursor-pointer rounded bg-red-600 px-3 py-1 font-bold"
            >
              Retry
            </button>
          </div>
        ) : null}
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-red-900/90 text-xs uppercase tracking-wider text-red-100">
                <th className="px-5 py-4">Item ID</th>
                <th className="px-5 py-4">Order ID</th>
                <th className="px-5 py-4">User Email</th>
                <th className="px-5 py-4">Food</th>
                <th className="px-5 py-4">Customization</th>
                <th className="px-5 py-4">Quantity</th>
                <th className="px-5 py-4">Price USD</th>
                <th className="px-5 py-4">Price LBP</th>
                <th className="px-5 py-4">Total USD</th>
                <th className="px-5 py-4">Total LBP</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Order Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10 bg-black/50">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-5 py-14 text-center">
                    <div className="h-12 animate-pulse rounded-xl bg-white/5" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-5 py-14 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-950/60 text-3xl">
                      🍽️
                    </div>

                    <p className="mt-4 text-lg font-bold text-white">
                      No finished order items found
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      Done and cancelled order items will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const price = formatUsdWithLbp(item.price);
                  const total = formatUsdWithLbp(item.price * item.quantity);

                  return (
                    <tr
                      key={item.id}
                      className="transition hover:bg-red-950/30"
                    >
                      <td className="px-5 py-4 font-mono text-xs text-gray-400">
                        {item.id}
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-gray-400">
                        {item.orderId}
                      </td>

                      <td className="px-5 py-4 text-gray-300">
                        {item.orderUserEmail || "-"}
                      </td>

                      <td className="px-5 py-4 font-bold text-white">
                        {item.food?.name || "Unknown food"}
                      </td>

                      <td className="px-5 py-4 text-xs text-gray-300">
                        {item.extraCheese ? (
                          <p className="font-bold text-yellow-300">
                            + Extra cheese
                          </p>
                        ) : null}
                        {item.removedIngredients?.length ? (
                          <p className="text-red-300">
                            Without: {item.removedIngredients.join(", ")}
                          </p>
                        ) : null}
                        {normalizeOptionalIngredients(item.addedIngredients)
                          .length ? (
                          <p className="text-blue-300">
                            Added:{" "}
                            {normalizeOptionalIngredients(item.addedIngredients)
                              .map((option) => option.name)
                              .join(", ")}
                          </p>
                        ) : null}
                        {item.customizationNote ? (
                          <p>Request: {item.customizationNote}</p>
                        ) : null}
                        {!item.extraCheese &&
                        !item.removedIngredients?.length &&
                        !normalizeOptionalIngredients(item.addedIngredients)
                          .length &&
                        !item.customizationNote
                          ? "Standard"
                          : null}
                      </td>

                      <td className="px-5 py-4 text-gray-300">
                        {item.quantity}
                      </td>

                      <td className="px-5 py-4 font-bold text-green-300">
                        {price.usd}
                      </td>

                      <td className="px-5 py-4 text-gray-300">{price.lbp}</td>

                      <td className="px-5 py-4 font-bold text-green-300">
                        {total.usd}
                      </td>

                      <td className="px-5 py-4 text-gray-300">{total.lbp}</td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                            item.orderStatus === "done"
                              ? "bg-green-500/10 text-green-300"
                              : "bg-red-500/10 text-red-300"
                          }`}
                        >
                          {item.orderStatus}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-gray-300">
                        {item.orderCreatedAt
                          ? new Date(item.orderCreatedAt).toLocaleString(
                              "en-GB",
                            )
                          : "-"}
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
