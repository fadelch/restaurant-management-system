"use client";

import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/config";
import { CartProvider } from "@/context/CartContext";
import MessageProvider from "@/components/MessageProvider";
import LanguageSync from "@/components/providers/LanguageSync";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageSync />
      <MessageProvider>
        <CartProvider>{children}</CartProvider>
      </MessageProvider>
    </I18nextProvider>
  );
}
