import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import AppProviders from "@/components/providers/AppProviders";
import { getCurrentUsdToLbpRate } from "@/lib/currencySettings";
import { getRestaurantLaunchConfig } from "@/lib/restaurantConfig";
import { getRestaurantPublicProfile } from "@/lib/restaurantHours";

export function generateMetadata(): Metadata {
  const { identity } = getRestaurantLaunchConfig();
  return {
    title: identity.name,
    description: identity.metaDescription,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await headers();
  const [exchangeRate, restaurantProfile] = await Promise.all([
    getCurrentUsdToLbpRate(),
    getRestaurantPublicProfile(),
  ]);
  const languageCookie = (await cookies()).get("restaurantLanguage")?.value;
  const language = languageCookie === "ar" ? "ar" : "en";
  return (
    <html
      lang={language}
      dir={language === "ar" ? "rtl" : "ltr"}
      data-scroll-behavior="smooth"
    >
      <body>
        <AppProviders
          initialLanguage={language}
          initialUsdToLbpRate={exchangeRate?.toNumber() ?? null}
          initialRestaurantProfile={restaurantProfile}
        >
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
