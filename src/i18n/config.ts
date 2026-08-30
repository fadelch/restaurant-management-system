import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/i18n/resources/en.json";
import ar from "@/i18n/resources/ar.json";

export type AppLanguage = "en" | "ar";

export function createAppI18n(language: AppLanguage) {
  const instance = createInstance();
  void instance.use(initReactI18next).init({
    resources: { en: { translation: en }, ar: { translation: ar } },
    lng: language,
    fallbackLng: "en",
    supportedLngs: ["en", "ar"],
    initAsync: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}
