"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-10 w-full border-t border-neutral-800 bg-[#111111]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6">
        <p className="text-center text-sm font-semibold text-gray-400 sm:text-base">
          © {new Date().getFullYear()} Fadel Chaaban. {t("footer")}
        </p>

        <Image
          src="/Logo.png"
          alt="logo"
          width={48}
          height={48}
          className="h-10 w-10 rounded-lg object-cover opacity-90 sm:h-12 sm:w-12"
        />
      </div>
    </footer>
  );
}
