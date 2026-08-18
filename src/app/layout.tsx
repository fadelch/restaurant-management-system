import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import MessageProvider from "@/components/MessageProvider";

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
        <MessageProvider>
          <CartProvider>{children}</CartProvider>
        </MessageProvider>
      </body>
    </html>
  );
}
