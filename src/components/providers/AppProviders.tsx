"use client";

import { useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { createAppI18n, type AppLanguage } from "@/i18n/config";
import { CartProvider } from "@/context/CartContext";
import MessageProvider from "@/components/MessageProvider";
import LanguageSync from "@/components/providers/LanguageSync";
import { CurrencyProvider } from "@/components/providers/CurrencyProvider";
import { RestaurantProvider } from "@/components/providers/RestaurantProvider";
import type { RestaurantPublicProfile } from "@/types/restaurant";

export default function AppProviders({
  children,
  initialLanguage,
  initialUsdToLbpRate,
  initialRestaurantProfile,
}: {
  children: ReactNode;
  initialLanguage: AppLanguage;
  initialUsdToLbpRate: number | null;
  initialRestaurantProfile: RestaurantPublicProfile;
}) {
  const [i18n] = useState(() => createAppI18n(initialLanguage));

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageSync initialLanguage={initialLanguage} />
      <RestaurantProvider profile={initialRestaurantProfile}>
        <CurrencyProvider initialUsdToLbpRate={initialUsdToLbpRate}>
          <MessageProvider>
            <CartProvider>{children}</CartProvider>
          </MessageProvider>
        </CurrencyProvider>
      </RestaurantProvider>
    </I18nextProvider>
  );
}
