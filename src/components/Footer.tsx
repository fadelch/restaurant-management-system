"use client";

import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export default function Footer() {
  const pathname = usePathname();
  const { copy } = useLanguage();
  const footerText = pathname === "/" ? copy.footer : "All rights reserved.";

  return (
    <footer className="mt-10 w-full border-t border-neutral-800 bg-[#111111]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6">
        <p className="text-center text-sm font-semibold text-gray-400 sm:text-base">
          © {new Date().getFullYear()} Fadel Chaaban. {footerText}
        </p>

        <img
          src="/Logo.png"
          alt="logo"
          className="h-10 w-10 rounded-lg object-cover opacity-90 sm:h-12 sm:w-12"
        />
      </div>
    </footer>
  );
}
