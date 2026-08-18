"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { logoutUser } from "@/server/authActions";
import { getCheckoutSettings } from "@/server/checkoutSettings";

export default function Nav_bar() {
  const router = useRouter();
  const { cartCount } = useCart();
  const [restaurant, setRestaurant] = useState<{
    isOpen: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    getCheckoutSettings()
      .then((data) => setRestaurant(data.restaurant))
      .catch(() => setRestaurant(null));
  }, []);

  const navigateTo = (path: string) => {
    router.push(path, {
      scroll: false,
    });
  };

  const logout = async () => {
    await logoutUser();
    sessionStorage.removeItem("userEmail");
    sessionStorage.removeItem("Admin");
    sessionStorage.removeItem("SuperAdmin");

    router.replace("/login", {
      scroll: false,
    });
  };

  const scrollToMenu = () => {
    const menu = document.getElementById("menu");

    if (menu) {
      menu.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    navigateTo("/#menu");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-red-900/40 bg-black/90 py-3 text-white shadow-xl backdrop-blur-md sm:py-4">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-3 sm:px-6 md:flex-row md:gap-6">
        <button
          type="button"
          onClick={() => navigateTo("/")}
          className="flex cursor-pointer items-center gap-2 transition-all duration-300 hover:scale-105 sm:gap-3"
        >
          <img
            src="/Logo.png"
            alt="Logo"
            className="h-12 w-12 rounded-md object-cover sm:h-16 sm:w-16"
          />

          <span className="text-lg font-black uppercase tracking-wide text-red-500 transition hover:text-red-400 sm:text-2xl">
            Restaurant
          </span>
        </button>

        <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:gap-4 md:w-auto lg:flex-nowrap">
          {restaurant ? (
            <span
              title={restaurant.message}
              className={`rounded-full px-3 py-1 text-xs font-black ${restaurant.isOpen ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}`}
            >
              <span className="xl:hidden">
                {restaurant.isOpen ? "Open now" : "Closed"}
              </span>
              <span className="hidden xl:inline">{restaurant.message}</span>
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => navigateTo("/")}
            className="cursor-pointer px-1 py-2 text-sm font-bold text-white transition-all duration-300 hover:scale-110 hover:text-red-400 sm:text-base"
          >
            Home
          </button>

          <button
            type="button"
            onClick={scrollToMenu}
            className="cursor-pointer px-1 py-2 text-sm font-bold text-white transition-all duration-300 hover:scale-110 hover:text-red-400 sm:text-base"
          >
            Menu
          </button>

          <button
            type="button"
            onClick={() => navigateTo("/Admin")}
            className="cursor-pointer px-1 py-2 text-sm font-bold text-white transition-all duration-300 hover:scale-110 hover:text-red-400 sm:text-base"
          >
            Admin
          </button>

          <button
            type="button"
            onClick={() => navigateTo("/profile/orders")}
            className="cursor-pointer px-1 py-2 text-sm font-bold text-white transition-all duration-300 hover:scale-110 hover:text-red-400 sm:text-base"
          >
            My Orders
          </button>

          <button
            type="button"
            onClick={() => navigateTo("/cart")}
            className="relative cursor-pointer rounded-2xl border border-red-900/60 bg-[#120000] px-3 py-2 text-xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-110 hover:border-red-500 hover:bg-[#220000] sm:px-4 sm:text-2xl"
            title="Cart"
          >
            🛒
            {cartCount > 0 ? (
              <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-black text-white shadow-lg">
                {cartCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={logout}
            className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:bg-red-700 sm:px-5 sm:text-base"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
