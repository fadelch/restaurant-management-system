"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFoodById } from "@/server/getFoodById";
import { deleteFood } from "@/server/deleteFood";
import { formatUsdWithLbp } from "@/lib/currency";
import { showMessage } from "@/components/MessageProvider";

export default function DeleteFoodPage() {
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;

  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [qty, setQty] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const convertedPrice = price !== null ? formatUsdWithLbp(price) : null;

  useEffect(() => {
    const fetchFood = async () => {
      try {
        const data = await getFoodById(id);

        if (!data) {
          showMessage("Food not found.");
          router.push("/Admin");
          return;
        }

        setName(data.name);
        setImage(data.image);
        setPrice(data.price);
        setQty(data.qty);
      } catch (err) {
        console.log("Error loading food:", err);
        showMessage("Food not found.");
        router.push("/Admin");
      }
    };

    if (id) {
      fetchFood();
    }
  }, [id, router]);

  const handleDelete = async () => {
    try {
      setLoading(true);

      await deleteFood(id);

      showMessage("Food deleted successfully!");
      router.push("/Admin");
      router.refresh();
    } catch (err) {
      console.log("Error deleting food:", err);
      showMessage("Failed to delete food.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#120000] px-3 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-xl rounded-2xl border border-red-900/50 bg-[#1a0000] p-5 shadow-2xl sm:rounded-3xl sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-red-400 sm:tracking-[0.3em]">
          Admin Delete
        </p>

        <h1 className="mt-3 text-3xl font-black uppercase text-white sm:text-4xl">
          Delete Food
        </h1>

        <p className="mt-4 text-gray-300">
          Are you sure you want to delete this food item?
        </p>

        <div className="mt-6 rounded-2xl border border-red-900/60 bg-[#120000]/80 p-5">
          {image ? (
            <img
              src={image}
              alt={name}
              className="mb-5 h-40 w-full rounded-2xl object-cover"
            />
          ) : null}

          <p className="text-sm text-gray-400">Food</p>

          <p className="mt-2 break-words text-2xl font-black text-red-300">
            {name || "Loading..."}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 min-[360px]:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-sm text-gray-400">Price</p>

              <p className="mt-1 break-words font-bold text-white">
                {convertedPrice ? convertedPrice.usd : "-"}
              </p>

              <p className="mt-1 break-words text-xs font-bold text-gray-400">
                {convertedPrice ? `≈ ${convertedPrice.lbp}` : ""}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-sm text-gray-400">Quantity</p>

              <p className="mt-1 font-bold text-white">
                {qty !== null ? qty : "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4 sm:mt-8">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="w-full cursor-pointer rounded-xl bg-red-600 p-3.5 font-black text-white transition hover:bg-red-700 disabled:opacity-60 sm:p-4"
          >
            {loading ? "Deleting..." : "Yes, Delete Food"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/Admin")}
            className="w-full cursor-pointer rounded-xl border border-red-900/60 bg-[#120000] p-3.5 font-black text-red-200 transition hover:bg-[#240000] sm:p-4"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
