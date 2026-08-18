"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav_bar from "@/components/nav_bar";
import { getCurrentSession } from "@/server/authActions";
import UsersTable from "@/components/UsersTable";
import FoodTable from "@/components/FoodTable";
import FoodTypeTable from "@/components/FoodTypeTable";
import OrderTable from "@/components/OrderTable";
import OrderItemsTable from "@/components/OrderItemsTable";

export default function Page() {
  const router = useRouter();

  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const role = await getCurrentSession();

        if (!role?.isAdmin) {
          router.replace("/");
          return;
        }

        if (role.isSuperAdmin) {
          if (role.email) {
            sessionStorage.setItem("SuperAdmin", role.email);
            sessionStorage.setItem("Admin", role.email);
          }
          setIsSuperAdmin(true);
        } else {
          if (role.email) sessionStorage.setItem("Admin", role.email);
          setIsSuperAdmin(false);
        }

        setCheckingAdmin(false);
      } catch (err) {
        console.log("Error checking admin access:", err);
        router.replace("/login");
      }
    };

    checkAccess();
  }, [router]);

  if (checkingAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#120000] px-4 text-center text-white">
        <p className="text-base font-bold sm:text-lg">
          Checking admin access...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#120000] text-white">
      <Nav_bar />

      <main className="px-3 py-6 sm:px-4 sm:py-8 md:px-8 lg:px-12 lg:py-10">
        <section className="mb-10 rounded-2xl border border-red-900/50 bg-[#1a0000] p-5 shadow-2xl sm:p-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400 sm:tracking-[0.3em]">
                {isSuperAdmin
                  ? "Super Admin Control Panel"
                  : "Admin Control Panel"}
              </p>

              <h1 className="mt-3 break-words text-3xl font-black uppercase tracking-wide sm:text-4xl md:text-5xl">
                Admin Dashboard
              </h1>

              <p className="mt-3 text-sm text-gray-300">
                Manage users, foods, food types, orders, and order items.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full cursor-pointer rounded-xl bg-red-600 px-8 py-3 font-bold text-white shadow-lg shadow-red-900/40 transition hover:-translate-y-1 hover:bg-red-700 md:w-auto"
            >
              Go to Home
            </button>
          </div>
        </section>

        <section className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              href: "/Admin/analytics",
              title: "Sales Analytics",
              text: "Sales summaries, revenue charts, and popular foods",
            },
            {
              href: "/Admin/inventory",
              title: "Inventory",
              text: "Stock warnings, adjustments, and stock history",
            },
            {
              href: "/Admin/operations",
              title: "Restaurant Operations",
              text: "Delivery zones, opening hours, and coupons",
            },
            {
              href: "/Admin/audit-logs",
              title: "Audit Logs",
              text: "Who changed what, with date and time",
            },
          ].map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className="cursor-pointer rounded-2xl border border-red-900/50 bg-[#1a0000] p-5 text-left transition hover:-translate-y-1 hover:border-red-500"
            >
              <span className="text-xl font-black text-red-300">
                {item.title}
              </span>
              <span className="mt-2 block text-sm text-gray-400">
                {item.text}
              </span>
            </button>
          ))}
        </section>

        <section className="min-w-0 space-y-10">
          <UsersTable isSuperAdmin={isSuperAdmin} />
          <FoodTable />
          <FoodTypeTable />
          <OrderTable />
          <OrderItemsTable />
        </section>
      </main>
    </div>
  );
}
