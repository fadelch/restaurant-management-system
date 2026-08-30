"use client";

import { useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { createAppI18n, type AppLanguage } from "@/i18n/config";
import { CartProvider } from "@/context/CartContext";
import MessageProvider from "@/components/MessageProvider";
import LanguageSync from "@/components/providers/LanguageSync";

export default function AppProviders({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage: AppLanguage;
}) {
  const [i18n] = useState(() => createAppI18n(initialLanguage));

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageSync initialLanguage={initialLanguage} />
      <MessageProvider>
        <CartProvider>{children}</CartProvider>
      </MessageProvider>
    </I18nextProvider>
  );
}
