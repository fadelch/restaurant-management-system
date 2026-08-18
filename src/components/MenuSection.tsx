"use client";

import { useMemo, useState } from "react";
import FoodCard from "@/components/FoodCard";
import type { FoodItem } from "@/types";

interface MenuSectionProps {
  title?: string;
  foods: FoodItem[];
  favoriteFoodIds?: Set<string>;
  onToggleFavorite?: (foodId: string) => Promise<void>;
}

export default function MenuSection({
  title = "Menu",
  foods,
  favoriteFoodIds = new Set<string>(),
  onToggleFavorite,
}: MenuSectionProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [sort, setSort] = useState("default");

  const categories = useMemo(() => {
    const map = new Map<string, string>();

    foods.forEach((food) => {
      if (food.type?.id && food.type.name) {
        map.set(food.type.id, food.type.name);
      }
    });

    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [foods]);

  const visibleFoods = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = foods.filter((food) => {
      const matchesSearch = !query || food.name.toLowerCase().includes(query);
      const matchesCategory = category === "all" || food.typeId === category;
      const matchesAvailability =
        availability === "all" ||
        (availability === "available" ? food.qty > 0 : food.qty <= 0);

      return matchesSearch && matchesCategory && matchesAvailability;
    });

    return filtered.sort((first, second) => {
      if (sort === "price-low") return first.price - second.price;
      if (sort === "price-high") return second.price - first.price;

      if (sort === "popular") {
        const firstSales =
          first.orderItems?.reduce(
            (sum, item) => sum + (item.quantity || 0),
            0,
          ) || 0;
        const secondSales =
          second.orderItems?.reduce(
            (sum, item) => sum + (item.quantity || 0),
            0,
          ) || 0;
        return secondSales - firstSales;
      }

      return 0;
    });
  }, [availability, category, foods, search, sort]);

  const foodGroups = Array.from(
    visibleFoods
      .reduce((groups, food) => {
        const groupKey = food.type?.id || food.typeId || "other";
        const groupName = food.type?.name?.trim() || "Other";
        const existingGroup = groups.get(groupKey);

        if (existingGroup) {
          existingGroup.foods.push(food);
        } else {
          groups.set(groupKey, {
            id: groupKey,
            name: groupName,
            foods: [food],
          });
        }

        return groups;
      }, new Map<string, { id: string; name: string; foods: FoodItem[] }>())
      .values(),
  ).sort((first, second) => first.name.localeCompare(second.name));

  return (
    <section className="mb-10 sm:mb-16">
      <h3 className="mb-5 text-2xl font-bold sm:mb-6 sm:text-3xl">{title}</h3>

      <div className="mb-8 grid gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-lg sm:grid-cols-2 sm:p-5 lg:grid-cols-5">
        <label className="sm:col-span-2 lg:col-span-2">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
            Search foods
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by food name..."
            className="w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500 focus:ring-2 focus:ring-red-700/40"
          />
        </label>

        <label>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
            Category
          </span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
          >
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
            Availability
          </span>
          <select
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
            className="w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
          >
            <option value="all">All items</option>
            <option value="available">In stock</option>
            <option value="unavailable">Out of stock</option>
          </select>
        </label>

        <label>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
            Sort by
          </span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
          >
            <option value="default">Newest</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="popular">Most popular</option>
          </select>
        </label>
      </div>

      {foodGroups.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-8 text-center">
          <p className="text-xl font-black">No matching foods</p>
          <p className="mt-2 text-gray-400">
            Try changing your search or filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategory("all");
              setAvailability("all");
              setSort("default");
            }}
            className="mt-5 rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="space-y-8 sm:space-y-10">
          {foodGroups.map((group) => (
            <section
              key={group.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4 shadow-lg sm:rounded-3xl sm:p-6"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4 sm:mb-6">
                <h4 className="text-2xl font-black text-white sm:text-3xl">
                  {group.name}
                </h4>

                <span className="rounded-full bg-red-600/15 px-4 py-2 text-sm font-bold text-red-400">
                  {group.foods.length}{" "}
                  {group.foods.length === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
                {group.foods.map((food, index) => (
                  <FoodCard
                    key={food.id}
                    food={food}
                    index={index}
                    isFavorite={favoriteFoodIds.has(food.id)}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
