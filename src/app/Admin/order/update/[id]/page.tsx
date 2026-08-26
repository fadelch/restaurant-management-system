"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getOrderById } from "@/server/getOrderById";
import { updateOrderStatus } from "@/server/updateOrderStatus";
import { formatUsdWithLbp } from "@/lib/currency";
import { showMessage } from "@/components/MessageProvider";
import { updatePaymentStatus } from "@/server/updatePaymentStatus";
import { paymentStatusSchema } from "@/lib/validation";
import type { PaymentStatus } from "@/types";

export default function UpdateOrderPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [status, setStatus] = useState("pending");
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("pending");
  const [refundedAmount, setRefundedAmount] = useState(0);
  const [userEmail, setUserEmail] = useState("");
  const [total, setTotal] = useState(0);
  const [itemsCount, setItemsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const totalPrice = formatUsdWithLbp(total);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const order = await getOrderById(id);

        if (!order) {
          showMessage("Order not found.");
          router.push("/Admin");
          return;
        }

        setStatus(order.status);
        const parsedPaymentStatus = paymentStatusSchema.safeParse(
          order.paymentStatus,
        );
        if (parsedPaymentStatus.success) {
          setPaymentStatus(parsedPaymentStatus.data);
        }
        setRefundedAmount(order.refundedAmount);
        setUserEmail(order.user?.email || "");
        setTotal(order.total);
        setItemsCount(order.items?.length || 0);
      } catch (err) {
        console.log("Error loading order:", err);
        showMessage("Failed to load order.");
        router.push("/Admin");
      }
    };

    if (id) {
      fetchOrder();
    }
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);

      await updateOrderStatus({
        id,
        status,
      });

      showMessage("Order status updated successfully!");
      router.push("/Admin");
      router.refresh();
    } catch (err) {
      console.log("Error updating order:", err);
      showMessage("Failed to update order status.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    try {
      setPaymentLoading(true);
      const updated = await updatePaymentStatus({ id, paymentStatus });
      const parsedPaymentStatus = paymentStatusSchema.safeParse(
        updated.paymentStatus,
      );
      if (parsedPaymentStatus.success) {
        setPaymentStatus(parsedPaymentStatus.data);
      }
      setRefundedAmount(updated.refundedAmount);
      showMessage("Payment status updated successfully!");
      router.refresh();
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Failed to update payment status.",
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#120000] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-red-900/50 bg-[#1a0000]/95 p-8 shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-400">
          Admin Update
        </p>

        <h1 className="mt-3 text-4xl font-black uppercase">Update Order</h1>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
          <p className="text-sm text-gray-400">Order ID</p>
          <p className="mt-1 break-all font-mono text-sm text-white">{id}</p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-gray-400">User</p>
              <p className="mt-1 font-bold text-white">{userEmail || "-"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400">Items</p>
              <p className="mt-1 font-bold text-white">{itemsCount}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400">Total</p>
              <p className="mt-1 font-bold text-green-300">{totalPrice.usd}</p>
              <p className="text-xs text-gray-400">≈ {totalPrice.lbp}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-yellow-500/10 px-3 py-1 font-black capitalize text-yellow-300">
              Payment: {paymentStatus}
            </span>
            {refundedAmount > 0 ? (
              <span className="rounded-full bg-violet-500/10 px-3 py-1 font-black text-violet-300">
                Refunded: {formatUsdWithLbp(refundedAmount).usd}
              </span>
            ) : null}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block text-sm font-black text-gray-200">
            Order status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-xl border border-red-900/60 bg-[#120000]/80 p-4 text-white outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-700/50"
          >
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-700 p-4 font-black text-white shadow-lg shadow-green-900/40 transition hover:-translate-y-1 hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 hover:cursor-pointer"
          >
            {loading ? "Updating..." : "Update Status"}
          </button>
        </form>

        <form
          onSubmit={handlePaymentSubmit}
          className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-black/25 p-5"
        >
          <div>
            <label className="block text-sm font-black text-gray-200">
              Cash payment status
            </label>
            <p className="mt-1 text-xs leading-5 text-gray-400">
              Done means cash was collected. Refunded marks the full order as
              refunded; approved food issue reports can record a partial refund.
            </p>
          </div>
          <select
            value={paymentStatus}
            onChange={(event) =>
              setPaymentStatus(event.target.value as PaymentStatus)
            }
            className="w-full rounded-xl border border-red-900/60 bg-[#120000]/80 p-4 text-white outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-700/50"
          >
            <option value="pending">Pending</option>
            <option value="done">Done (cash collected)</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
          <button
            type="submit"
            disabled={paymentLoading}
            className="w-full rounded-xl bg-violet-700 p-4 font-black text-white transition hover:bg-violet-800 disabled:opacity-60"
          >
            {paymentLoading ? "Updating..." : "Update Payment Status"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => router.push("/Admin")}
          className="mt-6 w-full rounded-xl border border-white/10 bg-black/40 p-4 font-black text-gray-200 transition hover:cursor-pointer hover:bg-black/70"
        >
          Back to Admin
        </button>
      </div>
    </div>
  );
}
