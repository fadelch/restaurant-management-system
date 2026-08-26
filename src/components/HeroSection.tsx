"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";

export default function HeroSection() {
  const { t } = useTranslation();

  return (
    <section id="top" className="scroll-mt-24 py-4 sm:py-7 lg:py-10">
      <div className="grid overflow-hidden rounded-[1.75rem] border border-red-900/40 bg-gradient-to-br from-[#260606] via-[#130101] to-black shadow-2xl shadow-red-950/20 md:grid-cols-[1.15fr_0.85fr] lg:rounded-[2.5rem]">
        <div className="order-2 flex flex-col justify-center p-5 sm:p-8 md:order-1 lg:p-12 xl:p-14">
          <span className="w-fit rounded-full border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-300 sm:px-4 sm:text-sm">
            {t("hero.eyebrow")}
          </span>

          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
            {t("hero.title")}
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-300 sm:mt-5 sm:text-lg sm:leading-8">
            {t("hero.description")}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 text-xs font-bold text-gray-300 sm:flex sm:flex-wrap sm:gap-3 sm:text-sm">
            <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
              ✓ {t("hero.quality")}
            </span>
            <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
              ✓ {t("hero.service")}
            </span>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href="#menu"
              className="rounded-xl bg-red-600 px-6 py-3.5 text-center font-black text-white shadow-lg shadow-red-950/50 transition hover:-translate-y-0.5 hover:bg-red-700"
            >
              {t("hero.menuButton")}
            </a>

            <a
              href="#about"
              className="rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-center font-black text-white transition hover:bg-white/10"
            >
              {t("hero.aboutButton")}
            </a>
          </div>
        </div>

        <div className="relative order-1 min-h-64 overflow-hidden md:order-2 md:min-h-[560px]">
          <Image
            src="/generated-foods/burger-la7me.png"
            alt={t("hero.imageAlt")}
            fill
            priority
            sizes="(min-width: 768px) 42vw, 100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#130101] via-transparent to-black/10 md:bg-gradient-to-r md:from-[#130101] md:via-transparent md:to-transparent" />
          <div className="absolute bottom-4 end-4 rounded-2xl border border-white/15 bg-black/60 px-4 py-3 text-sm font-black text-white shadow-xl backdrop-blur-md sm:bottom-6 sm:end-6">
            <span className="me-2 inline-block h-2.5 w-2.5 rounded-full bg-green-400" />
            {t("hero.service")}
          </div>
        </div>
      </div>
    </section>
  );
}
