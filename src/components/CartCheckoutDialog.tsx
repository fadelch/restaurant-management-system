"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { showMessage } from "@/components/MessageProvider";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { getCheckoutSettings } from "@/server/checkoutSettings";
import { purchaseCart } from "@/server/purchaseCart";

type CheckoutSettings = Awaited<ReturnType<typeof getCheckoutSettings>>;

export default function CartCheckoutDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { formatUsdWithLbp } = useCurrency();
  const { cartItems, cartCount, cartTotal, clearCart } = useCart();
  const [purchasing, setPurchasing] = useState(false);
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
  const checkoutAttempt = useRef<{
    fingerprint: string;
    requestId: string;
  } | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const selectedZone = settings?.zones.find(
    (zone) => zone.id === deliveryZoneId,
  );
  const fulfillmentAvailable =
    fulfillmentType === "delivery"
      ? Boolean(settings?.ordering.deliveryAvailable)
      : Boolean(settings?.ordering.pickupAvailable);
  const totalPrice = formatUsdWithLbp(cartTotal);
  const inputClass =
    "mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 p-3.5 text-base text-white outline-none transition placeholder:text-gray-600 focus:border-red-500 focus:ring-2 focus:ring-red-700/40";

  const loadSettings = useCallback(async () => {
    try {
      setSettingsError("");
      const next = await getCheckoutSettings();
      setSettings(next);
      if (!deliveryZoneId && next.zones[0]) setDeliveryZoneId(next.zones[0].id);
      if (next.ordering.deliveryAvailable) setFulfillmentType("delivery");
      else if (next.ordering.pickupAvailable) setFulfillmentType("pickup");
    } catch (error) {
      setSettingsError(
        error instanceof Error
          ? error.message
          : "Checkout settings could not be loaded.",
      );
    }
  }, [deliveryZoneId]);

  useEffect(() => {
    if (open && !settings) loadSettings();
  }, [loadSettings, open, settings]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !purchasing) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      previouslyFocused?.focus();
    };
  }, [onClose, open, purchasing]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      showMessage("Your browser does not support location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMapLocation(
          `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`,
        );
        showMessage("Location added successfully.");
      },
      () => showMessage("Please allow location access and try again."),
    );
  };

  const placeOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cartItems.length) return showMessage("Your cart is empty.");
    if (!customerName.trim()) return showMessage("Enter the customer name.");
    if (!customerPhone.trim()) return showMessage("Enter a phone number.");
    if (!settings?.ordering.cashPaymentEnabled) {
      return showMessage("Cash ordering is not available yet.");
    }
    if (!fulfillmentAvailable) {
      return showMessage("The selected order method is not available.");
    }
    if (fulfillmentType === "delivery" && !deliveryZoneId) {
      return showMessage("Select your delivery area.");
    }
    if (fulfillmentType === "delivery" && !customerAddress.trim()) {
      return showMessage("Enter your delivery address.");
    }
    if (!settings?.restaurant.isOpen) {
      return showMessage(
        settings?.restaurant.message || "The restaurant is currently closed.",
      );
    }

    try {
      setPurchasing(true);
      const checkoutPayload = {
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
        customerAddress,
        mapLocation,
        orderNotes,
        deliveryZoneId:
          fulfillmentType === "delivery" ? deliveryZoneId : undefined,
        couponCode: couponCode || undefined,
      };
      const fingerprint = JSON.stringify(checkoutPayload);
      if (checkoutAttempt.current?.fingerprint !== fingerprint) {
        checkoutAttempt.current = {
          fingerprint,
          requestId: crypto.randomUUID(),
        };
      }
      const order = await purchaseCart({
        ...checkoutPayload,
        checkoutRequestId: checkoutAttempt.current.requestId,
      });
      showMessage("Order placed successfully!");
      checkoutAttempt.current = null;
      clearCart();
      router.push(`/order-confirmation/${order.id}`);
      router.refresh();
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Failed to complete purchase.",
      );
    } finally {
      setPurchasing(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !purchasing) onClose();
      }}
    >
      <form
        onSubmit={placeOrder}
        className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-red-900/50 bg-[#100101] shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 bg-[#1d0303] p-4 sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
              Final step
            </p>
            <h2 id="checkout-title" className="mt-1 text-2xl font-black sm:text-3xl">
              Order & contact
            </h2>
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            disabled={purchasing}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 text-2xl text-gray-300 hover:bg-white/10"
            aria-label="Close checkout"
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto p-4 sm:p-6">
          <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/35 p-4 text-center">
            <div>
              <p className="text-xs text-gray-500">Items</p>
              <p className="mt-1 font-black">{cartCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Subtotal USD</p>
              <p className="mt-1 font-black text-green-300">{totalPrice.usd}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Subtotal LBP</p>
              <p className="mt-1 break-words font-black">{totalPrice.lbp}</p>
            </div>
          </div>

          {settingsError ? (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {settingsError}
              <button type="button" onClick={loadSettings} className="ms-3 font-black underline">
                Retry
              </button>
            </div>
          ) : settings ? (
            <div
              className={`mb-5 rounded-xl border p-3 text-sm font-bold ${settings.restaurant.isOpen ? "border-green-500/25 bg-green-500/10 text-green-300" : "border-red-500/25 bg-red-500/10 text-red-200"}`}
            >
              {settings.restaurant.message}
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
              <h3 className="font-black text-red-200">Contact</h3>
              <label className="block text-sm font-bold text-gray-300">
                Customer name
                <input
                  required
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-bold text-gray-300">
                Phone number
                <input
                  required
                  type="tel"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="Example: +961 70 123 456"
                  autoComplete="tel"
                  className={inputClass}
                />
              </label>

              <fieldset>
                <legend className="mb-2 text-sm font-bold text-gray-300">
                  Receive your order
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {(["delivery", "pickup"] as const)
                    .filter((option) =>
                      option === "delivery"
                        ? settings?.ordering.deliveryAvailable
                        : settings?.ordering.pickupAvailable,
                    )
                    .map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFulfillmentType(option)}
                      className={`rounded-xl border p-3 font-black capitalize ${fulfillmentType === option ? "border-red-500 bg-red-600" : "border-white/15 bg-black/40 text-gray-300"}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {settings &&
                !settings.ordering.deliveryAvailable &&
                !settings.ordering.pickupAvailable ? (
                  <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-bold text-amber-200">
                    Ordering is unavailable until the restaurant completes its delivery or pickup configuration.
                  </p>
                ) : null}
              </fieldset>
            </section>

            <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
              <h3 className="font-black text-red-200">
                {fulfillmentType === "delivery" ? "Delivery" : "Pickup"}
              </h3>
              {fulfillmentType === "delivery" ? (
                <>
                  <label className="block text-sm font-bold text-gray-300">
                    Delivery area
                    <select
                      required
                      value={deliveryZoneId}
                      onChange={(event) => setDeliveryZoneId(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select an area</option>
                      {settings?.zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} — ${zone.deliveryFee.toFixed(2)} fee
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedZone ? (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-gray-300">
                      {selectedZone.description ? (
                        <p className="mb-2 leading-5">
                          {selectedZone.description}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-gray-400">
                        <span>
                          Delivery: {selectedZone.estimatedMinutes} minutes
                        </span>
                        <span>
                          Minimum: ${selectedZone.minimumOrder.toFixed(2)}
                        </span>
                        <span>
                          Fee: ${selectedZone.deliveryFee.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : null}
                  <label className="block text-sm font-bold text-gray-300">
                    Delivery address
                    <textarea
                      required
                      value={customerAddress}
                      onChange={(event) => setCustomerAddress(event.target.value)}
                      placeholder="Area, street, building, and floor"
                      autoComplete="street-address"
                      className={`${inputClass} min-h-28 resize-none`}
                    />
                  </label>
                </>
              ) : (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm leading-6 text-blue-200">
                  <p>Your order will be prepared for restaurant pickup. No address is required.</p>
                  {settings?.ordering.pickupInstructions ? (
                    <p className="mt-2 font-bold">{settings.ordering.pickupInstructions}</p>
                  ) : null}
                  {settings?.ordering.pickupMinimumOrderUsd !== null &&
                  settings?.ordering.pickupMinimumOrderUsd !== undefined ? (
                    <p className="mt-2 text-xs">
                      Minimum pickup order: ${Number(settings.ordering.pickupMinimumOrderUsd).toFixed(2)}
                    </p>
                  ) : null}
                </div>
              )}

              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                <p className="font-black text-yellow-200">
                  {fulfillmentType === "delivery" ? "Cash on delivery" : "Cash on pickup"}
                </p>
                <p className="mt-1 text-xs leading-5 text-yellow-100/70">
                  Payment starts as Pending and becomes Done after the order is
                  handed over and cash is collected. Online card payment is not available.
                </p>
              </div>
            </section>
          </div>

          <details className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
            <summary className="cursor-pointer font-black text-gray-200">
              Optional details: map, coupon, and notes
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {fulfillmentType === "delivery" ? (
                <div>
                  <label className="block text-sm font-bold text-gray-300">
                    Map location
                    <input
                      value={mapLocation}
                      onChange={(event) => setMapLocation(event.target.value)}
                      placeholder="Google Maps link"
                      className={inputClass}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    className="mt-2 w-full rounded-lg border border-white/15 px-3 py-2 text-sm font-black text-gray-200 hover:bg-white/5"
                  >
                    Use current location
                  </button>
                </div>
              ) : null}
              <label className="block text-sm font-bold text-gray-300">
                Coupon code
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                  maxLength={30}
                  placeholder="Example: SAVE10"
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-bold text-gray-300 md:col-span-2">
                Order notes
                <textarea
                  value={orderNotes}
                  onChange={(event) => setOrderNotes(event.target.value)}
                  placeholder="Allergies or delivery instructions"
                  className={`${inputClass} min-h-20 resize-none`}
                />
              </label>
            </div>
          </details>
          <p className="mt-4 text-xs leading-5 text-gray-400">
            Before ordering, review our <Link href="/policies/refunds" className="font-bold text-red-300 hover:underline">refund and cancellation policy</Link> and <Link href="/policies/allergy" className="font-bold text-red-300 hover:underline">allergy notice</Link>.
          </p>
        </div>

        <footer className="grid gap-3 border-t border-white/10 bg-[#1d0303] p-4 sm:grid-cols-[1fr_auto] sm:p-5">
          <button
            type="submit"
            disabled={
              purchasing ||
              !settings?.restaurant.isOpen ||
              !settings.ordering.cashPaymentEnabled ||
              !fulfillmentAvailable
            }
            className="rounded-xl bg-red-600 px-6 py-3.5 font-black text-white hover:bg-red-700 disabled:opacity-50"
          >
            {purchasing
              ? "Placing order..."
              : settings?.restaurant.isOpen
                ? fulfillmentType === "delivery"
                  ? "Place cash-on-delivery order"
                  : "Place cash-on-pickup order"
                : "Restaurant closed"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={purchasing}
            className="rounded-xl border border-white/15 px-6 py-3.5 font-black text-gray-300 hover:bg-white/5 disabled:opacity-50"
          >
            Back to cart
          </button>
        </footer>
      </form>
    </div>
  );
}
