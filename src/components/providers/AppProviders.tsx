"use client";

import { useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { createAppI18n, type AppLanguage } from "@/i18n/config";
import { CartProvider } from "@/context/CartContext";
import MessageProvider from "@/components/MessageProvider";
import LanguageSync from "@/components/providers/LanguageSync";
import { CurrencyProvider } from "@/components/providers/CurrencyProvider";

export default function AppProviders({
  children,
  initialLanguage,
  initialUsdToLbpRate,
}: {
  children: ReactNode;
  initialLanguage: AppLanguage;
  initialUsdToLbpRate: number | null;
}) {
  const [i18n] = useState(() => createAppI18n(initialLanguage));

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageSync initialLanguage={initialLanguage} />
      <CurrencyProvider initialUsdToLbpRate={initialUsdToLbpRate}>
        <MessageProvider>
          <CartProvider>{children}</CartProvider>
        </MessageProvider>
      </CurrencyProvider>
    </I18nextProvider>
  );
}
