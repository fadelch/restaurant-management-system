"use client";

import { useEffect } from "react";
import i18n from "@/i18n/config";

const LANGUAGE_KEY = "restaurantLanguage";

function syncDocument(language: string) {
  const normalized = language === "ar" ? "ar" : "en";
  document.documentElement.lang = normalized;
  document.documentElement.dir = normalized === "ar" ? "rtl" : "ltr";
}

export default function LanguageSync() {
  useEffect(() => {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved === "ar" || saved === "en") void i18n.changeLanguage(saved);
    syncDocument(i18n.resolvedLanguage || i18n.language);

    const onLanguageChanged = (language: string) => {
      const normalized = language === "ar" ? "ar" : "en";
      localStorage.setItem(LANGUAGE_KEY, normalized);
      syncDocument(normalized);
    };
    i18n.on("languageChanged", onLanguageChanged);
    return () => i18n.off("languageChanged", onLanguageChanged);
  }, []);

  return null;
}

