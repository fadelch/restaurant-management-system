import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import MessageProvider from "@/components/MessageProvider";
import { LanguageProvider } from "@/context/LanguageContext";

export const metadata: Metadata = {
  title: "Restaurant",
  description: "Restaurant food ordering app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <MessageProvider>
            <CartProvider>{children}</CartProvider>
          </MessageProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
