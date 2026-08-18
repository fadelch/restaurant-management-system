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
import { useLanguage } from "@/context/LanguageContext";
import { getCurrentSession } from "@/server/authActions";

export default function Page() {
  const { language, copy } = useLanguage();
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

        const session = await getCurrentSession();
        if (session?.email) {
          try {
            const ids = await getFavoriteFoodIds(session.email);
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
    const session = await getCurrentSession();

    if (!session?.email) {
      showMessage("Please log in to save favorite foods.");
      return;
    }

    try {
      const result = await toggleFavorite(session.email, foodId);

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
    <div
      lang={language}
      dir={language === "ar" ? "rtl" : "ltr"}
      className="min-h-screen bg-[#080808] text-white"
    >
      <Nav_bar />

      <div className="mx-auto flex min-w-0 max-w-[1540px]">
        <HomeSidebar open={sidebarOpen} setOpen={setSidebarOpen} />

        <main
          className={`w-full min-w-0 px-3 transition-all duration-300 sm:px-6 lg:px-8 ${
            sidebarOpen ? "lg:ms-4 xl:ms-8" : "ms-0"
          }`}
        >
          <AnimatedSection>
            <HeroSection />
          </AnimatedSection>

          <AnimatedSection>
            <AboutSection />
          </AnimatedSection>

          <AnimatedSection className="py-8 sm:py-12 lg:py-16">
            <section id="menu" className="scroll-mt-24">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-400 sm:text-sm">
                {copy.menu.eyebrow}
              </p>
              <div className="mb-6 mt-2 flex flex-col justify-between gap-2 sm:mb-9 sm:flex-row sm:items-end">
                <h2 className="text-3xl font-black sm:text-4xl lg:text-5xl">
                  {copy.menu.title}
                </h2>
                <p className="text-sm text-gray-400 sm:text-base">
                  {copy.menu.subtitle}
                </p>
              </div>

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
                  {copy.menu.empty}
                </div>
              ) : (
                <AnimatedSection className="mb-8 sm:mb-10">
                  <MenuSection
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
