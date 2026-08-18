"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { getCurrentSession, logoutUser } from "@/server/authActions";
import { getCheckoutSettings } from "@/server/checkoutSettings";
import { useLanguage } from "@/context/LanguageContext";
import { showMessage } from "@/components/MessageProvider";

type Session = Awaited<ReturnType<typeof getCurrentSession>>;

export default function Nav_bar() {
  const router = useRouter();
  const pathname = usePathname();
  const { cartCount } = useCart();
  const { copy, toggleLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<Session>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [restaurant, setRestaurant] = useState<{
    isOpen: boolean;
    message: string;
  } | null>(null);
  const isHome = pathname === "/";
  const labels = isHome
    ? copy.nav
    : {
        brand: "Restaurant",
        home: "Home",
        menu: "Menu",
        admin: "Admin",
        orders: "My Orders",
        cart: "Shopping cart",
        login: "Login",
        logout: "Logout",
        open: "Open now",
        closed: "Closed",
        language: "العربية",
        openMenu: "Open navigation menu",
        closeMenu: "Close navigation menu",
      };

  useEffect(() => {
    let active = true;

    getCurrentSession()
      .then((currentSession) => {
        if (active) setSession(currentSession);
      })
      .finally(() => {
        if (active) setSessionLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    getCheckoutSettings()
      .then((data) => setRestaurant(data.restaurant))
      .catch(() => setRestaurant(null));
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navigateTo = (path: string) => {
    setMobileMenuOpen(false);
    router.push(path, { scroll: false });
  };

  const logout = async () => {
    await logoutUser();
    sessionStorage.removeItem("userEmail");
    sessionStorage.removeItem("Admin");
    sessionStorage.removeItem("SuperAdmin");
    setSession(null);
    setMobileMenuOpen(false);
    router.replace("/");
    router.refresh();
  };

  const scrollToMenu = () => {
    setMobileMenuOpen(false);
    const menu = document.getElementById("menu");

    if (menu) {
      menu.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    navigateTo("/#menu");
  };

  const openCart = () => {
    if (!session) {
      showMessage("Please log in to view your cart.");
      navigateTo("/login?next=%2Fcart");
      return;
    }

    navigateTo("/cart");
  };

  const linkClass =
    "rounded-xl px-3 py-2.5 text-sm font-bold text-white transition hover:bg-white/5 hover:text-red-300";

  const navigation = (
    <>
      <button type="button" onClick={() => navigateTo("/")} className={linkClass}>
        {labels.home}
      </button>
      <button type="button" onClick={scrollToMenu} className={linkClass}>
        {labels.menu}
      </button>
      {session?.isAdmin ? (
        <button
          type="button"
          onClick={() => navigateTo("/Admin")}
          className={linkClass}
        >
          {labels.admin}
        </button>
      ) : null}
      {session ? (
        <button
          type="button"
          onClick={() => navigateTo("/profile/orders")}
          className={linkClass}
        >
          {labels.orders}
        </button>
      ) : null}
    </>
  );

  const accountAction = sessionLoaded ? (
    session ? (
      <button
        type="button"
        onClick={logout}
        className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
      >
        {labels.logout}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => navigateTo("/login")}
        className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
      >
        {labels.login}
      </button>
    )
  ) : (
    <span className="h-10 w-20 animate-pulse rounded-xl bg-white/10" />
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-red-900/40 bg-black/95 text-white shadow-xl backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-3 sm:px-6">
        <div className="flex h-[72px] items-center justify-between gap-3 lg:h-[84px]">
          <button
            type="button"
            onClick={() => navigateTo("/")}
            className="flex min-w-0 items-center gap-2.5 transition hover:opacity-90 sm:gap-3"
          >
            <img
              src="/Logo.png"
              alt="Restaurant logo"
              className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-red-500/30 sm:h-14 sm:w-14"
            />
            <span className="truncate text-base font-black uppercase tracking-wide text-red-500 sm:text-xl">
              {labels.brand}
            </span>
          </button>

          <div className="hidden items-center gap-1 lg:flex">
            {restaurant ? (
              <span
                title={restaurant.message}
                className={`me-2 rounded-full px-3 py-2 text-xs font-black ${
                  restaurant.isOpen
                    ? "bg-green-500/15 text-green-300"
                    : "bg-red-500/15 text-red-300"
                }`}
              >
                <span
                  className={`me-1.5 inline-block h-2 w-2 rounded-full ${restaurant.isOpen ? "bg-green-400" : "bg-red-400"}`}
                />
                {restaurant.isOpen ? labels.open : labels.closed}
              </span>
            ) : null}

            {navigation}

            {isHome ? (
              <button
                type="button"
                onClick={toggleLanguage}
                className="mx-1 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-black text-white transition hover:border-red-400 hover:text-red-300"
                aria-label="Switch page language"
              >
                <span aria-hidden="true">🌐</span> {labels.language}
              </button>
            ) : null}

            <button
              type="button"
              onClick={openCart}
              className="relative mx-1 flex h-11 w-11 items-center justify-center rounded-xl border border-red-900/60 bg-[#170303] text-xl transition hover:border-red-500 hover:bg-[#260606]"
              title={labels.cart}
              aria-label={labels.cart}
            >
              🛒
              {cartCount > 0 && session ? (
                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-black text-white">
                  {cartCount}
                </span>
              ) : null}
            </button>

            {accountAction}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            {isHome ? (
              <button
                type="button"
                onClick={toggleLanguage}
                className="rounded-xl border border-white/15 px-2.5 py-2 text-xs font-black"
                aria-label="Switch page language"
              >
                {labels.language}
              </button>
            ) : null}
            <button
              type="button"
              onClick={openCart}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-red-900/60 bg-[#170303] text-lg"
              aria-label={labels.cart}
            >
              🛒
              {cartCount > 0 && session ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black">
                  {cartCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-xl"
              aria-label={mobileMenuOpen ? labels.closeMenu : labels.openMenu}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? "×" : "☰"}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-white/10 py-3 lg:hidden">
            {restaurant ? (
              <div
                className={`mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${
                  restaurant.isOpen
                    ? "bg-green-500/10 text-green-300"
                    : "bg-red-500/10 text-red-300"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${restaurant.isOpen ? "bg-green-400" : "bg-red-400"}`}
                />
                {restaurant.isOpen ? labels.open : labels.closed}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2 text-center">
              {navigation}
            </div>
            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="flex w-full justify-stretch [&>*]:w-full">
                {accountAction}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
