import "server-only";

import { Prisma } from "@/generated/prisma";

export type DecimalValue = Prisma.Decimal.Value;

const USD_SCALE = 2;
const LBP_SCALE = 0;
const ROUNDING_MODE = Prisma.Decimal.ROUND_HALF_UP;

export function decimal(value: DecimalValue) {
  return new Prisma.Decimal(value);
}

export function roundUsd(value: DecimalValue) {
  return decimal(value).toDecimalPlaces(USD_SCALE, ROUNDING_MODE);
}

export function sumUsd(values: DecimalValue[]) {
  let sum = decimal(0);
  for (const value of values) sum = sum.plus(decimal(value));
  return roundUsd(sum);
}

export function calculateUnitPrice(
  basePrice: DecimalValue,
  extras: DecimalValue[] = [],
) {
  return sumUsd([basePrice, ...extras]);
}

export function calculateLineTotal(
  unitPrice: DecimalValue,
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("Quantity must be a non-negative integer.");
  }
  return roundUsd(decimal(unitPrice).times(quantity));
}

export function calculatePercentageDiscount(
  eligibleSubtotal: DecimalValue,
  percentage: DecimalValue,
) {
  const eligible = roundUsd(eligibleSubtotal);
  const rate = decimal(percentage);
  if (rate.isNegative() || rate.greaterThan(100)) {
    throw new Error("Percentage discounts must be between 0 and 100.");
  }
  return roundUsd(eligible.times(rate).dividedBy(100));
}

export function calculateFixedDiscount(
  eligibleSubtotal: DecimalValue,
  requestedDiscount: DecimalValue,
) {
  const eligible = roundUsd(eligibleSubtotal);
  const requested = roundUsd(requestedDiscount);
  if (requested.isNegative()) {
    throw new Error("A fixed discount cannot be negative.");
  }
  return Prisma.Decimal.min(eligible, requested);
}

export function calculateOrderTotal(
  subtotal: DecimalValue,
  deliveryFee: DecimalValue,
  discount: DecimalValue,
) {
  const calculated = roundUsd(subtotal)
    .plus(roundUsd(deliveryFee))
    .minus(roundUsd(discount));
  return roundUsd(Prisma.Decimal.max(calculated, decimal(0)));
}

export function calculateRefundLimit(input: {
  orderTotal: DecimalValue;
  alreadyRefunded: DecimalValue;
  unitPrice: DecimalValue;
  quantity: number;
}) {
  const remaining = calculateRemainingBalance(
    input.orderTotal,
    input.alreadyRefunded,
  );
  const lineLimit = calculateLineTotal(input.unitPrice, input.quantity);
  return roundUsd(Prisma.Decimal.min(remaining, lineLimit));
}

export function calculateRemainingBalance(
  orderTotal: DecimalValue,
  refundedAmount: DecimalValue,
) {
  return roundUsd(
    Prisma.Decimal.max(
      roundUsd(orderTotal).minus(roundUsd(refundedAmount)),
      decimal(0),
    ),
  );
}

export function convertUsdToLbpDecimal(
  usdAmount: DecimalValue,
  usdToLbpRate: DecimalValue,
) {
  const rate = decimal(usdToLbpRate);
  if (!rate.greaterThan(0)) {
    throw new Error("The USD/LBP exchange rate must be greater than zero.");
  }
  return roundUsd(usdAmount)
    .times(rate)
    .toDecimalPlaces(LBP_SCALE, ROUNDING_MODE);
}

export function decimalToNumber(value: DecimalValue) {
  return decimal(value).toNumber();
}

export function formatUsdForMessage(value: DecimalValue) {
  return `$${roundUsd(value).toFixed(USD_SCALE)}`;
}
