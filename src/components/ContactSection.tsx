"use client";

import { useTranslation } from "react-i18next";
import { useRestaurant } from "@/components/providers/RestaurantProvider";

const CUSTOMER_INPUT_REQUIRED = "REQUIRES CUSTOMER INPUT";

function formatDay(dayOfWeek: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2023, 0, 1 + dayOfWeek)));
}

function formatTime(value: string, locale: string) {
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2023, 0, 1, hour, minute)));
}

export default function ContactSection() {
  const { t, i18n } = useTranslation();
  const { identity, hours } = useRestaurant();
  const locale = i18n.resolvedLanguage === "ar" ? "ar-LB" : "en-US";

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

            {identity.phone ? (
              <a href={`tel:${identity.phone}`} className="break-words text-neutral-300 hover:text-red-200">
                {identity.phone}
              </a>
            ) : (
              <p className="text-sm font-bold text-amber-300">{CUSTOMER_INPUT_REQUIRED}</p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
            <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-red-300">
              {t("contact.address")}
            </h3>

            {identity.address ? (
              identity.mapUrl ? (
                <a href={identity.mapUrl} target="_blank" rel="noreferrer" className="break-words text-neutral-300 hover:text-red-200">
                  {identity.address}
                </a>
              ) : (
                <p className="break-words text-neutral-300">{identity.address}</p>
              )
            ) : (
              <p className="text-sm font-bold text-amber-300">{CUSTOMER_INPUT_REQUIRED}</p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 sm:col-span-2 sm:p-5 lg:col-span-1">
            <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-red-300">
              {t("contact.hours")}
            </h3>

            {hours.length === 7 ? (
              <ul className="space-y-1 text-sm text-neutral-300">
                {hours.map((item) => (
                  <li key={item.dayOfWeek} className="flex justify-between gap-3">
                    <span>{formatDay(item.dayOfWeek, locale)}</span>
                    <span>
                      {item.isClosed
                        ? t("contact.closedDay")
                        : `${formatTime(item.openTime, locale)} – ${formatTime(item.closeTime, locale)}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm font-bold text-amber-300">{CUSTOMER_INPUT_REQUIRED}</p>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
          {identity.email ? <a className="rounded-lg border border-white/15 px-3 py-2 hover:border-red-400" href={`mailto:${identity.email}`}>Email</a> : null}
          {identity.whatsapp ? <a className="rounded-lg border border-white/15 px-3 py-2 hover:border-red-400" href={identity.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a> : null}
          {identity.instagramUrl ? <a className="rounded-lg border border-white/15 px-3 py-2 hover:border-red-400" href={identity.instagramUrl} target="_blank" rel="noreferrer">Instagram</a> : null}
          {identity.facebookUrl ? <a className="rounded-lg border border-white/15 px-3 py-2 hover:border-red-400" href={identity.facebookUrl} target="_blank" rel="noreferrer">Facebook</a> : null}
        </div>
      </div>
    </section>
  );
}
