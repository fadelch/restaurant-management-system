"use client";

import { useState } from "react";
import type { FoodItem } from "@/types";
import { formatUsdWithLbp } from "@/lib/currency";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";

interface FoodCardProps {
  food: FoodItem;
  index?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (foodId: string) => Promise<void>;
}

export default function FoodCard({
  food,
  index = 0,
  isFavorite = false,
  onToggleFavorite,
}: FoodCardProps) {
  const [imageError, setImageError] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const { addToCart } = useCart();
  const router = useRouter();

  const inStock = food.qty > 0;
  const price = formatUsdWithLbp(food.price);
  const hasImage = food.image && !imageError;

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`View and customize ${food.name}`}
      onClick={() => router.push(`/food/${food.id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ")
          router.push(`/food/${food.id}`);
      }}
      className="cursor-pointer overflow-hidden rounded-2xl border border-neutral-200 bg-white text-black shadow-md transition-all duration-300 hover:-translate-y-2 hover:border-red-500 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-red-500/40 sm:rounded-[2rem]"
      style={{
        animation: `fadeInUp 0.6s ease-out ${index * 0.08}s both`,
      }}
    >
      <div className="relative h-48 bg-neutral-100 sm:h-56">
        {hasImage ? (
          <img
            src={food.image || ""}
            alt={food.name}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 text-neutral-500">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow sm:h-20 sm:w-20">
              <span className="text-3xl sm:text-4xl">🍽️</span>
            </div>

            <p className="mt-3 text-sm font-bold sm:mt-4">No image available</p>
          </div>
        )}

        <div className="absolute left-3 top-3 max-w-[55%] rounded-xl bg-white/95 px-3 py-2 shadow sm:left-4 sm:top-4 sm:rounded-2xl sm:px-4">
          <p className="truncate text-base font-bold text-red-600 sm:text-lg">
            {price.usd}
          </p>

          <p className="truncate text-[11px] font-bold text-neutral-600 sm:text-xs">
            ≈ {price.lbp}
          </p>
        </div>

        {food.type?.name ? (
          <div className="absolute right-3 top-3 max-w-[40%] truncate rounded-full bg-black/70 px-3 py-2 text-[11px] font-bold text-white sm:right-4 sm:top-4 sm:px-4 sm:text-xs">
            {food.type.name}
          </div>
        ) : null}

        {onToggleFavorite ? (
          <button
            type="button"
            disabled={favoriteLoading}
            onClick={async (event) => {
              event.stopPropagation();
              try {
                setFavoriteLoading(true);
                await onToggleFavorite(food.id);
              } finally {
                setFavoriteLoading(false);
              }
            }}
            aria-label={
              isFavorite
                ? `Remove ${food.name} from favorites`
                : `Add ${food.name} to favorites`
            }
            className={`absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full border text-2xl shadow-lg transition hover:scale-110 disabled:opacity-60 sm:bottom-4 sm:right-4 ${
              isFavorite
                ? "border-red-500 bg-red-600 text-white"
                : "border-white/50 bg-black/70 text-white"
            }`}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? "♥" : "♡"}
          </button>
        ) : null}
      </div>

      <div className="p-4 sm:p-5">
        <h4 className="mb-3 break-words text-xl font-bold sm:text-2xl">
          {food.name}
        </h4>

        <p className="mb-3 text-sm font-bold text-red-600">
          Click the card to customize ingredients
        </p>

        <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
          <span className="font-semibold text-neutral-600">
            Quantity: {food.qty}
          </span>

          <span
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              inStock
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {inStock ? "In Stock" : "Out of Stock"}
          </span>
        </div>

        <button
          type="button"
          disabled={!inStock}
          onClick={(event) => {
            event.stopPropagation();
            addToCart(food);
          }}
          className={`w-full rounded-2xl py-3 font-bold transition-all duration-300 ${
            inStock
              ? "cursor-pointer bg-red-600 text-white hover:bg-red-700"
              : "cursor-not-allowed bg-neutral-200 text-neutral-500"
          }`}
        >
          {inStock ? "Add to Cart" : "Unavailable"}
        </button>
      </div>
    </div>
  );
}
