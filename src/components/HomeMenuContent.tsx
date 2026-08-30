"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import AnimatedSection from "@/components/AnimatedSection";
import MenuSection from "@/components/MenuSection";
import { showMessage } from "@/components/MessageProvider";
import { toggleFavorite } from "@/server/favorites";
import type { FoodItem } from "@/types";

interface HomeMenuContentProps {
  foods: FoodItem[];
  initialFavoriteFoodIds: string[];
  authenticated: boolean;
}

export default function HomeMenuContent({
  foods,
  initialFavoriteFoodIds,
  authenticated,
}: HomeMenuContentProps) {
  const { t } = useTranslation();
  const [favoriteFoodIds, setFavoriteFoodIds] = useState(
    () => new Set(initialFavoriteFoodIds),
  );

  const handleToggleFavorite = async (foodId: string) => {
    if (!authenticated) {
      showMessage("Please log in to save favorite foods.");
      return;
    }

    try {
      const result = await toggleFavorite(foodId);

      setFavoriteFoodIds((current) => {
        const next = new Set(current);
        if (result.isFavorite) next.add(foodId);
        else next.delete(foodId);
        return next;
      });

      showMessage(
        result.isFavorite
          ? "Food added to favorites."
          : "Food removed from favorites.",
      );
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Failed to update favorites.",
      );
    }
  };

  if (foods.length === 0) {
    return (
      <div className="rounded-2xl bg-neutral-900 p-6 text-center text-lg font-semibold shadow-sm sm:rounded-3xl sm:p-8 sm:text-xl">
        {t("menu.empty")}
      </div>
    );
  }

  return (
    <AnimatedSection className="mb-8 sm:mb-10">
      <MenuSection
        foods={foods}
        favoriteFoodIds={favoriteFoodIds}
        onToggleFavorite={handleToggleFavorite}
      />
    </AnimatedSection>
  );
}
