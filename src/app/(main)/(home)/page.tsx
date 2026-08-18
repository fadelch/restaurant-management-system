"use client";

import { useEffect, useState } from "react";
import Nav_bar from "@/components/nav_bar";
import HomeSidebar from "@/components/HomeSidebar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import MenuSection from "@/components/MenuSection";
import AnimatedSection from "@/components/AnimatedSection";
import { getFoods } from "@/server/getFoods";
import { getFavoriteFoodIds, toggleFavorite } from "@/server/favorites";
import Footer from "@/components/Footer";
import type { FoodItem } from "@/types";
import { showMessage } from "@/components/MessageProvider";

export default function Page() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [favoriteFoodIds, setFavoriteFoodIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    const fetchFoods = async () => {
      try {
        const data = await getFoods();
        setFoods((data as FoodItem[]) || []);

        const userEmail = sessionStorage.getItem("userEmail");
        if (userEmail) {
          try {
            const ids = await getFavoriteFoodIds(userEmail);
            setFavoriteFoodIds(new Set(ids));
          } catch (favoriteError) {
            console.log("Error fetching favorites:", favoriteError);
          }
        }
      } catch (error) {
        console.log("Error fetching foods:", error);
        setFoods([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFoods();
  }, []);

  const handleToggleFavorite = async (foodId: string) => {
    const userEmail = sessionStorage.getItem("userEmail");

    if (!userEmail) {
      showMessage("Please log in to save favorite foods.");
      return;
    }

    try {
      const result = await toggleFavorite(userEmail, foodId);

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Nav_bar />

      <div className="flex min-w-0">
        <HomeSidebar open={sidebarOpen} setOpen={setSidebarOpen} />

        <main
          className={`min-w-0 w-full px-4 transition-all duration-300 sm:px-6 md:px-8 ${
            sidebarOpen ? "lg:ml-4 xl:ml-8" : "ml-0"
          }`}
        >
          <AnimatedSection>
            <HeroSection />
          </AnimatedSection>

          <AnimatedSection>
            <AboutSection />
          </AnimatedSection>

          <AnimatedSection className="py-10 sm:py-16">
            <section id="menu" className="scroll-mt-36 sm:scroll-mt-28">
              <h2 className="mb-7 text-3xl font-bold sm:mb-10 sm:text-4xl">
                Menu
              </h2>

              {loading ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-72 animate-pulse rounded-2xl bg-neutral-800 shadow-md sm:h-80 sm:rounded-3xl"
                    />
                  ))}
                </div>
              ) : foods.length === 0 ? (
                <div className="rounded-2xl bg-neutral-900 p-6 text-center text-lg font-semibold shadow-sm sm:rounded-3xl sm:p-8 sm:text-xl">
                  No foods found.
                </div>
              ) : (
                <AnimatedSection className="mb-8 sm:mb-10">
                  <MenuSection
                    title="Browse by Food Type"
                    foods={foods}
                    favoriteFoodIds={favoriteFoodIds}
                    onToggleFavorite={handleToggleFavorite}
                  />
                </AnimatedSection>
              )}
            </section>
          </AnimatedSection>

          <AnimatedSection>
            <ContactSection />
          </AnimatedSection>
        </main>
      </div>

      <Footer />
    </div>
  );
}
