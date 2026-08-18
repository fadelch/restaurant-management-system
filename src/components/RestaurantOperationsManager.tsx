"use client";

import { useCallback, useEffect, useState } from "react";
import { showMessage } from "@/components/MessageProvider";
import {
  getAdminOperations,
  saveCoupon,
  saveDeliveryZone,
  saveRestaurantHours,
} from "@/server/adminOperations";

type Data = Awaited<ReturnType<typeof getAdminOperations>>;
type HoursDraft = Array<{
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}>;
const input =
  "w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:border-red-500";
const button =
  "cursor-pointer rounded-xl bg-red-600 px-5 py-3 font-black transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50";
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function RestaurantOperationsManager() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [hoursDraft, setHoursDraft] = useState<HoursDraft>([]);
  const [zone, setZone] = useState({
    name: "",
    description: "",
    deliveryFee: 0,
    minimumOrder: 0,
    estimatedMinutes: 45,
    isAvailable: true,
  });
  const [coupon, setCoupon] = useState({
    code: "",
    description: "",
    discountType: "percentage" as "percentage" | "fixed",
    value: 10,
    minimumOrder: 0,
    expiresAt: "",
    usageLimit: "",
    userId: "",
    categoryId: "",
    isActive: true,
  });
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await getAdminOperations();
      setData(next);
      setHoursDraft(
        next.hours.map(({ dayOfWeek, openTime, closeTime, isClosed }) => ({
          dayOfWeek,
          openTime,
          closeTime,
          isClosed,
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Settings could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const run = async (work: () => Promise<unknown>, success: string) => {
    setSaving(true);
    try {
      await work();
      showMessage(success);
      await load();
    } catch (err) {
      showMessage(
        err instanceof Error ? err.message : "The change could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (loading)
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-36 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
    );
  if (error)
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
        {error}
        <button type="button" onClick={load} className={`${button} ml-4`}>
          Retry
        </button>
      </div>
    );
  if (!data) return null;
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-[#160000] p-5">
        <h2 className="text-2xl font-black">Delivery zones</h2>
        <p className="mt-1 text-sm text-gray-400">
          Set delivery fees, minimum orders, estimates, and unavailable areas.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveDeliveryZone(zone), "Delivery zone saved.");
          }}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <label className="text-sm font-bold text-gray-300">
            Zone name
            <input
              required
              maxLength={80}
              value={zone.name}
              onChange={(e) => setZone({ ...zone, name: e.target.value })}
              placeholder="Example: Beirut Central"
              className={`${input} mt-2`}
            />
          </label>
          <label className="text-sm font-bold text-gray-300 md:col-span-1 xl:col-span-3">
            Area details
            <input
              maxLength={300}
              value={zone.description}
              onChange={(e) =>
                setZone({ ...zone, description: e.target.value })
              }
              placeholder="Neighborhoods, streets, or landmarks covered by this zone"
              className={`${input} mt-2`}
            />
          </label>
          <label className="text-sm font-bold text-gray-300">
            Delivery fee (USD)
            <input
              type="number"
              min="0"
              step="0.01"
              value={zone.deliveryFee}
              onChange={(e) =>
                setZone({ ...zone, deliveryFee: Number(e.target.value) })
              }
              className={`${input} mt-2`}
            />
          </label>
          <label className="text-sm font-bold text-gray-300">
            Minimum order (USD)
            <input
              type="number"
              min="0"
              step="0.01"
              value={zone.minimumOrder}
              onChange={(e) =>
                setZone({ ...zone, minimumOrder: Number(e.target.value) })
              }
              className={`${input} mt-2`}
            />
          </label>
          <label className="text-sm font-bold text-gray-300">
            Estimated delivery (minutes)
            <input
              type="number"
              min="5"
              value={zone.estimatedMinutes}
              onChange={(e) =>
                setZone({ ...zone, estimatedMinutes: Number(e.target.value) })
              }
              className={`${input} mt-2`}
            />
          </label>
          <div className="flex items-end gap-3">
            <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 text-sm font-bold">
              <input
                type="checkbox"
                checked={zone.isAvailable}
                onChange={(e) =>
                  setZone({ ...zone, isAvailable: e.target.checked })
                }
              />
              Available now
            </label>
            <button disabled={saving} className={button}>
              Add zone
            </button>
          </div>
        </form>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {data.zones.length ? (
            data.zones.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-4"
              >
                <div>
                  <p className="font-black">{item.name}</p>
                  {item.description ? (
                    <p className="mt-1 text-sm text-gray-300">
                      {item.description}
                    </p>
                  ) : null}
                  <p className="text-sm text-gray-400">
                    ${item.deliveryFee.toFixed(2)} fee · $
                    {item.minimumOrder.toFixed(2)} minimum ·{" "}
                    {item.estimatedMinutes} min
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    run(
                      () =>
                        saveDeliveryZone({
                          ...item,
                          isAvailable: !item.isAvailable,
                        }),
                      item.isAvailable ? "Zone disabled." : "Zone enabled.",
                    )
                  }
                  className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-bold ${item.isAvailable ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}
                >
                  {item.isAvailable ? "Available" : "Unavailable"}
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No delivery zones yet.</p>
          )}
        </div>
      </section>
      <section className="rounded-2xl border border-white/10 bg-[#160000] p-5">
        <h2 className="text-2xl font-black">Restaurant opening hours</h2>
        <p className="mt-1 text-sm text-gray-400">
          If closing time is earlier than opening time, the restaurant closes
          on the next day. For example, 9:00 AM to 5:00 AM is an overnight
          schedule. Each row is the day that shift starts, so after midnight
          the previous day&apos;s closing time applies.
        </p>
        <div className="mt-5 grid gap-3">
          {hoursDraft.map((hours) => {
            const overnight =
              !hours.isClosed && hours.closeTime <= hours.openTime;
            return (
              <div
                key={hours.dayOfWeek}
                className="grid items-center gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-[140px_1fr_1fr_auto]"
              >
                <span className="font-bold">{days[hours.dayOfWeek]}</span>
                <label className="text-xs font-bold text-gray-400">
                  Opens
                  <input
                    aria-label={`${days[hours.dayOfWeek]} opening time`}
                    type="time"
                    value={hours.openTime}
                    disabled={hours.isClosed}
                    onChange={(event) =>
                      setHoursDraft((current) =>
                        current.map((item) =>
                          item.dayOfWeek === hours.dayOfWeek
                            ? { ...item, openTime: event.target.value }
                            : item,
                        ),
                      )
                    }
                    className={`${input} mt-1 disabled:opacity-40`}
                  />
                </label>
                <label className="text-xs font-bold text-gray-400">
                  Closes
                  <input
                    aria-label={`${days[hours.dayOfWeek]} closing time`}
                    type="time"
                    value={hours.closeTime}
                    disabled={hours.isClosed}
                    onChange={(event) =>
                      setHoursDraft((current) =>
                        current.map((item) =>
                          item.dayOfWeek === hours.dayOfWeek
                            ? { ...item, closeTime: event.target.value }
                            : item,
                        ),
                      )
                    }
                    className={`${input} mt-1 disabled:opacity-40`}
                  />
                </label>
                <div className="space-y-2">
                  <label className="flex cursor-pointer gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={hours.isClosed}
                      onChange={(event) =>
                        setHoursDraft((current) =>
                          current.map((item) =>
                            item.dayOfWeek === hours.dayOfWeek
                              ? { ...item, isClosed: event.target.checked }
                              : item,
                          ),
                        )
                      }
                    />
                    Closed all day
                  </label>
                  {overnight ? (
                    <p className="text-xs font-bold text-amber-300">
                      {hours.openTime === hours.closeTime
                        ? "Open 24 hours"
                        : "Closes next day"}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={saving || hoursDraft.length !== 7}
            onClick={() =>
              run(
                () => saveRestaurantHours(hoursDraft),
                "All opening hours saved.",
              )
            }
            className={button}
          >
            {saving ? "Saving..." : "Save all opening hours"}
          </button>
        </div>
      </section>
      <section className="rounded-2xl border border-white/10 bg-[#160000] p-5">
        <h2 className="text-2xl font-black">Discounts and coupons</h2>
        <p className="mt-1 text-sm text-gray-400">
          Define who can use a discount, what food it applies to, the minimum
          order, expiry, and maximum number of uses.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () =>
                saveCoupon({
                  ...coupon,
                  usageLimit: coupon.usageLimit
                    ? Number(coupon.usageLimit)
                    : null,
                  expiresAt: coupon.expiresAt || null,
                  userId: coupon.userId || null,
                  categoryId: coupon.categoryId || null,
                }),
              "Coupon created.",
            );
          }}
          className="mt-5 grid gap-3 md:grid-cols-3"
        >
          <input
            required
            maxLength={30}
            value={coupon.code}
            onChange={(e) =>
              setCoupon({ ...coupon, code: e.target.value.toUpperCase() })
            }
            placeholder="Coupon code"
            className={input}
          />
          <input
            maxLength={300}
            value={coupon.description}
            onChange={(e) =>
              setCoupon({ ...coupon, description: e.target.value })
            }
            placeholder="Discount details, for example: Weekend offer on all burgers"
            aria-label="Discount details"
            className={`${input} md:col-span-2`}
          />
          <select
            value={coupon.discountType}
            onChange={(e) =>
              setCoupon({
                ...coupon,
                discountType: e.target.value as "percentage" | "fixed",
              })
            }
            className={input}
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed value</option>
          </select>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={coupon.value}
            onChange={(e) =>
              setCoupon({ ...coupon, value: Number(e.target.value) })
            }
            placeholder="Discount value"
            className={input}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={coupon.minimumOrder}
            onChange={(e) =>
              setCoupon({ ...coupon, minimumOrder: Number(e.target.value) })
            }
            placeholder="Minimum order"
            className={input}
          />
          <input
            aria-label="Coupon expiry"
            type="datetime-local"
            value={coupon.expiresAt}
            onChange={(e) =>
              setCoupon({ ...coupon, expiresAt: e.target.value })
            }
            className={input}
          />
          <input
            type="number"
            min="1"
            value={coupon.usageLimit}
            onChange={(e) =>
              setCoupon({ ...coupon, usageLimit: e.target.value })
            }
            placeholder="Usage limit (optional)"
            className={input}
          />
          <select
            value={coupon.userId}
            onChange={(e) => setCoupon({ ...coupon, userId: e.target.value })}
            className={input}
          >
            <option value="">All users</option>
            {data.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email}
              </option>
            ))}
          </select>
          <select
            value={coupon.categoryId}
            onChange={(e) =>
              setCoupon({ ...coupon, categoryId: e.target.value })
            }
            className={input}
          >
            <option value="">All categories</option>
            {data.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button disabled={saving} className={button}>
            Create coupon
          </button>
        </form>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead>
              <tr className="text-gray-400">
                <th className="p-2">Code</th>
                <th className="p-2">Details</th>
                <th className="p-2">Discount</th>
                <th className="p-2">Minimum</th>
                <th className="p-2">Expires</th>
                <th className="p-2">Uses</th>
                <th className="p-2">Restriction</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.coupons.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="p-2 font-black text-red-300">{item.code}</td>
                  <td className="max-w-56 p-2 text-gray-300">
                    {item.description || "No description"}
                  </td>
                  <td className="p-2">
                    {item.discountType === "percentage"
                      ? `${item.value}%`
                      : `$${item.value.toFixed(2)}`}
                  </td>
                  <td className="p-2">${item.minimumOrder.toFixed(2)}</td>
                  <td className="p-2">
                    {item.expiresAt
                      ? new Date(item.expiresAt).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="p-2">
                    {item.usedCount}/{item.usageLimit || "∞"}
                  </td>
                  <td className="p-2">
                    {item.user?.email || item.category?.name || "Everyone"}
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        run(
                          () =>
                            saveCoupon({
                              ...item,
                              expiresAt: item.expiresAt?.toISOString() || null,
                              isActive: !item.isActive,
                            }),
                          item.isActive
                            ? "Coupon disabled."
                            : "Coupon enabled.",
                        )
                      }
                      className={`cursor-pointer rounded px-3 py-1 font-bold ${item.isActive ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-300"}`}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.coupons.length ? (
            <p className="py-8 text-center text-gray-400">
              No coupons have been created.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
