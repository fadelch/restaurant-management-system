"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import AnimatedSection from "@/components/AnimatedSection";
import InsertButton from "@/components/InsertButton";
import { getFoodsPage } from "@/server/adminData";
import AdminPageControls from "@/components/AdminPageControls";
import type { AdminFoodItem } from "@/types";
import { formatUsdWithLbp } from "@/lib/currency";

export default function FoodTable() {
  const [foods, setFoods] = useState<AdminFoodItem[]>([]);
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

  const fetchFoods = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getFoodsPage(query);
      setFoods(data.items);
      setPages(data.pages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Foods could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);
  useEffect(() => {
    const timer = setTimeout(fetchFoods, 250);
    return () => clearTimeout(timer);
  }, [fetchFoods]);

  return (
    <AnimatedSection variant="fade-up" delay={100}>
      <div className="rounded-2xl border border-red-900/40 bg-[#1a0000] p-3 shadow-2xl sm:p-5">
        <div className="mb-6 flex w-full flex-col items-start justify-between gap-4 sm:flex-row">
          <div>
            <h2 className="text-2xl font-black uppercase underline decoration-white underline-offset-4">
              Food
            </h2>

            <p className="mt-6 text-sm text-gray-400">
              Manage food items, stock quantity, images, and food types.
            </p>
          </div>

          <InsertButton href="/Admin/food/insert" />
        </div>

        <AdminPageControls
          {...query}
          pages={pages}
          filters={[
            { value: "available", label: "Available" },
            { value: "out", label: "Out of stock" },
          ]}
          sorts={[
            { value: "createdAt", label: "Newest" },
            { value: "name", label: "Name" },
            { value: "price", label: "Price" },
            { value: "qty", label: "Quantity" },
          ]}
          onChange={(next) => setQuery((current) => ({ ...current, ...next }))}
        />
        {error ? (
          <div className="mb-4 rounded-xl bg-red-500/10 p-4 text-red-200">
            {error}
            <button
              type="button"
              onClick={fetchFoods}
              className="ml-3 cursor-pointer rounded bg-red-600 px-3 py-1 font-bold"
            >
              Retry
            </button>
          </div>
        ) : null}
        <div className="responsive-table max-w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-white/10">
          <table className="w-full min-w-[1150px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-red-900/90 text-xs uppercase tracking-wider text-red-100">
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Created At</th>
                <th className="px-5 py-4">Price</th>
                <th className="px-5 py-4">LBP Convert</th>
                <th className="px-5 py-4">QTY</th>
                <th className="px-5 py-4">Type ID</th>
                <th className="px-5 py-4">Food Type</th>
                <th className="px-5 py-4">Order Items</th>
                <th className="px-5 py-4">Image</th>
                <th className="px-5 py-4 text-center">Modify</th>
                <th className="px-5 py-4 text-center">Delete</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10 bg-black/50">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-5 py-14 text-center">
                    <div className="h-12 animate-pulse rounded-xl bg-white/5" />
                  </td>
                </tr>
              ) : foods.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-5 py-14 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-950/60 text-3xl">
                      🍔
                    </div>

                    <p className="mt-4 text-lg font-bold text-white">
                      No food items loaded
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      Food records will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                foods.map((food) => {
                  const price = formatUsdWithLbp(food.price);

                  return (
                    <tr
                      key={food.id}
                      className="transition hover:bg-red-950/30"
                    >
                      <td className="px-5 py-4 font-mono text-xs text-gray-400">
                        {food.id}
                      </td>

                      <td className="px-5 py-4 font-bold text-white">
                        {food.name}
                      </td>

                      <td className="px-5 py-4 text-gray-300">
                        {food.createdAt
                          ? new Date(food.createdAt).toLocaleDateString("en-GB")
                          : "-"}
                      </td>

                      <td className="px-5 py-4 font-bold text-green-300">
                        {price.usd}
                      </td>

                      <td className="px-5 py-4 text-gray-300">{price.lbp}</td>

                      <td className="px-5 py-4 text-gray-300">{food.qty}</td>

                      <td className="px-5 py-4 font-mono text-xs text-gray-400">
                        {food.typeId}
                      </td>

                      <td className="px-5 py-4 text-gray-300">
                        {food.type?.name || "No type"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 font-bold">
                          {food.orderItems?.length || 0}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {food.image ? (
                          <Image
                            src={food.image}
                            alt={food.name}
                            width={56}
                            height={56}
                            sizes="56px"
                            className="h-14 w-14 rounded-xl object-cover"
                          />
                        ) : (
                          <span className="text-gray-500">No image</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <a
                          href={`/Admin/food/update/${food.id}`}
                          className="inline-flex rounded-xl bg-green-700 px-4 py-2 font-bold text-white transition hover:bg-green-800"
                        >
                          Modify
                        </a>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <a
                          href={`/Admin/food/delete/${food.id}`}
                          className="inline-flex rounded-xl bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-700"
                        >
                          Delete
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
