"use client";

import { formatUsdWithLbp } from "@/lib/currency";
import type { getAdminDashboardStats } from "@/server/getAdminDashboardStats";

export type AdminDashboardData = Awaited<
  ReturnType<typeof getAdminDashboardStats>
>;

function VerticalBarChart({
  data,
  currency = false,
}: {
  data: { key: string; label: string; value: number }[];
  currency?: boolean;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="mt-6 flex h-52 items-end gap-2 sm:gap-3">
      {data.map((item) => {
        const height =
          item.value === 0 ? 3 : Math.max(8, (item.value / max) * 100);

        return (
          <div
            key={item.key}
            className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"
          >
            <p className="mb-2 truncate text-[10px] font-bold text-gray-400 sm:text-xs">
              {currency ? formatUsdWithLbp(item.value).usd : item.value}
            </p>
            <div
              className="min-h-1 rounded-t-lg bg-gradient-to-t from-red-800 to-red-500 transition-all"
              style={{ height: `${height}%` }}
              title={`${item.label}: ${currency ? formatUsdWithLbp(item.value).usd : item.value}`}
            />
            <p className="mt-2 truncate text-[10px] font-bold text-gray-400 sm:text-xs">
              {item.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="mt-5 space-y-4">
      {data.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet.</p>
      ) : (
        data.map((item) => (
          <div key={item.name}>
            <div className="mb-2 flex justify-between gap-3 text-sm">
              <span className="truncate font-bold capitalize">{item.name}</span>
              <span className="text-gray-400">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-400"
                style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function AdminDashboardStats({
  data,
}: {
  data: AdminDashboardData;
}) {
  const bestSeller = data.bestSellingFoods[0];
  const cards = [
    {
      label: "Total Sales",
      value: formatUsdWithLbp(data.summary.totalSales).usd,
      tone: "text-emerald-300",
    },
    {
      label: "Orders Today",
      value: data.summary.ordersToday,
      tone: "text-blue-300",
    },
    {
      label: "Pending Orders",
      value: data.summary.pendingOrders,
      tone: "text-yellow-300",
    },
    {
      label: "Total Customers",
      value: data.summary.totalCustomers,
      tone: "text-violet-300",
    },
    {
      label: "Low-stock Foods",
      value: data.summary.lowStockCount,
      tone: "text-orange-300",
    },
    {
      label: "Best-selling Food",
      value: bestSeller?.name || "No sales yet",
      tone: "text-red-300",
    },
  ];

  return (
    <section className="mb-10 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/10 bg-black/35 p-5 shadow-lg"
          >
            <p className="text-xs font-black uppercase tracking-wider text-gray-500">
              {card.label}
            </p>
            <p className={`mt-3 break-words text-2xl font-black ${card.tone}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/35 p-5 sm:p-6">
          <h2 className="text-xl font-black">Daily Revenue</h2>
          <p className="mt-1 text-sm text-gray-500">Last 7 days</p>
          <VerticalBarChart data={data.dailyRevenue} currency />
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/35 p-5 sm:p-6">
          <h2 className="text-xl font-black">Monthly Revenue</h2>
          <p className="mt-1 text-sm text-gray-500">Last 6 months</p>
          <VerticalBarChart data={data.monthlyRevenue} currency />
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/35 p-5 sm:p-6">
          <h2 className="text-xl font-black">Orders by Status</h2>
          <HorizontalChart data={data.ordersByStatus} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/35 p-5 sm:p-6">
          <h2 className="text-xl font-black">Popular Food Categories</h2>
          <HorizontalChart
            data={data.popularCategories.map((item) => ({
              name: item.name,
              value: item.quantity,
            }))}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-orange-500/20 bg-orange-950/15 p-5 sm:p-6">
          <h2 className="text-xl font-black text-orange-300">
            Low-stock Foods
          </h2>
          <div className="mt-4 space-y-3">
            {data.lowStockFoods.length === 0 ? (
              <p className="text-sm text-gray-400">
                All foods have healthy stock.
              </p>
            ) : (
              data.lowStockFoods.map((food) => (
                <div
                  key={food.id}
                  className="flex justify-between gap-4 rounded-xl bg-black/30 p-3"
                >
                  <span className="font-bold">{food.name}</span>
                  <span className="font-black text-orange-300">
                    {food.qty} left
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-red-950/15 p-5 sm:p-6">
          <h2 className="text-xl font-black text-red-300">
            Best-selling Foods
          </h2>
          <div className="mt-4 space-y-3">
            {data.bestSellingFoods.length === 0 ? (
              <p className="text-sm text-gray-400">
                Sales data will appear after orders.
              </p>
            ) : (
              data.bestSellingFoods.map((food, index) => (
                <div
                  key={food.id}
                  className="flex justify-between gap-4 rounded-xl bg-black/30 p-3"
                >
                  <span className="font-bold">
                    #{index + 1} {food.name}
                  </span>
                  <span className="font-black text-red-300">
                    {food.quantity} sold
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
