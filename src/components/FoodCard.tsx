"use client";

import { useState } from "react";
import Image from "next/image";
import type { FoodItem } from "@/types";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

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
  const { formatUsdWithLbp } = useCurrency();
  const router = useRouter();
  const { t } = useTranslation();

  const inStock = food.qty > 0;
  const price = formatUsdWithLbp(food.price);
  const hasImage = food.image && !imageError;

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={t("card.view", { name: food.name })}
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
          <Image
            src={food.image || ""}
            alt={food.name}
            fill
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw"
            onError={() => setImageError(true)}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 text-neutral-500">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow sm:h-20 sm:w-20">
              <span className="text-3xl sm:text-4xl">🍽️</span>
            </div>

            <p className="mt-3 text-sm font-bold sm:mt-4">
              {t("card.noImage")}
            </p>
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
                ? `${t("card.removeFavorite")}: ${food.name}`
                : `${t("card.addFavorite")}: ${food.name}`
            }
            className={`absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full border text-2xl shadow-lg transition hover:scale-110 disabled:opacity-60 sm:bottom-4 sm:right-4 ${
              isFavorite
                ? "border-red-500 bg-red-600 text-white"
                : "border-white/50 bg-black/70 text-white"
            }`}
            title={
              isFavorite
                ? t("card.removeFavorite")
                : t("card.addFavorite")
            }
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
          {t("card.customize")}
        </p>

        <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
          <span className="font-semibold text-neutral-600">
            {t("card.quantity")}: {food.qty}
          </span>

          <span
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              inStock
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {inStock ? t("card.inStock") : t("card.outOfStock")}
          </span>
        </div>

        <button
          type="button"
          disabled={!inStock}
          onClick={async (event) => {
            event.stopPropagation();
            await addToCart(food);
          }}
          className={`w-full rounded-2xl py-3 font-bold transition-all duration-300 ${
            inStock
              ? "cursor-pointer bg-red-600 text-white hover:bg-red-700"
              : "cursor-not-allowed bg-neutral-200 text-neutral-500"
          }`}
        >
          {inStock ? t("card.add") : t("card.unavailable")}
        </button>
      </div>
    </div>
  );
}
