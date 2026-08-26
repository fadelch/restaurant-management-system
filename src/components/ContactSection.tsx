"use client";

import { useTranslation } from "react-i18next";

export default function ContactSection() {
  const { t } = useTranslation();

  return (
    <section
      id="contact"
      className="scroll-mt-24 py-8 sm:py-12 lg:py-16"
    >
      <div className="rounded-[1.75rem] border border-red-900/40 bg-gradient-to-br from-[#250505] to-[#0e0000] p-5 text-white shadow-xl sm:p-8 lg:rounded-[2.5rem] lg:p-12">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-red-400 sm:text-sm">
          {t("contact.eyebrow")}
        </p>
        <h2 className="mt-3 text-3xl font-black sm:text-4xl lg:text-5xl">
          {t("contact.title")}
        </h2>

        <div className="mt-7 grid gap-3 text-base sm:grid-cols-2 sm:text-lg lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
            <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-red-300">
              {t("contact.phone")}
            </h3>

            <p className="break-words text-neutral-300">+961 XX XXX XXX</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
            <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-red-300">
              {t("contact.address")}
            </h3>

            <p className="break-words text-neutral-300">
              {t("contact.addressValue")}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 sm:col-span-2 sm:p-5 lg:col-span-1">
            <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-red-300">
              {t("contact.hours")}
            </h3>

            <p className="break-words text-neutral-300">
              {t("contact.hoursValue")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
