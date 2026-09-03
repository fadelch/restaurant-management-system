"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPageControls from "@/components/AdminPageControls";
import { showMessage } from "@/components/MessageProvider";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementPage,
  setAnnouncementPublished,
  updateAnnouncement,
} from "@/server/announcements";
import type { AnnouncementItem, SortDirection } from "@/types";

type Draft = {
  id?: string;
  title: string;
  message: string;
  eventDay: string;
  eventTime: string;
  expirationDay: string;
  expirationTime: string;
};

const emptyDraft: Draft = {
  title: "",
  message: "",
  eventDay: "",
  eventTime: "",
  expirationDay: "",
  expirationTime: "",
};

function dateInput(value?: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function dateTimeInput(value?: Date | string | null) {
  const localValue = dateInput(value);
  const [day = "", time = ""] = localValue.split("T");
  return { day, time };
}

function optionalDateTimeIso(day: string, time: string) {
  return day && time ? new Date(`${day}T${time}`).toISOString() : null;
}

export default function AnnouncementManager() {
  const { confirm: askConfirmation, dialog } = useConfirmDialog();
  const [query, setQuery] = useState({
    page: 1,
    pageSize: 10,
    search: "",
    filter: "all",
    sort: "createdAt",
    direction: "desc" as SortDirection,
  });
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formOpen, setFormOpen] = useState(false);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getAnnouncementPage(query);
      setItems(result.items);
      setPages(result.pages);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Announcements could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const edit = (item: AnnouncementItem) => {
    const eventDate = dateTimeInput(item.eventDate);
    const expirationDate = dateTimeInput(item.expiresAt);
    setDraft({
      id: item.id,
      title: item.title,
      message: item.message,
      eventDay: eventDate.day,
      eventTime: eventDate.time,
      expirationDay: expirationDate.day,
      expirationTime: expirationDate.time,
    });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setWorking(draft.id || "new");
      const input = {
        id: draft.id,
        title: draft.title,
        message: draft.message,
        eventDate: optionalDateTimeIso(draft.eventDay, draft.eventTime),
        expiresAt: optionalDateTimeIso(
          draft.expirationDay,
          draft.expirationTime,
        ),
      };
      if (draft.id) await updateAnnouncement(input);
      else await createAnnouncement(input);
      showMessage(draft.id ? "Announcement updated." : "Announcement created.");
      setDraft(emptyDraft);
      setFormOpen(false);
      await load();
    } catch (saveError) {
      showMessage(
        saveError instanceof Error
          ? saveError.message
          : "Announcement could not be saved.",
      );
    } finally {
      setWorking(null);
    }
  };

  const togglePublished = async (item: AnnouncementItem) => {
    try {
      setWorking(item.id);
      await setAnnouncementPublished({
        id: item.id,
        published: !item.published,
      });
      showMessage(
        item.published
          ? "Announcement unpublished and notifications removed."
          : "Announcement published and users notified.",
      );
      await load();
    } catch (publishError) {
      showMessage(
        publishError instanceof Error
          ? publishError.message
          : "Publication status could not be changed.",
      );
    } finally {
      setWorking(null);
    }
  };

  const remove = async (item: AnnouncementItem) => {
    const confirmed = await askConfirmation({
      title: "Delete announcement?",
      message: `Delete “${item.title}” permanently?`,
    });
    if (!confirmed) return;
    try {
      setWorking(item.id);
      await deleteAnnouncement(item.id);
      showMessage("Announcement deleted.");
      await load();
    } catch (deleteError) {
      showMessage(
        deleteError instanceof Error
          ? deleteError.message
          : "Announcement could not be deleted.",
      );
    } finally {
      setWorking(null);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white outline-none focus:border-red-500";

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-8">
      <section className="mb-6 rounded-2xl border border-red-900/50 bg-[#1a0000] p-6 shadow-2xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-red-400">
              Admin only
            </p>
            <h1 className="mt-2 text-3xl font-black uppercase sm:text-4xl">
              Announcements & Events
            </h1>
            <p className="mt-2 text-gray-400">
              Create restaurant news and notify users when it is published.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDraft(emptyDraft);
              setFormOpen((value) => !value);
            }}
            className="rounded-xl bg-red-600 px-5 py-3 font-black hover:bg-red-700"
          >
            {formOpen ? "Close form" : "New announcement"}
          </button>
        </div>
      </section>

      {formOpen ? (
        <form
          onSubmit={save}
          className="mb-6 grid gap-4 rounded-2xl border border-white/10 bg-[#160000] p-5 sm:grid-cols-2"
        >
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold">Title</span>
            <input
              required
              maxLength={150}
              value={draft.title}
              onChange={(event) =>
                setDraft((value) => ({ ...value, title: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold">Message</span>
            <textarea
              required
              maxLength={2000}
              rows={5}
              value={draft.message}
              onChange={(event) =>
                setDraft((value) => ({ ...value, message: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">
              Event day (optional)
            </span>
            <input
              type="date"
              value={draft.eventDay}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  eventDay: event.target.value,
                  eventTime: event.target.value ? value.eventTime : "",
                }))
              }
              className={inputClass}
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">
              Approximate event time
            </span>
            <input
              type="time"
              required={Boolean(draft.eventDay)}
              disabled={!draft.eventDay}
              value={draft.eventTime}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  eventTime: event.target.value,
                }))
              }
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">
              Expiration day (optional)
            </span>
            <input
              type="date"
              value={draft.expirationDay}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  expirationDay: event.target.value,
                  expirationTime: event.target.value
                    ? value.expirationTime
                    : "",
                }))
              }
              className={inputClass}
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">
              Expiration time
            </span>
            <input
              type="time"
              required={Boolean(draft.expirationDay)}
              disabled={!draft.expirationDay}
              value={draft.expirationTime}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  expirationTime: event.target.value,
                }))
              }
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
            />
          </label>
          <div className="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={working !== null}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-black disabled:opacity-50"
            >
              {working ? "Saving..." : draft.id ? "Update" : "Create draft"}
            </button>
            {draft.id ? (
              <button
                type="button"
                onClick={() => setDraft(emptyDraft)}
                className="rounded-xl border border-white/15 px-5 py-3 font-bold"
              >
                Clear edit
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-[#160000] p-5">
        <AdminPageControls
          {...query}
          pages={pages}
          filters={[
            { value: "draft", label: "Drafts" },
            { value: "published", label: "Published" },
            { value: "expired", label: "Expired" },
          ]}
          sorts={[
            { value: "createdAt", label: "Created" },
            { value: "updatedAt", label: "Updated" },
            { value: "eventDate", label: "Event date" },
            { value: "title", label: "Title" },
          ]}
          onChange={(next) => setQuery((value) => ({ ...value, ...next }))}
        />

        {error ? (
          <div className="rounded-xl bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((value) => (
              <div
                key={value}
                className="h-28 animate-pulse rounded-xl bg-white/5"
              />
            ))}
          </div>
        ) : items.length ? (
          <div className="space-y-4">
            {items.map((item) => {
              const expired = Boolean(
                item.expiresAt && new Date(item.expiresAt) <= new Date(),
              );
              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="break-words text-xl font-black">
                          {item.title}
                        </h2>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${expired ? "bg-orange-500/15 text-orange-200" : item.published ? "bg-emerald-500/15 text-emerald-200" : "bg-gray-500/15 text-gray-300"}`}
                        >
                          {expired
                            ? "EXPIRED"
                            : item.published
                              ? "PUBLISHED"
                              : "DRAFT"}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                        {item.message}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>
                          Created {new Date(item.createdAt).toLocaleString()}
                        </span>
                        {item.eventDate ? (
                          <>
                            <span>
                              Event day{" "}
                              {new Date(item.eventDate).toLocaleDateString()}
                            </span>
                            <span>
                              Approx. event time{" "}
                              {new Date(item.eventDate).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </>
                        ) : null}
                        {item.expiresAt ? (
                          <>
                            <span>
                              Expiration day{" "}
                              {new Date(item.expiresAt).toLocaleDateString()}
                            </span>
                            <span>
                              Expiration time{" "}
                              {new Date(item.expiresAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </>
                        ) : null}
                        <span>{item._count.notifications} notifications</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={working === item.id}
                        onClick={() => edit(item)}
                        className="rounded-xl border border-white/15 px-4 py-2 font-bold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={working === item.id}
                        onClick={() => togglePublished(item)}
                        className={`rounded-xl px-4 py-2 font-black ${item.published ? "bg-yellow-700" : "bg-emerald-700"}`}
                      >
                        {item.published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        disabled={working === item.id}
                        onClick={() => remove(item)}
                        className="rounded-xl bg-red-800 px-4 py-2 font-black"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="py-12 text-center text-gray-500">
            No announcements match these filters.
          </p>
        )}
      </section>
      </div>
      {dialog}
    </>
  );
}
