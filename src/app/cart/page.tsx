"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Nav_bar from "@/components/nav_bar";
import CartCheckoutDialog from "@/components/CartCheckoutDialog";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { normalizeOptionalIngredients } from "@/lib/foodOptions";
import { multiplyUsd } from "@/lib/currency";

export default function CartPage() {
  const { formatUsdWithLbp } = useCurrency();
  const router = useRouter();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const {
    cartItems,
    cartCount,
    cartTotal,
    increaseCartItem,
    updateCartItemCustomization,
    decreaseCartItem,
    removeFromCart,
    clearCart,
  } = useCart();
  const total = formatUsdWithLbp(cartTotal);

  return (
    <div className="min-h-dvh bg-[#080808] text-white">
      <Nav_bar />

      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-9">
        <header className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-red-900/40 bg-gradient-to-br from-[#210303] to-[#100000] p-5 shadow-xl sm:flex-row sm:items-center sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
              Shopping cart
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Your order</h1>
            <p className="mt-1 text-sm text-gray-400">
              {cartCount} {cartCount === 1 ? "item" : "items"} ready to review
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/#menu")}
            className="min-h-11 rounded-xl border border-white/15 bg-black/25 px-5 py-2.5 font-black text-gray-200 transition hover:border-red-500 hover:bg-white/5"
          >
            + Add more food
          </button>
        </header>

        {cartItems.length === 0 ? (
          <section className="rounded-2xl border border-white/10 bg-neutral-900 p-8 text-center shadow-xl sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-950/60 text-3xl">
              🛒
            </div>
            <h2 className="mt-4 text-2xl font-black">Your cart is empty</h2>
            <p className="mt-2 text-gray-400">Choose a meal from the menu.</p>
            <button
              type="button"
              onClick={() => router.push("/#menu")}
              className="mt-5 rounded-xl bg-red-600 px-7 py-3 font-black hover:bg-red-700"
            >
              Browse menu
            </button>
          </section>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-w-0 space-y-3" aria-label="Cart items">
              {cartItems.map((item) => {
                const optionalIngredients = normalizeOptionalIngredients(
                  item.optionalIngredients,
                );
                const lineTotal = formatUsdWithLbp(
                  multiplyUsd(item.unitPrice, item.cartQty),
                );
                const hasCustomization =
                  item.customization.extraCheese ||
                  item.customization.removedIngredients.length > 0 ||
                  item.customization.addedIngredients.length > 0 ||
                  Boolean(item.customization.customizationNote);

                return (
                  <article
                    key={item.cartKey}
                    className="rounded-2xl border border-white/10 bg-[#111] p-3 shadow-lg sm:p-4"
                  >
                    <div className="grid min-w-0 grid-cols-[84px_minmax(0,1fr)] gap-3 sm:grid-cols-[112px_minmax(0,1fr)_120px] sm:gap-4">
                      <div className="relative h-24 overflow-hidden rounded-xl bg-neutral-800 sm:h-28">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="(min-width: 640px) 112px, 84px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-3xl">
                            🍽️
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h2 className="break-words text-lg font-black sm:text-xl">
                              {item.name}
                            </h2>
                            <p className="text-xs text-gray-500">
                              {item.type?.name || "Menu item"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.cartKey)}
                            className="text-xs font-black text-red-300 hover:text-red-200"
                          >
                            Remove
                          </button>
                        </div>

                        {hasCustomization ? (
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                            {item.customization.extraCheese ? (
                              <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-yellow-300">
                                Extra cheese
                              </span>
                            ) : null}
                            {item.customization.removedIngredients.length ? (
                              <span className="rounded-full bg-red-500/10 px-2 py-1 text-red-300">
                                Without {item.customization.removedIngredients.join(", ")}
                              </span>
                            ) : null}
                            {item.customization.addedIngredients.length ? (
                              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-blue-300">
                                + {item.customization.addedIngredients.map((option) => option.name).join(", ")}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => decreaseCartItem(item.cartKey)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-950 font-black hover:bg-red-900"
                            aria-label={`Decrease ${item.name}`}
                          >
                            −
                          </button>
                          <span className="min-w-8 text-center font-black">
                            {item.cartQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => increaseCartItem(item.cartKey)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 font-black hover:bg-red-700"
                            aria-label={`Increase ${item.name}`}
                          >
                            +
                          </button>
                          <span className="ms-1 text-sm font-black text-green-300 sm:hidden">
                            {lineTotal.usd}
                          </span>
                        </div>
                      </div>

                      <div className="hidden rounded-xl border border-white/10 bg-black/30 p-3 text-end sm:block">
                        <p className="text-xs text-gray-500">Item total</p>
                        <p className="mt-1 text-lg font-black text-green-300">
                          {lineTotal.usd}
                        </p>
                        <p className="text-xs text-gray-500">≈ {lineTotal.lbp}</p>
                      </div>
                    </div>

                    <details className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                      <summary className="cursor-pointer text-xs font-black text-red-300">
                        Customize ingredients
                      </summary>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.ingredients?.map((ingredient) => {
                          const removed =
                            item.customization.removedIngredients.includes(
                              ingredient,
                            );
                          return (
                            <button
                              key={ingredient}
                              type="button"
                              onClick={() =>
                                updateCartItemCustomization(item.cartKey, {
                                  ...item.customization,
                                  removedIngredients: removed
                                    ? item.customization.removedIngredients.filter(
                                        (value) => value !== ingredient,
                                      )
                                    : [
                                        ...item.customization.removedIngredients,
                                        ingredient,
                                      ],
                                })
                              }
                              className={`rounded-lg border px-2.5 py-2 text-xs font-bold ${removed ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-green-500/30 bg-green-500/10 text-green-300"}`}
                            >
                              {ingredient}: {removed ? "Removed" : "Included"}
                            </button>
                          );
                        })}
                        {optionalIngredients.map((option) => {
                          const selected =
                            item.customization.addedIngredients.some(
                              (value) => value.name === option.name,
                            );
                          return (
                            <button
                              key={option.name}
                              type="button"
                              onClick={() =>
                                updateCartItemCustomization(item.cartKey, {
                                  ...item.customization,
                                  addedIngredients: selected
                                    ? item.customization.addedIngredients.filter(
                                        (value) => value.name !== option.name,
                                      )
                                    : [
                                        ...item.customization.addedIngredients,
                                        option,
                                      ],
                                })
                              }
                              className={`rounded-lg border px-2.5 py-2 text-xs font-bold ${selected ? "border-blue-400 bg-blue-500/15 text-blue-200" : "border-white/15 text-gray-300"}`}
                            >
                              {option.name}{" "}
                              {selected
                                ? "✓"
                                : `+${formatUsdWithLbp(option.price).usd}`}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() =>
                            updateCartItemCustomization(item.cartKey, {
                              ...item.customization,
                              extraCheese: !item.customization.extraCheese,
                            })
                          }
                          className={`rounded-lg border px-2.5 py-2 text-xs font-bold ${item.customization.extraCheese ? "border-yellow-400 bg-yellow-500/15 text-yellow-200" : "border-white/15 text-gray-300"}`}
                        >
                          Extra cheese{" "}
                          {item.customization.extraCheese
                            ? "✓"
                            : `+${formatUsdWithLbp(item.extraCheesePrice || 0).usd}`}
                        </button>
                      </div>
                      <input
                        defaultValue={item.customization.customizationNote}
                        maxLength={300}
                        onBlur={(event) =>
                          updateCartItemCustomization(item.cartKey, {
                            ...item.customization,
                            customizationNote: event.target.value,
                          })
                        }
                        placeholder="Special request (optional)"
                        className="mt-3 w-full rounded-lg border border-white/10 bg-black/50 p-2.5 text-sm text-white outline-none focus:border-red-500"
                      />
                    </details>
                  </article>
                );
              })}
            </section>

            <aside className="h-fit rounded-2xl border border-red-900/40 bg-[#180202] p-5 shadow-xl lg:sticky lg:top-24">
              <h2 className="text-xl font-black">Order summary</h2>
              <div className="mt-5 space-y-3 border-b border-white/10 pb-5 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Total items</span>
                  <strong className="text-white">{cartCount}</strong>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <strong className="text-green-300">{total.usd}</strong>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>LBP</span>
                  <strong className="text-white">{total.lbp}</strong>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3">
                <p className="text-sm font-black text-yellow-200">
                  💵 Cash on delivery
                </p>
                <p className="mt-1 text-xs leading-5 text-yellow-100/70">
                  No online payment or payment code required.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCheckoutOpen(true)}
                className="mt-5 w-full rounded-xl bg-red-600 px-5 py-3.5 font-black text-white shadow-lg shadow-red-950/40 hover:bg-red-700"
              >
                Continue to checkout
              </button>
              <button
                type="button"
                onClick={clearCart}
                className="mt-2 w-full rounded-xl px-5 py-3 text-sm font-black text-red-300 hover:bg-red-500/10"
              >
                Clear cart
              </button>
            </aside>
          </div>
        )}
      </main>

      <CartCheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
      />
    </div>
  );
}
