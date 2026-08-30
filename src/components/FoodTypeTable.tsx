"use client";

import { useCallback, useEffect, useState } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import SectionHeader from "@/components/SectionHeader";
import { getFoodTypesPage } from "@/server/adminData";
import AdminPageControls from "@/components/AdminPageControls";

type FoodType = Awaited<
  ReturnType<typeof getFoodTypesPage>
>["items"][number];

export default function FoodTypeTable() {
  const [foodTypes, setFoodTypes] = useState<FoodType[]>([]);
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
    sort: "name",
    direction: "asc",
  });

  const fetchFoodTypes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getFoodTypesPage(query);
      setFoodTypes(data.items);
      setPages(data.pages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Food types could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);
  useEffect(() => {
    const timer = setTimeout(fetchFoodTypes, 250);
    return () => clearTimeout(timer);
  }, [fetchFoodTypes]);

  return (
    <AnimatedSection variant="fade-up" delay={100}>
      <div className="rounded-2xl border border-red-900/40 bg-[#1a0000] p-3 shadow-2xl sm:p-5">
        <div className="mb-6">
          <SectionHeader
            title="Food Type"
            insertHref="/Admin/foodtype/insert"
          />

          <p className="mt-2 text-sm text-gray-400">
            Manage categories and food type records.
          </p>
        </div>

        <AdminPageControls
          {...query}
          pages={pages}
          filters={[]}
          sorts={[
            { value: "name", label: "Name" },
            { value: "createdAt", label: "Newest" },
          ]}
          onChange={(next) => setQuery((current) => ({ ...current, ...next }))}
        />
        {error ? (
          <div className="mb-4 rounded-xl bg-red-500/10 p-4 text-red-200">
            {error}
            <button
              type="button"
              onClick={fetchFoodTypes}
              className="ml-3 cursor-pointer rounded bg-red-600 px-3 py-1 font-bold"
            >
              Retry
            </button>
          </div>
        ) : null}
        <div className="responsive-table max-w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-white/10 bg-[#080000]">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-red-900/90 text-xs uppercase tracking-wider text-red-100">
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Created At</th>
                <th className="px-5 py-4">Foods</th>
                <th className="px-5 py-4 text-center">Modify</th>
                <th className="px-5 py-4 text-center">Delete</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10 bg-[#080000]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14">
                    <div className="h-12 animate-pulse rounded-xl bg-white/5" />
                  </td>
                </tr>
              ) : foodTypes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-950/60 text-3xl">
                      🧾
                    </div>

                    <p className="mt-4 text-lg font-bold text-white">
                      No food types loaded
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      Food type records will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                foodTypes.map((type) => (
                  <tr key={type.id} className="transition hover:bg-red-950/30">
                    <td className="px-5 py-5 font-mono text-xs text-gray-400">
                      {type.id}
                    </td>

                    <td className="px-5 py-5 font-bold text-white">
                      {type.name}
                    </td>

                    <td className="px-5 py-5 text-gray-300">
                      {new Date(type.createdAt).toLocaleDateString("en-GB")}
                    </td>

                    <td className="px-5 py-5">
                      <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 font-bold">
                        {type._count.foods}
                      </span>
                    </td>

                    <td className="px-5 py-5 text-center">
                      <a
                        href={`/Admin/foodtype/update/${type.id}`}
                        className="inline-flex rounded-xl bg-green-700 px-4 py-2 font-bold text-white hover:bg-green-800"
                      >
                        Modify
                      </a>
                    </td>

                    <td className="px-5 py-5 text-center">
                      <a
                        href={`/Admin/foodtype/delete/${type.id}`}
                        className="inline-flex rounded-xl bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700"
                      >
                        Delete
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AnimatedSection>
  );
}
