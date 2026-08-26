"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { PublishedAnnouncement } from "@/types/announcement";

export default function AnnouncementDetails({
  item,
}: {
  item: PublishedAnnouncement;
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
    <article className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
      <div className="rounded-3xl border border-red-900/50 bg-gradient-to-br from-[#210303] to-[#0d0000] p-6 shadow-2xl sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-red-400">
          {t("announcements.title")}
        </p>
        <h1 className="mt-4 break-words text-3xl font-black sm:text-5xl">
          {item.title}
        </h1>
        <div className="mt-5 flex flex-wrap gap-3 text-sm text-gray-400">
          <span>{formatDateTime(item.createdAt)}</span>
          {item.eventDate ? (
            <>
              <span className="rounded-full bg-red-500/10 px-3 py-1 text-red-200">
                {t("announcements.eventDay")}: {" "}
                {formatDate(item.eventDate)}
              </span>
              <span className="rounded-full bg-red-500/10 px-3 py-1 text-red-200">
                {t("announcements.approximateEventTime")}: {" "}
                {formatTime(item.eventDate)}
              </span>
            </>
          ) : null}
          {item.expiresAt ? (
            <>
              <span>
                {t("announcements.expirationDay")}: {" "}
                {formatDate(item.expiresAt)}
              </span>
              <span>
                {t("announcements.expirationTime")}: {" "}
                {formatTime(item.expiresAt)}
              </span>
            </>
          ) : null}
        </div>
        <p className="mt-8 whitespace-pre-wrap text-lg leading-8 text-gray-200">
          {item.message}
        </p>
        <Link
          href="/announcements"
          className="mt-10 inline-flex rounded-xl border border-white/15 px-5 py-3 font-black text-red-200 transition hover:border-red-500"
        >
          {t("announcements.back")}
        </Link>
      </div>
    </article>
  );
}
