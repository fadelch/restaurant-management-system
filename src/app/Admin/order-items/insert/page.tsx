"use client";

import { insert_order_item } from "@/server/insert_order_item";
import { getFoods } from "@/server/getFoods";
import { getOrders } from "@/server/getOrders";
import type { AdminOrder, FoodItem } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { showMessage } from "@/components/MessageProvider";

export default function Page() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [orderId, setOrderId] = useState("");
  const [foodId, setFoodId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-red-900/60 bg-[#120000]/80 p-4 text-white placeholder:text-gray-500 caret-white outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-700/50";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersData, foodsData] = await Promise.all([
          getOrders(),
          getFoods(),
        ]);
        setOrders(ordersData);
        setFoods(foodsData);
      } catch (err) {
        console.log("Error fetching order item form data:", err);
      }
    };

    fetchData();
  }, []);

  const selectedFood = useMemo(() => {
    return foods.find((food) => food.id === foodId) || null;
  }, [foods, foodId]);

  const clearFields = () => {
    setOrderId("");
    setFoodId("");
    setQuantity("1");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!orderId || !foodId || !quantity) {
      showMessage("Please fill all required fields.");
      return;
    }

    const parsedQuantity = Number(quantity);

    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      showMessage("Quantity must be greater than 0.");
      return;
    }

    try {
      setLoading(true);
      await insert_order_item({
        orderId,
        foodId,
        quantity: parsedQuantity,
      });
      showMessage("Order item inserted successfully!");
      router.push("/Admin");
      router.refresh();
    } catch (err) {
      console.log("Error inserting order item:", err);
      showMessage(
        err instanceof Error ? err.message : "Failed to insert order item.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#120000] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-red-900/50 bg-[#1a0000]/95 p-8 shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-400">
          Admin Insert
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase">Add Order Item</h1>
        <p className="mt-2 text-sm text-gray-400">
          Add a food item to an order and update stock automatically.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <select
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select order</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.id} - {order.user?.email || order.userId} -{" "}
                {order.status}
              </option>
            ))}
          </select>

          <select
            value={foodId}
            onChange={(e) => setFoodId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select food</option>
            {foods.map((food) => (
              <option key={food.id} value={food.id}>
                {food.name} - ${food.price} - Stock: {food.qty}
              </option>
            ))}
          </select>

          <div>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Quantity"
              className={inputClass}
            />
          </div>

          {selectedFood && (
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-gray-300">
              Selected food:{" "}
              <span className="font-bold text-white">{selectedFood.name}</span>{" "}
              | Stock: {selectedFood.qty} | Database price: ${selectedFood.price}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-600 p-4 font-black text-white shadow-lg shadow-red-900/40 transition hover:-translate-y-1 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving..." : "Insert Order Item"}
          </button>

          <button
            type="button"
            onClick={clearFields}
            className="w-full rounded-xl border border-red-900/60 bg-[#120000]/80 p-4 font-black text-red-200 shadow-lg shadow-red-950/30 transition hover:-translate-y-1 hover:border-red-500 hover:bg-[#240000]"
          >
            Clear Fields
          </button>

          <button
            type="button"
            onClick={() => router.push("/Admin")}
            className="w-full rounded-xl border border-white/10 bg-black/40 p-4 font-black text-gray-200 transition hover:bg-black/70"
          >
            Back to Admin
          </button>
        </form>
      </div>
    </div>
  );
}
