"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function AboutSection() {
  const { copy } = useLanguage();

  return (
    <section id="about" className="scroll-mt-24 py-8 sm:py-12 lg:py-16">
      <div className="grid gap-7 rounded-[1.75rem] border border-white/10 bg-neutral-900 p-5 shadow-xl sm:p-8 md:grid-cols-[0.7fr_1.3fr] md:items-center lg:rounded-[2.5rem] lg:p-12">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-400 sm:text-sm">
            {copy.about.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            {copy.about.title}
          </h2>
        </div>

        <div>
          <p className="text-base leading-7 text-neutral-300 sm:text-lg sm:leading-8">
            {copy.about.description}
          </p>
          <div className="mt-6 grid gap-2 text-sm font-bold sm:grid-cols-3">
            {[
              copy.about.featureOne,
              copy.about.featureTwo,
              copy.about.featureThree,
            ].map((feature) => (
              <span
                key={feature}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-center text-gray-200"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
