"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { AppLanguage } from "@/i18n/config";

const LANGUAGE_KEY = "restaurantLanguage";

function syncDocument(language: string) {
  const normalized = language === "ar" ? "ar" : "en";
  document.documentElement.lang = normalized;
  document.documentElement.dir = normalized === "ar" ? "rtl" : "ltr";
}

function saveLanguage(language: AppLanguage) {
  localStorage.setItem(LANGUAGE_KEY, language);
  document.cookie = `${LANGUAGE_KEY}=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
  syncDocument(language);
}

export default function LanguageSync({
  initialLanguage,
}: {
  initialLanguage: AppLanguage;
}) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const saved = localStorage.getItem(LANGUAGE_KEY);

    const onLanguageChanged = (language: string) => {
      const normalized = language === "ar" ? "ar" : "en";
      saveLanguage(normalized);
    };
    i18n.on("languageChanged", onLanguageChanged);
    saveLanguage(initialLanguage);

    let cancelled = false;
    const applyLegacyPreference = () => {
      if (
        !cancelled &&
        (saved === "ar" || saved === "en") &&
        saved !== initialLanguage
      ) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!cancelled) void i18n.changeLanguage(saved);
          });
        });
      }
    };

    if (document.readyState === "complete") applyLegacyPreference();
    else window.addEventListener("load", applyLegacyPreference, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", applyLegacyPreference);
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, [i18n, initialLanguage]);

  return null;
}
