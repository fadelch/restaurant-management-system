"use client";

import { useCallback, useEffect, useState } from "react";
import { showMessage } from "@/components/MessageProvider";
import { formatUsdWithLbp } from "@/lib/currency";
import {
  getFoodIssueReportsForAdmin,
  reviewFoodIssueReport,
} from "@/server/foodIssueReports";

type IssueReport = Awaited<
  ReturnType<typeof getFoodIssueReportsForAdmin>
>[number];

const reasonLabels: Record<string, string> = {
  damaged: "Damaged food or packaging",
  spoiled: "Spoiled or unsafe food",
  foreign_object: "Foreign object found",
  wrong_item: "Wrong food received",
  other: "Other quality problem",
};

function statusTone(status: string) {
  if (status === "approved") {
    return "bg-emerald-500/15 text-emerald-300";
  }
  if (status === "rejected") return "bg-red-500/15 text-red-300";
  return "bg-yellow-500/15 text-yellow-300";
}

export default function FoodIssueReports() {
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [refundAmounts, setRefundAmounts] = useState<Record<string, string>>(
    {},
  );

  const loadReports = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const data = await getFoodIssueReportsForAdmin();
      setReports(data);
      setRefundAmounts((current) => {
        const next = { ...current };
        data.forEach((report) => {
          if (next[report.id] === undefined) {
            next[report.id] = String(
              Math.min(
                report.order.total,
                report.orderItem.price * report.quantity,
              ).toFixed(2),
            );
          }
        });
        return next;
      });
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Food issue reports could not be loaded.",
      );
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
    const refreshTimer = window.setInterval(() => loadReports(false), 15_000);
    return () => window.clearInterval(refreshTimer);
  }, [loadReports]);

  const review = async (
    report: IssueReport,
    status: "approved" | "rejected",
  ) => {
    try {
      setWorkingId(report.id);
      await reviewFoodIssueReport({
        id: report.id,
        status,
        refundAmount:
          status === "approved"
            ? Number(refundAmounts[report.id] || 0)
            : undefined,
      });
      showMessage(
        status === "approved"
          ? "Issue approved and payment marked as refunded."
          : "Issue report rejected.",
      );
      await loadReports();
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "The report was not updated.",
      );
    } finally {
      setWorkingId("");
    }
  };

  const pendingCount = reports.filter(
    (report) => report.status === "pending",
  ).length;

  return (
    <section className="rounded-2xl border border-orange-500/25 bg-[#180b00] p-5 shadow-2xl sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
            Food safety and quality
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase">
            Customer Food Issues
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Review damaged, spoiled, incorrect, or contaminated food reports.
            Customer refund requests appear here automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-fit rounded-full bg-orange-500/15 px-4 py-2 text-sm font-black text-orange-300">
            {pendingCount} pending
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={() => loadReports(false)}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-black text-gray-200 hover:bg-white/5 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 h-28 animate-pulse rounded-xl bg-white/5" />
      ) : reports.length === 0 ? (
        <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-6 text-center text-gray-400">
          No food issues have been reported.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {reports.map((report) => (
            <article
              key={report.id}
              className="rounded-2xl border border-white/10 bg-black/35 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-gray-500">
                    {report.order.orderNumber || report.order.id}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-white">
                    {report.orderItem.foodName}
                  </h3>
                  <p className="mt-1 text-sm font-bold text-orange-300">
                    {reasonLabels[report.reason] || report.reason}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusTone(report.status)}`}
                >
                  {report.status}
                </span>
              </div>

              <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm leading-6 text-gray-200">
                {report.details}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-400">
                <p>
                  Quantity: <strong className="text-white">{report.quantity}</strong>
                </p>
                <p>
                  Customer: {report.user.name || report.user.email || "Unknown"}
                </p>
                <p className="col-span-2 text-xs">
                  Submitted: {new Date(report.createdAt).toLocaleString()}
                </p>
              </div>

              {report.status === "pending" ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <label className="text-xs font-bold text-gray-300">
                    Refund amount (USD)
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={refundAmounts[report.id] || ""}
                      onChange={(event) =>
                        setRefundAmounts((current) => ({
                          ...current,
                          [report.id]: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black p-2.5 text-white"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={workingId === report.id}
                    onClick={() => review(report, "approved")}
                    className="rounded-lg bg-emerald-700 px-4 py-2.5 font-black text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    Approve refund
                  </button>
                  <button
                    type="button"
                    disabled={workingId === report.id}
                    onClick={() => review(report, "rejected")}
                    className="rounded-lg border border-red-500/40 px-4 py-2.5 font-black text-red-200 hover:bg-red-500/10 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              ) : report.status === "approved" ? (
                <p className="mt-4 font-black text-violet-300">
                  Refunded: {formatUsdWithLbp(report.refundAmount).usd}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
