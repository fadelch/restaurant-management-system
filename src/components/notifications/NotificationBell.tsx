"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  getNotificationSummary,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/notifications";
import type { NotificationSummary } from "@/types/notification";

export default function NotificationBell({ active }: { active: boolean }) {
  const router = useRouter();
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<NotificationSummary>({
    items: [],
    unreadCount: 0,
  });

  const load = useCallback(async () => {
    if (!active) return;
    try {
      setSummary(await getNotificationSummary(8));
    } catch {
      setSummary({ items: [], unreadCount: 0 });
    }
  }, [active]);

  useEffect(() => {
    if (!active) {
      setOpen(false);
      setSummary({ items: [], unreadCount: 0 });
      return;
    }
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, [active, load]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (!active) return null;

  const openNotification = async (id: string, announcementId: string) => {
    await markNotificationRead(id);
    setOpen(false);
    await load();
    router.push(`/announcements/${announcementId}`);
  };

  return (
    <div ref={containerRef} className="relative z-[70] ms-auto lg:ms-1">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          void load();
        }}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition lg:h-11 lg:w-11 ${open ? "border-red-400 bg-red-950/80 shadow-lg shadow-red-950/60" : "border-white/15 bg-[#170303] hover:border-red-500"}`}
        aria-label={t("notifications.bell")}
        aria-expanded={open}
        aria-controls="notification-panel"
      >
        <span aria-hidden="true">🔔</span>
        {summary.unreadCount > 0 ? (
          <span className="absolute -end-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
            {summary.unreadCount > 99 ? "99+" : summary.unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id="notification-panel"
          role="dialog"
          aria-label={t("notifications.title")}
          className="fixed inset-x-3 top-20 z-[90] flex max-h-[calc(100dvh-6rem)] flex-col overflow-hidden rounded-3xl border border-red-800/70 bg-[#120303]/98 text-start shadow-[0_24px_80px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:inset-x-auto sm:end-4 sm:w-96 lg:absolute lg:end-0 lg:top-14 lg:w-[22rem]"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-red-950/70 to-black/40 px-4 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-base font-black text-white">
                {t("notifications.title")}
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                {summary.unreadCount
                  ? t("notifications.unread", {
                      count: summary.unreadCount,
                    })
                  : t("notifications.allRead")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {summary.unreadCount ? (
                <button
                  type="button"
                  onClick={async () => {
                    await markAllNotificationsRead();
                    await load();
                  }}
                  className="rounded-lg bg-white/5 px-2.5 py-2 text-[11px] font-bold text-red-200 transition hover:bg-white/10"
                >
                  {t("notifications.markAll")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/30 text-lg text-gray-300 transition hover:border-red-500 hover:text-white lg:hidden"
                aria-label={t("notifications.close")}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-black/20 p-2.5">
            {summary.items.length ? (
              summary.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    openNotification(item.id, item.announcementId)
                  }
                  className={`block w-full rounded-2xl border px-3.5 py-3 text-start transition active:scale-[0.99] ${item.read ? "border-white/5 bg-white/[0.025] text-gray-400 hover:bg-white/5" : "border-red-900/50 bg-red-950/30 text-white hover:border-red-700/70 hover:bg-red-950/45"}`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0 break-words text-sm font-black leading-5">
                      {item.title}
                    </span>
                    {!item.read ? (
                      <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white shadow-sm shadow-red-950">
                        {t("notifications.new")}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1.5 line-clamp-3 block break-words text-xs leading-5 text-gray-300">
                    {item.message}
                  </span>
                  <span className="mt-2 block text-[10px] font-medium text-gray-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </button>
              ))
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center px-4 py-8 text-center">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl"
                >
                  🔔
                </span>
                <p className="mt-3 text-sm font-bold text-gray-400">
                  {t("notifications.empty")}
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/announcements");
            }}
            className="w-full shrink-0 border-t border-white/10 bg-black/35 px-4 py-3.5 text-sm font-black text-red-300 transition hover:bg-red-950/30 hover:text-red-200"
          >
            {t("notifications.viewAll")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
