"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getOrderById } from "@/server/getOrderById";
import { deleteOrder } from "@/server/deleteOrder";
import { formatUsdWithLbp } from "@/lib/currency";
import { showMessage } from "@/components/MessageProvider";

export default function DeleteOrderPage() {
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;

  const [userEmail, setUserEmail] = useState("");
  const [status, setStatus] = useState("");
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

        setUserEmail(order.user?.email || "");
        setStatus(order.status);
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

  const handleDelete = async () => {
    try {
      setLoading(true);

      await deleteOrder(id);

      showMessage("Order deleted successfully!");
      router.push("/Admin");
      router.refresh();
    } catch (err) {
      console.log("Error deleting order:", err);
      showMessage("Failed to delete order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#120000] px-6 py-10 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-red-900/50 bg-[#1a0000] p-8 shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-400">
          Admin Delete
        </p>

        <h1 className="mt-3 text-4xl font-black uppercase text-white">
          Delete Order
        </h1>

        <p className="mt-4 text-gray-300">
          Are you sure you want to delete this order?
        </p>

        <div className="mt-6 rounded-2xl border border-red-900/60 bg-[#120000]/80 p-5">
          <p className="text-sm text-gray-400">Order ID</p>
          <p className="mt-1 break-all font-mono text-sm text-white">{id}</p>

          <div className="mt-5 space-y-3">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">User</span>
              <span className="font-bold text-white">{userEmail || "-"}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Status</span>
              <span className="font-bold uppercase text-yellow-300">
                {status || "-"}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Items</span>
              <span className="font-bold text-white">{itemsCount}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Total</span>
              <span className="font-bold text-green-300">{totalPrice.usd}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Total LBP</span>
              <span className="font-bold text-white">{totalPrice.lbp}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="w-full rounded-xl bg-red-600 p-4 font-black text-white transition hover:bg-red-700 disabled:opacity-60 hover:cursor-pointer"
          >
            {loading ? "Deleting..." : "Yes, Delete Order"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/Admin")}
            className="w-full rounded-xl border border-red-900/60 bg-[#120000] p-4 font-black text-red-200 transition hover:bg-[#240000] hover:cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
