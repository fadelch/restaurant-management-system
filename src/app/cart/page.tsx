"use client";

import { useRouter } from "next/navigation";
import Nav_bar from "@/components/nav_bar";
import { useCart } from "@/context/CartContext";
import { formatUsdWithLbp } from "@/lib/currency";
import { purchaseCart } from "@/server/purchaseCart";
import { useEffect, useState } from "react";
import { showMessage } from "@/components/MessageProvider";
import { getCheckoutSettings } from "@/server/checkoutSettings";
import { normalizeOptionalIngredients } from "@/lib/foodOptions";

type CheckoutSettings = Awaited<ReturnType<typeof getCheckoutSettings>>;

const paymentMethods = [
  "Pay on Delivery",
  "Whish Money",
  "PayPal",
  "Card",
] as const;

export default function CartPage() {
  const router = useRouter();

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

  const [purchasing, setPurchasing] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof paymentMethods)[number]>("Pay on Delivery");
  const [paymentCode, setPaymentCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [customerAddress, setCustomerAddress] = useState("");
  const [mapLocation, setMapLocation] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [deliveryZoneId, setDeliveryZoneId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [settings, setSettings] = useState<CheckoutSettings | null>(null);
  const [settingsError, setSettingsError] = useState("");

  const loadSettings = async () => {
    try {
      setSettingsError("");
      const next = await getCheckoutSettings();
      setSettings(next);
      if (!deliveryZoneId && next.zones[0]) setDeliveryZoneId(next.zones[0].id);
    } catch (err) {
      setSettingsError(
        err instanceof Error
          ? err.message
          : "Checkout settings could not be loaded.",
      );
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const totalPrice = formatUsdWithLbp(cartTotal);

  const inputClass =
    "w-full rounded-xl border border-red-900/60 bg-[#120000]/80 p-3.5 text-base text-white sm:p-4 placeholder:text-gray-500 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-700/50";

  const needsPaymentCode = paymentMethod !== "Pay on Delivery";

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showMessage("Your browser does not support location.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const googleMapLink = `https://www.google.com/maps?q=${lat},${lng}`;

        setMapLocation(googleMapLink);
        showMessage("Location added successfully.");
      },
      () => {
        showMessage(
          "Could not get your location. Please allow location access.",
        );
      },
    );
  };

  const handlePurchase = async () => {
    if (cartItems.length === 0) {
      showMessage("Your cart is empty.");
      return;
    }

    if (!sessionStorage.getItem("userEmail")) {
      showMessage("You must login before purchasing.");
      router.push("/login");
      return;
    }

    if (!customerName.trim()) {
      showMessage("Please enter the customer name.");
      return;
    }

    if (!customerPhone.trim()) {
      showMessage("Please enter a phone number.");
      return;
    }

    if (fulfillmentType === "delivery" && !customerAddress.trim()) {
      showMessage("Please enter your delivery address.");
      return;
    }

    if (fulfillmentType === "delivery" && !deliveryZoneId) {
      showMessage("Please select your delivery area.");
      return;
    }

    if (!settings?.restaurant.isOpen) {
      showMessage(
        settings?.restaurant.message || "The restaurant is currently closed.",
      );
      return;
    }

    if (needsPaymentCode && !paymentCode.trim()) {
      showMessage("Please enter the payment code/reference.");
      return;
    }

    try {
      setPurchasing(true);

      const order = await purchaseCart({
        items: cartItems.map((item) => ({
          id: item.id,
          cartQty: item.cartQty,
          extraCheese: item.customization.extraCheese,
          removedIngredients: item.customization.removedIngredients,
          customizationNote: item.customization.customizationNote,
          addedIngredientNames: item.customization.addedIngredients.map(
            (option) => option.name,
          ),
        })),
        customerName,
        customerPhone,
        fulfillmentType,
        paymentMethod,
        paymentCode,
        customerAddress,
        mapLocation,
        orderNotes,
        deliveryZoneId:
          fulfillmentType === "delivery" ? deliveryZoneId : undefined,
        couponCode: couponCode || undefined,
      });

      if (!order) {
        throw new Error("The order could not be created.");
      }

      showMessage("Order placed successfully!");
      clearCart();
      router.push(`/order-confirmation/${order.id}`);
      router.refresh();
    } catch (err) {
      console.log("Purchase error:", err);

      if (err instanceof Error) {
        showMessage(err.message);
      } else {
        showMessage("Failed to complete purchase.");
      }
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Nav_bar />

      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-12">
        <div className="mb-10 flex flex-col justify-between gap-4 rounded-3xl border border-red-900/50 bg-[#1a0000] p-5 shadow-2xl sm:p-8 md:flex-row md:items-center">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-red-400 sm:tracking-[0.3em]">
              Shopping Cart
            </p>

            <h1 className="mt-3 text-3xl font-black uppercase sm:text-4xl">
              Your Cart
            </h1>

            <p className="mt-2 text-gray-400">
              You have {cartCount} item
              {cartCount === 1 ? "" : "s"} in your cart.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full cursor-pointer rounded-xl border border-red-900/60 bg-[#120000] px-6 py-3 font-black text-red-100 transition hover:-translate-y-1 hover:border-red-500 hover:bg-[#240000] sm:w-auto"
          >
            Continue Shopping
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6 text-center shadow-xl sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-950/60 text-4xl">
              🛒
            </div>

            <h2 className="mt-5 text-2xl font-black">Your cart is empty</h2>

            <p className="mt-2 text-gray-400">
              Add food from the menu to see it here.
            </p>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-6 cursor-pointer rounded-xl bg-red-600 px-8 py-3 font-black text-white transition hover:bg-red-700"
            >
              Go to Menu
            </button>
          </div>
        ) : (
          <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-5">
              {cartItems.map((item) => {
                const itemPrice = formatUsdWithLbp(item.unitPrice);
                const optionalIngredients = normalizeOptionalIngredients(
                  item.optionalIngredients,
                );

                const itemTotal = formatUsdWithLbp(
                  item.unitPrice * item.cartQty,
                );

                return (
                  <div
                    key={item.cartKey}
                    className="flex min-w-0 flex-col gap-5 rounded-3xl border border-white/10 bg-[#111] p-4 shadow-xl sm:p-5 md:flex-row md:items-center"
                  >
                    <div className="h-32 w-full shrink-0 overflow-hidden rounded-2xl bg-neutral-800 md:w-40">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-4xl">
                          🍽️
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="break-words text-xl font-black sm:text-2xl">
                        {item.name}
                      </h2>

                      <p className="mt-1 break-words text-sm text-gray-400">
                        {item.type?.name || "Food item"}
                      </p>

                      {item.customization.extraCheese ||
                      item.customization.removedIngredients.length ||
                      item.customization.addedIngredients.length ||
                      item.customization.customizationNote ? (
                        <div className="mt-3 space-y-1 rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
                          {item.customization.extraCheese ? (
                            <p className="font-bold text-yellow-300">
                              + Extra cheese
                            </p>
                          ) : null}
                          {item.customization.removedIngredients.length ? (
                            <p className="text-red-300">
                              Without:{" "}
                              {item.customization.removedIngredients.join(", ")}
                            </p>
                          ) : null}
                          {item.customization.addedIngredients.length ? (
                            <p className="text-blue-300">
                              Added:{" "}
                              {item.customization.addedIngredients
                                .map((option) => option.name)
                                .join(", ")}
                            </p>
                          ) : null}
                          {item.customization.customizationNote ? (
                            <p className="text-gray-300">
                              Request: {item.customization.customizationNote}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-gray-500">
                          Standard preparation
                        </p>
                      )}

                      <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                        <summary className="cursor-pointer text-sm font-bold text-red-300">
                          Edit ingredients and extras
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
                                          ...item.customization
                                            .removedIngredients,
                                          ingredient,
                                        ],
                                  })
                                }
                                className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-bold ${removed ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-green-500/30 bg-green-500/10 text-green-300"}`}
                              >
                                {ingredient}: {removed ? "Removed" : "Included"}
                              </button>
                            );
                          })}
                        </div>
                        {optionalIngredients.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
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
                                            (value) =>
                                              value.name !== option.name,
                                          )
                                        : [
                                            ...item.customization
                                              .addedIngredients,
                                            option,
                                          ],
                                    })
                                  }
                                  className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-bold ${selected ? "border-blue-400 bg-blue-500/20 text-blue-200" : "border-white/15 text-gray-300"}`}
                                >
                                  {option.name}:{" "}
                                  {selected
                                    ? "Added"
                                    : `+ ${formatUsdWithLbp(option.price).usd}`}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            updateCartItemCustomization(item.cartKey, {
                              ...item.customization,
                              extraCheese: !item.customization.extraCheese,
                            })
                          }
                          className={`mt-3 cursor-pointer rounded-lg border px-3 py-2 text-xs font-black ${item.customization.extraCheese ? "border-yellow-400 bg-yellow-500/20 text-yellow-200" : "border-white/15 text-gray-300"}`}
                        >
                          Extra cheese:{" "}
                          {item.customization.extraCheese
                            ? "Added"
                            : `Add for ${formatUsdWithLbp(item.extraCheesePrice || 0).usd}`}
                        </button>
                        <label className="mt-3 block text-xs font-bold text-gray-400">
                          Special request
                        </label>
                        <input
                          defaultValue={item.customization.customizationNote}
                          maxLength={300}
                          onBlur={(event) =>
                            updateCartItemCustomization(item.cartKey, {
                              ...item.customization,
                              customizationNote: event.target.value,
                            })
                          }
                          placeholder="Sauce on the side..."
                          className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 p-2 text-sm text-white outline-none focus:border-red-500"
                        />
                      </details>

                      <div className="mt-3">
                        <p className="break-words font-bold text-green-300">
                          {itemPrice.usd}
                        </p>

                        <p className="break-words text-sm text-gray-400">
                          ≈ {itemPrice.lbp}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => decreaseCartItem(item.cartKey)}
                          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-red-900 font-black transition hover:bg-red-700"
                        >
                          -
                        </button>

                        <span className="min-w-10 text-center text-xl font-black">
                          {item.cartQty}
                        </span>

                        <button
                          type="button"
                          onClick={() => increaseCartItem(item.cartKey)}
                          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-red-600 font-black transition hover:bg-red-700"
                        >
                          +
                        </button>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.cartKey)}
                          className="ml-0 cursor-pointer rounded-xl border border-red-900/60 px-4 py-2 font-bold text-red-300 transition hover:bg-red-950 md:ml-4"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/30 p-4 text-left md:text-right">
                      <p className="text-sm text-gray-400">Item total</p>

                      <p className="mt-1 break-words text-xl font-black text-white">
                        {itemTotal.usd}
                      </p>

                      <p className="break-words text-sm text-gray-400">
                        ≈ {itemTotal.lbp}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="h-fit min-w-0 rounded-2xl border border-red-900/50 bg-[#1a0000] p-4 shadow-2xl sm:rounded-3xl sm:p-6 lg:sticky lg:top-28">
              <h2 className="break-words text-2xl font-black uppercase">
                Checkout
              </h2>

              <div className="mt-6 space-y-4 border-b border-white/10 pb-6">
                <div className="flex justify-between gap-4 text-gray-300">
                  <span>Total items</span>

                  <span className="font-bold text-white">{cartCount}</span>
                </div>

                <div className="flex justify-between gap-4 text-gray-300">
                  <span>Total USD</span>

                  <span className="break-words text-right font-bold text-green-300">
                    {totalPrice.usd}
                  </span>
                </div>

                <div className="flex justify-between gap-4 text-gray-300">
                  <span>Total LBP</span>

                  <span className="break-words text-right font-bold text-white">
                    {totalPrice.lbp}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {settingsError ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                    {settingsError}
                    <button
                      type="button"
                      onClick={loadSettings}
                      className="ml-3 cursor-pointer rounded-lg bg-red-600 px-3 py-1 font-bold"
                    >
                      Retry
                    </button>
                  </div>
                ) : settings ? (
                  <div
                    className={`rounded-xl border p-4 text-sm font-bold ${settings.restaurant.isOpen ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-red-500/30 bg-red-500/10 text-red-200"}`}
                  >
                    {settings.restaurant.message}
                  </div>
                ) : (
                  <div className="h-14 animate-pulse rounded-xl bg-white/5" />
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-300">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your full name"
                      autoComplete="name"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-300">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Example: +961 70 123 456"
                      autoComplete="tel"
                      className={inputClass}
                    />
                  </div>
                </div>

                <fieldset>
                  <legend className="mb-2 block text-sm font-bold text-gray-300">
                    Receive Your Order
                  </legend>
                  <div className="grid grid-cols-2 gap-3">
                    {(["delivery", "pickup"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFulfillmentType(option)}
                        className={`rounded-xl border p-3 font-black capitalize transition ${
                          fulfillmentType === option
                            ? "border-red-500 bg-red-600 text-white"
                            : "border-red-900/60 bg-[#120000] text-red-200 hover:bg-[#240000]"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    Estimated{" "}
                    {fulfillmentType === "delivery" ? "delivery" : "pickup"}{" "}
                    time: about {fulfillmentType === "delivery" ? "45" : "20"}{" "}
                    minutes.
                  </p>
                </fieldset>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-300">
                    Payment Method
                  </label>

                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(
                        e.target.value as (typeof paymentMethods)[number],
                      );
                      setPaymentCode("");
                    }}
                    className={inputClass}
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                {needsPaymentCode ? (
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-300">
                      Payment Code / Reference
                    </label>

                    <input
                      type="text"
                      value={paymentCode}
                      onChange={(e) => setPaymentCode(e.target.value)}
                      placeholder={
                        paymentMethod === "Whish Money"
                          ? "Whish transaction code"
                          : paymentMethod === "PayPal"
                            ? "PayPal transaction ID"
                            : "Card payment reference"
                      }
                      className={inputClass}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm font-bold text-yellow-200">
                    You will pay cash when you receive the order.
                  </div>
                )}

                {fulfillmentType === "delivery" ? (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-gray-300">
                        Delivery Area
                      </label>
                      <select
                        value={deliveryZoneId}
                        onChange={(e) => setDeliveryZoneId(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select an area</option>
                        {settings?.zones.map((zone) => (
                          <option key={zone.id} value={zone.id}>
                            {zone.name} — ${zone.deliveryFee.toFixed(2)} fee, $
                            {zone.minimumOrder.toFixed(2)} minimum, about{" "}
                            {zone.estimatedMinutes} min
                          </option>
                        ))}
                      </select>
                      {settings && settings.zones.length === 0 ? (
                        <p className="mt-2 text-sm text-yellow-300">
                          Delivery is not currently available in any area. You
                          can select pickup.
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-gray-300">
                        Delivery Address
                      </label>

                      <textarea
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Example: Beirut, Hamra, Street name, Building, Floor"
                        autoComplete="street-address"
                        className={`${inputClass} min-h-28 resize-none`}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-gray-300">
                        Map Location (Optional)
                      </label>

                      <input
                        type="text"
                        value={mapLocation}
                        onChange={(e) => setMapLocation(e.target.value)}
                        placeholder="Paste Google Maps link or use current location"
                        className={inputClass}
                      />

                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        className="mt-3 w-full rounded-xl border border-red-900/60 bg-[#120000] p-3 font-black text-red-200 transition hover:-translate-y-1 hover:border-red-500 hover:bg-[#240000]"
                      >
                        Use My Current Location
                      </button>

                      {mapLocation ? (
                        <a
                          href={mapLocation}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 block break-words rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-center text-sm font-bold text-green-300 transition hover:bg-green-500/20"
                        >
                          Open Location on Map
                        </a>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
                    We will prepare your order for pickup. No delivery address
                    is needed.
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-300">
                    Coupon Code (Optional)
                  </label>
                  <input
                    value={couponCode}
                    onChange={(e) =>
                      setCouponCode(e.target.value.toUpperCase())
                    }
                    maxLength={30}
                    placeholder="Example: SAVE10"
                    className={inputClass}
                  />
                  <p className="mt-2 text-xs text-gray-400">
                    Valid coupons are checked securely when the order is placed.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-300">
                    Order Notes (Optional)
                  </label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Special instructions, allergies, or requests"
                    className={`${inputClass} min-h-24 resize-none`}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handlePurchase}
                disabled={purchasing || !settings?.restaurant.isOpen}
                className="mt-6 w-full cursor-pointer rounded-xl bg-red-600 p-3.5 font-black text-white shadow-lg shadow-red-900/40 transition hover:-translate-y-1 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:p-4"
              >
                {purchasing
                  ? "Placing Order..."
                  : settings?.restaurant.isOpen
                    ? "Place Order"
                    : "Restaurant Closed"}
              </button>

              <button
                type="button"
                onClick={clearCart}
                disabled={purchasing}
                className="mt-4 w-full cursor-pointer rounded-xl border border-red-900/60 bg-[#120000] p-3.5 font-black text-red-200 transition hover:bg-[#240000] disabled:opacity-60 sm:p-4"
              >
                Clear Cart
              </button>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
