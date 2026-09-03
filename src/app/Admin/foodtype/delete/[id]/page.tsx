"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFoodTypeById } from "@/server/getFoodTypeById";
import { deleteFoodType } from "@/server/deleteFoodType";
import { showMessage } from "@/components/MessageProvider";
import { useConfirmDialog } from "@/components/ConfirmDialog";

export default function DeleteFoodTypePage() {
  const { confirm: askConfirmation, dialog } = useConfirmDialog();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const id = params.id;

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFoodType = async () => {
      try {
        const data = await getFoodTypeById(id);

        if (!data) {
          showMessage("Food type not found.");
          router.push("/Admin");
          return;
        }

        setName(data.name);
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

  const handleDelete = async () => {
    const confirmed = await askConfirmation({
      title: "Delete food type?",
      message: `Permanently delete ${name || "this food type"}?`,
    });
    if (!confirmed) return;

    try {
      setLoading(true);

      await deleteFoodType(id);

      showMessage("Food type deleted successfully!");
      router.push("/Admin");
      router.refresh();
    } catch (err) {
      console.log("Error deleting food type:", err);
      showMessage(
        "Failed to delete food type. Make sure no foods are using this type.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#120000] px-6 py-10 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-red-900/50 bg-[#1a0000] p-8 shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-400">
          Admin Delete
        </p>

        <h1 className="mt-3 text-4xl font-black uppercase text-white">
          Delete Food Type
        </h1>

        <p className="mt-4 text-gray-300">
          Are you sure you want to delete this food type?
        </p>

        <div className="mt-6 rounded-2xl border border-red-900/60 bg-[#120000]/80 p-5">
          <p className="text-sm text-gray-400">Food Type</p>
          <p className="mt-2 text-2xl font-black text-red-300">
            {name || "Loading..."}
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="w-full rounded-xl bg-red-600 p-4 font-black text-white transition hover:bg-red-700 disabled:opacity-60 hover:cursor-pointer"
          >
            {loading ? "Deleting..." : "Yes, Delete Food Type"}
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
      {dialog}
    </>
  );
}
