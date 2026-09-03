"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useRestaurant } from "@/components/providers/RestaurantProvider";

export default function Footer() {
  const { t } = useTranslation();
  const { identity } = useRestaurant();

  return (
    <footer className="mt-10 w-full border-t border-neutral-800 bg-[#111111]">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-center text-sm font-semibold text-gray-400 sm:text-base">
            © {new Date().getFullYear()} {identity.name}. {t("footer")}
          </p>

          <Image
            src={identity.logoUrl}
            alt={`${identity.name} logo`}
            width={48}
            height={48}
            className="h-10 w-10 rounded-lg object-cover opacity-90 sm:h-12 sm:w-12"
          />
        </div>
        <nav
          aria-label="Restaurant policies"
          className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-xs font-bold text-gray-400"
        >
          <Link href="/policies/privacy" className="hover:text-red-300">Privacy</Link>
          <Link href="/policies/terms" className="hover:text-red-300">Terms</Link>
          <Link href="/policies/refunds" className="hover:text-red-300">Refunds & cancellations</Link>
          <Link href="/policies/data-retention" className="hover:text-red-300">Data retention</Link>
          <Link href="/policies/allergy" className="hover:text-red-300">Allergy information</Link>
        </nav>
      </div>
    </footer>
  );
}
