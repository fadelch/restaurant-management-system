"use client";

import type { OptionalIngredient } from "@/lib/foodOptions";

type Props = {
  ingredients: string[];
  onIngredientsChange: (ingredients: string[]) => void;
  optionalIngredients: OptionalIngredient[];
  onOptionalIngredientsChange: (ingredients: OptionalIngredient[]) => void;
};

const inputClass =
  "w-full rounded-xl border border-red-900/60 bg-[#120000]/80 p-3 text-white outline-none transition placeholder:text-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-700/50";
const removeClass =
  "cursor-pointer rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/20";

export default function FoodIngredientsEditor({
  ingredients,
  onIngredientsChange,
  optionalIngredients,
  onOptionalIngredientsChange,
}: Props) {
  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
      <section>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">
              Included ingredients
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              These are included in the food price. Customers can remove or
              re-add them for free.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onIngredientsChange([...ingredients, ""])}
            className="cursor-pointer rounded-xl bg-green-700 px-4 py-2 text-sm font-black text-white hover:bg-green-800"
          >
            + Add ingredient
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {ingredients.length ? (
            ingredients.map((ingredient, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  aria-label={`Included ingredient ${index + 1}`}
                  value={ingredient}
                  maxLength={50}
                  onChange={(event) =>
                    onIngredientsChange(
                      ingredients.map((item, itemIndex) =>
                        itemIndex === index ? event.target.value : item,
                      ),
                    )
                  }
                  placeholder="Example: Lettuce"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() =>
                    onIngredientsChange(
                      ingredients.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  className={removeClass}
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-gray-500">
              No included ingredients added yet.
            </p>
          )}
        </div>
      </section>

      <section className="border-t border-white/10 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">
              Optional additions
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Each optional addition has its own price and increases the cart
              total.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onOptionalIngredientsChange([
                ...optionalIngredients,
                { name: "", price: 0 },
              ])
            }
            className="cursor-pointer rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800"
          >
            + Add optional ingredient
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {optionalIngredients.length ? (
            optionalIngredients.map((option, index) => (
              <div
                key={index}
                className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]"
              >
                <input
                  aria-label={`Optional ingredient ${index + 1}`}
                  value={option.name}
                  maxLength={50}
                  onChange={(event) =>
                    onOptionalIngredientsChange(
                      optionalIngredients.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, name: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="Example: Mushrooms"
                  className={inputClass}
                />
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold text-green-300">
                    $
                  </span>
                  <input
                    aria-label={`${option.name || `Optional ingredient ${index + 1}`} price`}
                    type="number"
                    min="0"
                    max="1000"
                    step="0.01"
                    value={option.price}
                    onChange={(event) =>
                      onOptionalIngredientsChange(
                        optionalIngredients.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, price: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                    className={`${inputClass} pl-7`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onOptionalIngredientsChange(
                      optionalIngredients.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    )
                  }
                  className={removeClass}
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-gray-500">
              No optional additions. Add them for pizza toppings, burger extras,
              wraps, or any other food.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
