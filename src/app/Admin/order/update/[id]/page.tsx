"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getOrderById } from "@/server/getOrderById";
import { updateOrderStatus } from "@/server/updateOrderStatus";
import { formatUsdWithLbp } from "@/lib/currency";
import { showMessage } from "@/components/MessageProvider";

export default function UpdateOrderPage() {
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;

  const [status, setStatus] = useState("pending");
  const [userEmail, setUserEmail] = useState("");
  const [total, setTotal] = useState(0);
  const [itemsCount, setItemsCount] = useState(0);
  const [loading, setLoading] = useState(false);

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
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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

          <button
            type="button"
            onClick={() => router.push("/Admin")}
            className="w-full rounded-xl border border-white/10 bg-black/40 p-4 font-black text-gray-200 transition hover:bg-black/70 hover:cursor-pointer"
          >
            Back to Admin
          </button>
        </form>
      </div>
    </div>
  );
}
