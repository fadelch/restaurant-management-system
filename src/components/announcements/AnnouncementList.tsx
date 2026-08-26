"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { PublishedAnnouncement } from "@/types/announcement";

export default function AnnouncementList({
  items,
}: {
  items: PublishedAnnouncement[];
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "ar" ? "ar-LB" : "en-LB";
  const formatDate = (value: Date | string) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Beirut",
    }).format(new Date(value));
  const formatTime = (value: Date | string) =>
    new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Beirut",
    }).format(new Date(value));
  const formatDateTime = (value: Date | string) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Beirut",
    }).format(new Date(value));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="rounded-3xl border border-red-900/50 bg-[#1a0000] p-6 shadow-2xl sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-red-400">
          Restaurant updates
        </p>
        <h1 className="mt-3 text-3xl font-black sm:text-5xl">
          {t("announcements.title")}
        </h1>
        <p className="mt-3 text-gray-400">{t("announcements.subtitle")}</p>
      </header>

      <section className="mt-8 space-y-5">
        {items.length ? (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/announcements/${item.id}`}
              className="block rounded-2xl border border-white/10 bg-[#151515] p-5 shadow-xl transition hover:-translate-y-1 hover:border-red-500 sm:p-6"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <h2 className="break-words text-2xl font-black text-red-200">
                    {item.title}
                  </h2>
                  <p className="mt-3 line-clamp-3 whitespace-pre-wrap leading-7 text-gray-300">
                    {item.message}
                  </p>
                </div>
                {item.eventDate ? (
                  <div className="flex shrink-0 flex-wrap gap-2 text-sm font-black text-red-200 sm:max-w-48 sm:justify-end">
                    <span className="rounded-xl bg-red-950 px-4 py-2">
                      {formatDate(item.eventDate)}
                    </span>
                    <span className="rounded-xl bg-red-950 px-4 py-2">
                      {t("announcements.approximately")} {" "}
                      {formatTime(item.eventDate)}
                    </span>
                  </div>
                ) : null}
              </div>
              <p className="mt-4 text-xs text-gray-500">
                {formatDateTime(item.createdAt)}
              </p>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#151515] p-12 text-center text-gray-500">
            {t("announcements.empty")}
          </div>
        )}
      </section>
    </div>
  );
}
