"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPageControls from "@/components/AdminPageControls";
import { showMessage } from "@/components/MessageProvider";
import { adjustInventory, getInventoryPage } from "@/server/adminData";

type Data = Awaited<ReturnType<typeof getInventoryPage>>;
type Query = {
  page: number;
  pageSize: number;
  search: string;
  filter: string;
  sort: string;
  direction: "asc" | "desc";
};
const initialQuery: Query = {
  page: 1,
  pageSize: 10,
  search: "",
  filter: "all",
  sort: "qty",
  direction: "asc",
};

export default function InventoryManager() {
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    qty: 0,
    minStock: 5,
    reason: "Manual stock adjustment",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getInventoryPage(query));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Inventory could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const save = async (foodId: string) => {
    try {
      await adjustInventory({
        foodId,
        newQty: draft.qty,
        minStock: draft.minStock,
        reason: draft.reason,
      });
      setEditing(null);
      showMessage("Inventory updated and recorded in stock history.");
      await load();
    } catch (err) {
      showMessage(
        err instanceof Error ? err.message : "Inventory update failed.",
      );
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-red-900/50 bg-[#1a0000] p-5 shadow-2xl">
        <h1 className="text-3xl font-black uppercase">Inventory Management</h1>
        <p className="mt-2 text-gray-400">
          Stock levels, minimum-stock warnings, adjustments, and history.
        </p>
      </section>
      <section className="rounded-2xl border border-white/10 bg-[#160000] p-5">
        <AdminPageControls
          {...query}
          pages={data?.pages || 1}
          filters={[
            { value: "low", label: "Low stock" },
            { value: "out", label: "Out of stock" },
          ]}
          sorts={[
            { value: "qty", label: "Quantity" },
            { value: "minStock", label: "Minimum stock" },
            { value: "name", label: "Name" },
            { value: "price", label: "Price" },
            { value: "createdAt", label: "Newest" },
          ]}
          onChange={(next) => setQuery((current) => ({ ...current, ...next }))}
        />
        {loading ? (
          <div className="grid gap-3">
            <div className="h-16 animate-pulse rounded-xl bg-white/5" />
            <div className="h-16 animate-pulse rounded-xl bg-white/5" />
            <div className="h-16 animate-pulse rounded-xl bg-white/5" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            <p>{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-3 cursor-pointer rounded-lg bg-red-600 px-4 py-2 font-bold"
            >
              Retry
            </button>
          </div>
        ) : !data?.items.length ? (
          <div className="rounded-xl border border-white/10 p-10 text-center text-gray-400">
            No foods match these inventory filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-red-950 text-red-100">
                <tr>
                  <th className="p-3">Food</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Minimum</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {data.items.map((food) => {
                  const isOut = food.qty === 0;
                  const isLow = food.qty <= food.minStock;
                  return (
                    <tr key={food.id}>
                      <td className="p-3 font-bold">{food.name}</td>
                      <td className="p-3 text-gray-300">{food.type.name}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${isOut ? "bg-red-500/20 text-red-300" : isLow ? "bg-yellow-500/20 text-yellow-200" : "bg-green-500/20 text-green-300"}`}
                        >
                          {isOut
                            ? "OUT OF STOCK"
                            : isLow
                              ? "LOW STOCK"
                              : "IN STOCK"}
                        </span>
                      </td>
                      <td className="p-3">
                        {editing === food.id ? (
                          <input
                            type="number"
                            min="0"
                            value={draft.qty}
                            onChange={(e) =>
                              setDraft((v) => ({
                                ...v,
                                qty: Number(e.target.value),
                              }))
                            }
                            className="w-24 rounded bg-black p-2"
                          />
                        ) : (
                          food.qty
                        )}
                      </td>
                      <td className="p-3">
                        {editing === food.id ? (
                          <input
                            type="number"
                            min="0"
                            value={draft.minStock}
                            onChange={(e) =>
                              setDraft((v) => ({
                                ...v,
                                minStock: Number(e.target.value),
                              }))
                            }
                            className="w-24 rounded bg-black p-2"
                          />
                        ) : (
                          food.minStock
                        )}
                      </td>
                      <td className="p-3">
                        {editing === food.id ? (
                          <div className="flex flex-wrap gap-2">
                            <input
                              value={draft.reason}
                              maxLength={200}
                              onChange={(e) =>
                                setDraft((v) => ({
                                  ...v,
                                  reason: e.target.value,
                                }))
                              }
                              className="rounded bg-black p-2"
                            />
                            <button
                              type="button"
                              onClick={() => save(food.id)}
                              className="cursor-pointer rounded bg-green-700 px-3 py-2 font-bold"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(null)}
                              className="cursor-pointer rounded border border-white/20 px-3 py-2"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(food.id);
                              setDraft({
                                qty: food.qty,
                                minStock: food.minStock,
                                reason: "Manual stock adjustment",
                              });
                            }}
                            className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 font-bold"
                          >
                            Adjust
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="rounded-2xl border border-white/10 bg-[#160000] p-5">
        <h2 className="mb-4 text-2xl font-black">Recent stock history</h2>
        {!data?.recentMovements.length ? (
          <p className="text-gray-400">
            No stock movements have been recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="text-gray-400">
                  <th className="p-2">Date</th>
                  <th className="p-2">Food</th>
                  <th className="p-2">Change</th>
                  <th className="p-2">Stock</th>
                  <th className="p-2">Reason</th>
                  <th className="p-2">Actor / Order</th>
                </tr>
              </thead>
              <tbody>
                {data.recentMovements.map((movement) => (
                  <tr key={movement.id} className="border-t border-white/10">
                    <td className="p-2">
                      {new Date(movement.createdAt).toLocaleString()}
                    </td>
                    <td className="p-2 font-bold">{movement.food.name}</td>
                    <td
                      className={`p-2 font-black ${movement.change < 0 ? "text-red-300" : "text-green-300"}`}
                    >
                      {movement.change > 0 ? "+" : ""}
                      {movement.change}
                    </td>
                    <td className="p-2">
                      {movement.previousQty} → {movement.newQty}
                    </td>
                    <td className="p-2">{movement.reason}</td>
                    <td className="p-2 text-gray-300">
                      {movement.admin?.email ||
                        movement.order?.orderNumber ||
                        "System"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
