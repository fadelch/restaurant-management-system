import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import AppProviders from "@/components/providers/AppProviders";

export const metadata: Metadata = {
  title: "Restaurant",
  description: "Restaurant food ordering app",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await headers();
  const languageCookie = (await cookies()).get("restaurantLanguage")?.value;
  const language = languageCookie === "ar" ? "ar" : "en";
  return (
    <html
      lang={language}
      dir={language === "ar" ? "rtl" : "ltr"}
      data-scroll-behavior="smooth"
    >
      <body>
        <AppProviders initialLanguage={language}>{children}</AppProviders>
      </body>
    </html>
  );
}
