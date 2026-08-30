"use client";

import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import Nav_bar from "@/components/nav_bar";
import HomeSidebar from "@/components/HomeSidebar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import AnimatedSection from "@/components/AnimatedSection";
import Footer from "@/components/Footer";

interface HomePageShellProps {
  menu: ReactNode;
}

export default function HomePageShell({ menu }: HomePageShellProps) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <Nav_bar />

      <div className="mx-auto flex min-w-0 max-w-[1540px]">
        <HomeSidebar open={sidebarOpen} setOpen={setSidebarOpen} />

        <main
          className={`w-full min-w-0 px-3 transition-all duration-300 sm:px-6 lg:px-8 ${
            sidebarOpen ? "lg:ms-4 xl:ms-8" : "ms-0"
          }`}
        >
          <HeroSection />

          <AnimatedSection>
            <AboutSection />
          </AnimatedSection>

          <AnimatedSection className="py-8 sm:py-12 lg:py-16">
            <section id="menu" className="scroll-mt-24">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-400 sm:text-sm">
                {t("menu.eyebrow")}
              </p>
              <div className="mb-6 mt-2 flex flex-col justify-between gap-2 sm:mb-9 sm:flex-row sm:items-end">
                <h2 className="text-3xl font-black sm:text-4xl lg:text-5xl">
                  {t("menu.title")}
                </h2>
                <p className="text-sm text-gray-400 sm:text-base">
                  {t("menu.subtitle")}
                </p>
              </div>

              {menu}
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
