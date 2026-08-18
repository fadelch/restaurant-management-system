"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getFoodTypeById } from "@/server/getFoodTypeById";
import { updateFoodType } from "@/server/updateFoodType";
import { showMessage } from "@/components/MessageProvider";

export default function UpdateFoodTypePage() {
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-red-900/60 bg-[#120000]/80 p-3.5 text-base text-white sm:p-4 placeholder:text-gray-500 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-700/50";

  useEffect(() => {
    const fetchFoodType = async () => {
      try {
        const data = await getFoodTypeById(id);

        if (data) {
          setName(data.name);
        }
      } catch (err) {
        console.log("Error loading food type:", err);
        showMessage("Food type not found.");
        router.push("/Admin");
      }
    };

    if (id) {
      fetchFoodType();
    }
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      showMessage("Food type name is required.");
      return;
    }

    try {
      setLoading(true);

      await updateFoodType({
        id,
        name,
      });

      showMessage("Food type updated successfully!");
      router.push("/Admin");
      router.refresh();
    } catch (err) {
      console.log("Error updating food type:", err);
      showMessage("Failed to update food type.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#120000] px-3 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-xl rounded-2xl border border-red-900/50 bg-[#1a0000] p-5 shadow-2xl sm:rounded-3xl sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-red-400 sm:tracking-[0.3em]">
          Admin Update
        </p>

        <h1 className="mt-3 text-3xl font-black uppercase text-white sm:text-4xl">
          Update Food Type
        </h1>

        <p className="mt-2 text-sm text-gray-400">
          Edit this food category name.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 sm:mt-8">
          <input
            className={inputClass}
            placeholder="Food type name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-xl bg-green-700 p-3.5 font-black text-white transition hover:bg-green-800 disabled:opacity-60 sm:p-4"
          >
            {loading ? "Updating..." : "Update Food Type"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/Admin")}
            className="w-full cursor-pointer rounded-xl border border-red-900/60 bg-[#120000] p-3.5 font-black text-red-200 transition hover:bg-[#240000] sm:p-4"
          >
            Back to Admin
          </button>
        </form>
      </div>
    </div>
  );
}
