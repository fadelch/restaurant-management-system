import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/i18n/resources/en.json";
import ar from "@/i18n/resources/ar.json";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, ar: { translation: ar } },
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en", "ar"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;

