"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAdminFoodById } from "@/server/getFoodById";
import { updateFood } from "@/server/updateFood";
import { getFoodTypes } from "@/server/getFoodTypes";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import type { FoodTypeSummary } from "@/types";
import { showMessage } from "@/components/MessageProvider";
import FoodImageUpload from "@/components/FoodImageUpload";
import FoodIngredientsEditor from "@/components/FoodIngredientsEditor";
import {
  normalizeOptionalIngredients,
  type OptionalIngredient,
} from "@/lib/foodOptions";

export default function UpdateFoodPage() {
  const { formatUsdWithLbp } = useCurrency();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const id = params.id;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [optionalIngredients, setOptionalIngredients] = useState<
    OptionalIngredient[]
  >([]);
  const [extraCheesePrice, setExtraCheesePrice] = useState("1.50");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [minStock, setMinStock] = useState("5");
  const [image, setImage] = useState("");
  const [typeId, setTypeId] = useState("");
  const [foodTypes, setFoodTypes] = useState<FoodTypeSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const parsedPrice = Number(price);

  const convertedPrice =
    price && !Number.isNaN(parsedPrice) && parsedPrice > 0
      ? formatUsdWithLbp(parsedPrice)
      : null;

  const inputClass =
    "w-full rounded-xl border border-red-900/60 bg-[#120000]/80 p-3.5 text-base text-white sm:p-4 placeholder:text-gray-500 caret-white outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-700/50";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [food, types] = await Promise.all([
          getAdminFoodById(id),
          getFoodTypes(),
        ]);

        if (!food) {
          showMessage("Food not found.");
          router.push("/Admin");
          return;
        }

        setName(food.name);
        setDescription(food.description || "");
        setIngredients(food.ingredients);
        setOptionalIngredients(
          normalizeOptionalIngredients(food.optionalIngredients),
        );
        setExtraCheesePrice(String(food.extraCheesePrice));
        setPrice(String(food.price));
        setQty(String(food.qty));
        setMinStock(String(food.minStock ?? 5));
        setImage(food.image || "");
        setTypeId(food.typeId);
        setFoodTypes(types);
      } catch (err) {
        console.log("Error loading food:", err);
        showMessage("Food not found.");
        router.push("/Admin");
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, router]);

  const clearFields = () => {
    setName("");
    setDescription("");
    setIngredients([]);
    setOptionalIngredients([]);
    setExtraCheesePrice("1.50");
    setPrice("");
    setQty("");
    setMinStock("5");
    setImage("");
    setTypeId("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim() || !price || !qty || !typeId) {
      showMessage("Please fill all required fields.");
      return;
    }

    const parsedQty = Number(qty);
    const parsedMinStock = Number(minStock);
    const parsedExtraCheesePrice = Number(extraCheesePrice);

    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      showMessage("Price must be greater than 0.");
      return;
    }

    if (Number.isNaN(parsedQty) || parsedQty < 0) {
      showMessage("Quantity cannot be negative.");
      return;
    }

    if (Number.isNaN(parsedMinStock) || parsedMinStock < 0) {
      showMessage("Minimum stock cannot be negative.");
      return;
    }

    if (Number.isNaN(parsedExtraCheesePrice) || parsedExtraCheesePrice < 0) {
      showMessage("Extra-cheese price cannot be negative.");
      return;
    }

    if (ingredients.some((ingredient) => !ingredient.trim())) {
      showMessage(
        "Enter a name for every included ingredient or remove its empty row.",
      );
      return;
    }

    if (
      optionalIngredients.some(
        (ingredient) =>
          !ingredient.name.trim() ||
          !Number.isFinite(ingredient.price) ||
          ingredient.price < 0,
      )
    ) {
      showMessage(
        "Enter a valid name and non-negative price for every optional ingredient.",
      );
      return;
    }

    try {
      setLoading(true);

      await updateFood({
        id,
        name,
        description,
        ingredients: ingredients.map((item) => item.trim()),
        optionalIngredients: optionalIngredients.map((item) => ({
          name: item.name.trim(),
          price: item.price,
        })),
        extraCheesePrice: parsedExtraCheesePrice,
        price: parsedPrice,
        qty: parsedQty,
        minStock: parsedMinStock,
        image,
        typeId,
      });

      showMessage("Food updated successfully!");
      router.push("/Admin");
      router.refresh();
    } catch (err) {
      console.log("Error updating food:", err);
      showMessage("Failed to update food.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#120000] px-3 py-6 text-white sm:px-4 sm:py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-900/50 bg-[#1a0000]/95 p-5 shadow-2xl sm:rounded-3xl sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-red-400 sm:tracking-[0.3em]">
          Admin Update
        </p>

        <h1 className="mt-3 text-3xl font-black uppercase sm:text-4xl">
          Update Food
        </h1>

        <p className="mt-2 text-sm text-gray-400">
          Edit the selected food item. The price is saved in US dollars and
          converted to Lebanese pounds for display.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 sm:mt-8">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Food name"
            className={inputClass}
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder="Food description shown to customers"
            className={`${inputClass} min-h-28 resize-none`}
          />

          <FoodIngredientsEditor
            ingredients={ingredients}
            onIngredientsChange={setIngredients}
            optionalIngredients={optionalIngredients}
            onOptionalIngredientsChange={setOptionalIngredients}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Price in USD, example: 5.99"
                className={inputClass}
              />

              {convertedPrice ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-sm text-gray-400">Converted price</p>

                  <p className="mt-1 text-lg font-black text-green-300">
                    {convertedPrice.usd}
                  </p>

                  <p className="text-sm font-bold text-gray-300">
                    ≈ {convertedPrice.lbp}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4">
              <input
                type="number"
                min="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="Quantity"
                className={inputClass}
              />
              <input
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="Low-stock warning level"
                className={inputClass}
              />
            </div>
          </div>

          <select
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select food type</option>

            {foodTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-300">
              Extra cheese price (USD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={extraCheesePrice}
              onChange={(e) => setExtraCheesePrice(e.target.value)}
              className={inputClass}
            />
          </div>

          <FoodImageUpload value={image} onChange={setImage} />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-700 p-3.5 font-black text-white shadow-lg shadow-green-900/40 transition hover:-translate-y-1 hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:p-4"
          >
            {loading ? "Updating..." : "Update Food"}
          </button>

          <button
            type="button"
            onClick={clearFields}
            className="w-full cursor-pointer rounded-xl border border-red-900/60 bg-[#120000]/80 p-3.5 font-black text-red-200 shadow-lg shadow-red-950/30 transition hover:-translate-y-1 hover:border-red-500 hover:bg-[#240000] sm:p-4"
          >
            Clear Fields
          </button>

          <button
            type="button"
            onClick={() => router.push("/Admin")}
            className="w-full cursor-pointer rounded-xl border border-white/10 bg-black/40 p-3.5 font-black text-gray-200 transition hover:bg-black/70 sm:p-4"
          >
            Back to Admin
          </button>
        </form>
      </div>
    </div>
  );
}
