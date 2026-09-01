"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { FoodItem } from "@/types";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { showMessage } from "@/components/MessageProvider";
import { addUsdAmounts } from "@/lib/currency";
import {
  normalizeOptionalIngredients,
  type OptionalIngredient,
} from "@/lib/foodOptions";

export default function FoodCustomizer({ food }: { food: FoodItem }) {
  const { formatUsdWithLbp } = useCurrency();
  const router = useRouter();
  const { addToCart, cartItems } = useCart();
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [addedIngredients, setAddedIngredients] = useState<
    OptionalIngredient[]
  >([]);
  const [extraCheese, setExtraCheese] = useState(false);
  const [customizationNote, setCustomizationNote] = useState("");
  const ingredients = food.ingredients || [];
  const optionalIngredients = normalizeOptionalIngredients(
    food.optionalIngredients,
  );
  const extraCheesePrice = food.extraCheesePrice || 0;
  const unitPrice = addUsdAmounts([
    food.price,
    extraCheese ? extraCheesePrice : 0,
    ...addedIngredients.map((option) => option.price),
  ]);
  const displayedPrice = formatUsdWithLbp(unitPrice);
  const inStock = food.qty > 0;

  const toggleIngredient = (ingredient: string) => {
    setRemovedIngredients((current) =>
      current.includes(ingredient)
        ? current.filter((item) => item !== ingredient)
        : [...current, ingredient],
    );
  };

  const toggleOptionalIngredient = (option: OptionalIngredient) => {
    setAddedIngredients((current) =>
      current.some((item) => item.name === option.name)
        ? current.filter((item) => item.name !== option.name)
        : [...current, option],
    );
  };

  const addCustomizedItem = async () => {
    const quantityInCart = cartItems
      .filter((item) => item.id === food.id)
      .reduce((total, item) => total + item.cartQty, 0);
    if (quantityInCart >= food.qty) {
      showMessage(`Only ${food.qty} item(s) available in stock.`);
      return;
    }
    const added = await addToCart(food, {
      extraCheese,
      removedIngredients,
      addedIngredients,
      customizationNote,
    });
    if (added) {
      showMessage(`${food.name} customization added to your cart.`);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <button
        type="button"
        onClick={() => router.push("/#menu")}
        className="mb-6 cursor-pointer rounded-xl border border-white/15 bg-black/40 px-5 py-3 font-bold text-gray-200 transition hover:border-red-500 hover:text-white"
      >
        ← Back to Menu
      </button>

      <section className="grid overflow-hidden rounded-3xl border border-red-900/50 bg-[#130000] shadow-2xl lg:grid-cols-2">
        <div className="relative min-h-80 bg-neutral-900 lg:min-h-[650px]">
          {food.image ? (
            <Image
              src={food.image}
              alt={food.name}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full min-h-80 items-center justify-center text-7xl">
              🍽️
            </div>
          )}
        </div>

        <div className="p-5 sm:p-8 lg:p-10">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-red-400">
            {food.type?.name || "Menu item"}
          </p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">{food.name}</h1>
          <p className="mt-5 leading-7 text-gray-300">
            {food.description ||
              "Freshly prepared to order using our restaurant ingredients."}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
            <div>
              <p className="text-sm text-gray-400">Your price</p>
              <p className="text-2xl font-black text-green-300">
                {displayedPrice.usd}
              </p>
              <p className="text-sm text-gray-400">≈ {displayedPrice.lbp}</p>
            </div>
            <span
              className={`rounded-full px-4 py-2 text-sm font-black ${inStock ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}`}
            >
              {inStock ? `${food.qty} available` : "Out of stock"}
            </span>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-black">Choose your ingredients</h2>
            <p className="mt-1 text-sm text-gray-400">
              Uncheck anything you want removed.
            </p>
            {ingredients.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {ingredients.map((ingredient) => {
                  const included = !removedIngredients.includes(ingredient);
                  return (
                    <button
                      key={ingredient}
                      type="button"
                      onClick={() => toggleIngredient(ingredient)}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${included ? "border-green-500/30 bg-green-500/10 text-green-100" : "border-red-500/30 bg-red-500/10 text-red-200"}`}
                    >
                      <span className="font-bold">{ingredient}</span>
                      <span className="text-xs font-black uppercase">
                        {included ? "Included ✓" : "Removed"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-gray-400">
                No editable ingredient list has been added for this item yet.
              </p>
            )}
          </div>

          {optionalIngredients.length ? (
            <div className="mt-8">
              <h2 className="text-xl font-black">Optional ingredients</h2>
              <p className="mt-1 text-sm text-gray-400">
                Add pizza toppings or other extras.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {optionalIngredients.map((option) => {
                  const selected = addedIngredients.some(
                    (item) => item.name === option.name,
                  );
                  return (
                    <button
                      key={option.name}
                      type="button"
                      onClick={() => toggleOptionalIngredient(option)}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-blue-400 bg-blue-500/15 text-blue-100" : "border-white/10 bg-black/30 text-gray-200 hover:border-blue-500/50"}`}
                    >
                      <span className="font-bold">{option.name}</span>
                      <span className="text-xs font-black">
                        {selected
                          ? "Added ✓"
                          : `+ ${formatUsdWithLbp(option.price).usd}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setExtraCheese((current) => !current)}
            className={`mt-6 flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${extraCheese ? "border-yellow-400 bg-yellow-500/15" : "border-white/10 bg-black/30 hover:border-yellow-500/50"}`}
          >
            <div>
              <p className="font-black">Add extra cheese</p>
              <p className="mt-1 text-sm text-gray-400">
                Adds {formatUsdWithLbp(extraCheesePrice).usd} to each item
              </p>
            </div>
            <span
              className={`flex h-7 w-12 items-center rounded-full p-1 transition ${extraCheese ? "bg-yellow-500" : "bg-neutral-700"}`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-white transition ${extraCheese ? "translate-x-5" : ""}`}
              />
            </span>
          </button>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-bold text-gray-300">
              Special request (optional)
            </label>
            <textarea
              value={customizationNote}
              onChange={(event) => setCustomizationNote(event.target.value)}
              maxLength={300}
              placeholder="Example: sauce on the side or cut in half"
              className="min-h-24 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-4 text-white outline-none focus:border-red-500"
            />
            <p className="mt-1 text-right text-xs text-gray-500">
              {customizationNote.length}/300
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={!inStock}
              onClick={addCustomizedItem}
              className="cursor-pointer rounded-xl bg-red-600 px-5 py-4 font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {inStock ? `Add to Cart · ${displayedPrice.usd}` : "Unavailable"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/cart")}
              className="cursor-pointer rounded-xl border border-white/15 bg-black/40 px-5 py-4 font-black transition hover:bg-white/10"
            >
              View Cart
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
