"use client";

import { useState } from "react";
import { showMessage } from "@/components/MessageProvider";
import { formatUsdWithLbp } from "@/lib/currency";
import { submitFoodIssueReport } from "@/server/foodIssueReports";
import type { FoodIssueReportItem } from "@/types";

const reasons = [
  { value: "damaged", label: "Damaged food or packaging" },
  { value: "spoiled", label: "Spoiled or unsafe food" },
  { value: "foreign_object", label: "Foreign object (for example, hair)" },
  { value: "wrong_item", label: "Wrong food received" },
  { value: "other", label: "Other quality problem" },
] as const;

function reasonLabel(reason: string) {
  return reasons.find((option) => option.value === reason)?.label || reason;
}

function reportTone(status: string) {
  if (status === "approved") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  }
  if (status === "rejected") {
    return "border-red-500/25 bg-red-500/10 text-red-200";
  }
  return "border-yellow-500/25 bg-yellow-500/10 text-yellow-100";
}

export default function FoodIssueReportPanel({
  orderId,
  orderItemId,
  foodName,
  maxQuantity,
  initialReports = [],
}: {
  orderId: string;
  orderItemId: number;
  foodName: string;
  maxQuantity: number;
  initialReports?: FoodIssueReportItem[];
}) {
  const [reports, setReports] = useState(initialReports);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number]["value"]>(
    "damaged",
  );
  const [details, setDetails] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const hasActiveReport = reports.some(
    (report) => report.status === "pending" || report.status === "approved",
  );

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      const report = await submitFoodIssueReport({
        orderId,
        orderItemId,
        reason,
        details,
        quantity,
      });
      setReports((current) => [report, ...current]);
      setOpen(false);
      setDetails("");
      setQuantity(1);
      showMessage(
        "Refund request submitted. It is now in the restaurant's Food Safety queue.",
      );
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "The report could not be sent.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3">
      {reports.map((report) => (
        <div
          key={report.id}
          className={`mb-2 rounded-xl border p-3 text-xs ${reportTone(report.status)}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-black">{reasonLabel(report.reason)}</span>
            <span className="rounded-full bg-black/25 px-2 py-1 font-black uppercase">
              {report.status}
            </span>
          </div>
          <p className="mt-2 text-current/80">{report.details}</p>
          <p className="mt-2 font-bold">Reported quantity: {report.quantity}</p>
          {report.status === "approved" ? (
            <p className="mt-1 font-black">
              Refund: {formatUsdWithLbp(report.refundAmount).usd}
            </p>
          ) : null}
        </div>
      ))}

      {!hasActiveReport ? (
        <div>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs font-black text-orange-200 transition hover:bg-orange-500/20"
          >
            {open ? "Close request" : "Report issue / request refund"}
          </button>
          {!open ? (
            <p className="mt-2 max-w-lg text-xs leading-5 text-gray-500">
              For damaged, spoiled, incorrect, or contaminated food. Your
              request is sent directly to Food Safety and Quality for review.
            </p>
          ) : null}
        </div>
      ) : null}

      {open && !hasActiveReport ? (
        <form
          onSubmit={submit}
          className="mt-3 space-y-3 rounded-xl border border-orange-500/20 bg-orange-950/15 p-4"
        >
          <div>
            <p className="font-black text-orange-200">
              Refund request: {foodName}
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-400">
              Submitting this form automatically creates a report in the admin
              Food Safety and Quality queue.
            </p>
          </div>
          <label className="block text-xs font-bold text-gray-300">
            Problem
            <select
              value={reason}
              onChange={(event) =>
                setReason(
                  event.target.value as (typeof reasons)[number]["value"],
                )
              }
              className="mt-1 w-full rounded-lg border border-white/15 bg-black p-2.5 text-white"
            >
              {reasons.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold text-gray-300">
            Affected quantity
            <input
              type="number"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black p-2.5 text-white"
            />
          </label>
          <label className="block text-xs font-bold text-gray-300">
            What happened?
            <textarea
              required
              minLength={10}
              maxLength={500}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Describe what you found and which part of the food was affected."
              className="mt-1 min-h-24 w-full resize-none rounded-lg border border-white/15 bg-black p-2.5 text-white outline-none focus:border-orange-400"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-orange-600 px-4 py-2.5 font-black text-white hover:bg-orange-700 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit refund request"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
