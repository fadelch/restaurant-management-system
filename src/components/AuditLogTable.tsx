"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPageControls from "@/components/AdminPageControls";
import { getAuditLogPage } from "@/server/adminData";

type Data = Awaited<ReturnType<typeof getAuditLogPage>>;
type ChangeRecord = Record<string, unknown>;

const ignoredFields = new Set(["id", "createdAt", "updatedAt"]);
const moneyFields = new Set([
  "price",
  "total",
  "subtotal",
  "deliveryFee",
  "minimumOrder",
  "discountAmount",
]);

const fieldLabels: Record<string, string> = {
  qty: "Quantity",
  minStock: "Minimum stock",
  typeId: "Category ID",
  userId: "User ID",
  foodId: "Food ID",
  orderId: "Order ID",
  isAdmin: "Administrator access",
  isBanned: "Banned",
  isActive: "Active",
  isAvailable: "Available",
  isClosed: "Closed",
  discountType: "Discount type",
  dayOfWeek: "Day",
  openTime: "Opening time",
  closeTime: "Closing time",
  estimatedMinutes: "Estimated minutes",
  targetEmail: "User",
};

function isRecord(value: unknown): value is ChangeRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fieldLabel(key: string) {
  if (fieldLabels[key]) return fieldLabels[key];
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function displayValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && moneyFields.has(key)) {
    return `$${value.toFixed(2)}`;
  }
  if (key === "dayOfWeek" && typeof value === "number") {
    return (
      [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][value] || String(value)
    );
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (isRecord(item) && typeof item.name === "string") {
          const price =
            typeof item.price === "number"
              ? ` (+$${item.price.toFixed(2)})`
              : "";
          return `${item.name}${price}`;
        }
        return isRecord(item) ? displayValue(key, item) : String(item);
      })
      .join(", ");
  }
  if (isRecord(value)) {
    return visibleEntries(value)
      .map(
        ([childKey, childValue]) =>
          `${fieldLabel(childKey)}: ${displayValue(childKey, childValue)}`,
      )
      .join(", ");
  }
  return String(value);
}

function visibleEntries(record: ChangeRecord) {
  return Object.entries(record).filter(([key]) => !ignoredFields.has(key));
}

function AuditChanges({ changes }: { changes: unknown }) {
  if (!isRecord(changes)) {
    return <span className="text-gray-500">No details recorded</span>;
  }

  const before = isRecord(changes.before) ? changes.before : null;
  const after = isRecord(changes.after) ? changes.after : null;
  const deleted = isRecord(changes.deleted) ? changes.deleted : null;

  if (before && after) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
      .filter((key) => !ignoredFields.has(key))
      .filter(
        (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
      );
    const extras = Object.entries(changes).filter(
      ([key]) => key !== "before" && key !== "after",
    );

    return (
      <div className="space-y-2">
        {keys.length ? (
          keys.map((key) => (
            <div
              key={key}
              className="rounded-lg border border-white/10 bg-black/30 p-2"
            >
              <p className="text-xs font-bold text-gray-400">
                {fieldLabel(key)}
              </p>
              <p className="mt-1 break-words">
                <span className="text-red-300 line-through decoration-red-500/60">
                  {displayValue(key, before[key])}
                </span>
                <span className="mx-2 text-gray-500">→</span>
                <span className="font-bold text-emerald-300">
                  {displayValue(key, after[key])}
                </span>
              </p>
            </div>
          ))
        ) : (
          <span className="text-gray-500">No value changed</span>
        )}
        {extras.map(([key, value]) => (
          <p key={key} className="break-words text-xs text-gray-300">
            <span className="font-bold text-gray-400">{fieldLabel(key)}:</span>{" "}
            {displayValue(key, value)}
          </p>
        ))}
      </div>
    );
  }

  const record = deleted || before || after || changes;
  const prefix =
    deleted || (before && !after)
      ? "Deleted"
      : after && !before
        ? "Created"
        : null;
  const entries = visibleEntries(record);

  return (
    <div className="space-y-1.5">
      {prefix ? (
        <p
          className={`mb-2 text-xs font-black uppercase ${prefix === "Deleted" ? "text-red-300" : "text-emerald-300"}`}
        >
          {prefix} record
        </p>
      ) : null}
      {entries.length ? (
        entries.map(([key, value]) => (
          <p key={key} className="break-words text-xs text-gray-300">
            <span className="font-bold text-gray-400">{fieldLabel(key)}:</span>{" "}
            {displayValue(key, value)}
          </p>
        ))
      ) : (
        <span className="text-gray-500">No details recorded</span>
      )}
    </div>
  );
}

export default function AuditLogTable() {
  const [query, setQuery] = useState<{
    page: number;
    pageSize: number;
    search: string;
    filter: string;
    sort: string;
    direction: "asc" | "desc";
  }>({
    page: 1,
    pageSize: 10,
    search: "",
    filter: "all",
    sort: "createdAt",
    direction: "desc",
  });
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getAuditLogPage(query));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Audit logs could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#160000] p-5">
      <AdminPageControls
        {...query}
        pages={data?.pages || 1}
        filters={(data?.filters || []).map((value) => ({
          value,
          label: value,
        }))}
        sorts={[
          { value: "createdAt", label: "Date" },
          { value: "adminEmail", label: "Administrator" },
          { value: "action", label: "Action" },
          { value: "entityType", label: "Record type" },
        ]}
        onChange={(next) => setQuery((current) => ({ ...current, ...next }))}
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((number) => (
            <div
              key={number}
              className="h-16 animate-pulse rounded-xl bg-white/5"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-500/10 p-5 text-red-200">
          {error}
          <button
            type="button"
            onClick={load}
            className="ml-4 cursor-pointer rounded bg-red-600 px-4 py-2 font-bold"
          >
            Retry
          </button>
        </div>
      ) : !data?.items.length ? (
        <div className="p-10 text-center text-gray-400">
          No audit activity matches your search.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-red-950">
              <tr>
                <th className="p-3">Date and time</th>
                <th className="p-3">Who</th>
                <th className="p-3">Action</th>
                <th className="p-3">Record</th>
                <th className="p-3">What changed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.items.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="whitespace-nowrap p-3">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3">{log.adminEmail}</td>
                  <td className="p-3 font-bold text-red-300">
                    {log.action.replaceAll("_", " ")}
                  </td>
                  <td className="p-3">
                    {log.entityType}
                    <div
                      className="max-w-40 truncate font-mono text-xs text-gray-500"
                      title={log.entityId || undefined}
                    >
                      {log.entityId || "-"}
                    </div>
                  </td>
                  <td className="min-w-72 p-3">
                    <AuditChanges changes={log.changes} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
