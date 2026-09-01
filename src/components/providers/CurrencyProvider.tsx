"use client";

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";
import { formatUsdWithLbp as formatCurrency } from "@/lib/currency";

type CurrencyContextValue = {
  usdToLbpRate: number | null;
  formatUsdWithLbp: (
    amount: number,
    rateOverride?: number | null,
  ) => { usd: string; lbp: string };
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  children,
  initialUsdToLbpRate,
}: {
  children: ReactNode;
  initialUsdToLbpRate: number | null;
}) {
  const formatUsdWithLbp = useCallback(
    (amount: number, rateOverride?: number | null) =>
      formatCurrency(
        amount,
        rateOverride === undefined ? initialUsdToLbpRate : rateOverride,
      ),
    [initialUsdToLbpRate],
  );

  return (
    <CurrencyContext.Provider
      value={{ usdToLbpRate: initialUsdToLbpRate, formatUsdWithLbp }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("CurrencyProvider is missing.");
  return context;
}
