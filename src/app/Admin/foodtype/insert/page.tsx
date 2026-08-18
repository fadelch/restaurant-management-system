"use client";

import { insert_food_type } from "@/server/insert_food_type";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { showMessage } from "@/components/MessageProvider";

export default function Page() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-red-900/60 bg-[#120000]/80 p-4 text-white placeholder:text-gray-500 caret-white outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-700/50";

  const clearFields = () => {
    setName("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      showMessage("Food type name is required.");
      return;
    }

    try {
      setLoading(true);
      await insert_food_type({ name });
      showMessage("Food type inserted successfully!");
      router.push("/Admin");
      router.refresh();
    } catch (err) {
      console.log("Error inserting food type:", err);
      showMessage("Failed to insert food type.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#120000] px-4 py-10 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-red-900/50 bg-[#1a0000]/95 p-8 shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-400">
          Admin Insert
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase">Add Food Type</h1>
        <p className="mt-2 text-sm text-gray-400">
          Create a category that will group food items on the home menu.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Food type name, example: Burger"
            className={inputClass}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-600 p-4 font-black text-white shadow-lg shadow-red-900/40 transition hover:-translate-y-1 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving..." : "Insert Food Type"}
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
