const USD_MINOR_UNIT = 100;

export function usdToCents(amount: number) {
  if (!Number.isFinite(amount)) throw new Error("USD amount must be finite.");
  return Math.round(amount * USD_MINOR_UNIT);
}

export function centsToUsd(cents: number) {
  if (!Number.isSafeInteger(cents)) {
    throw new Error("USD cents must be a safe integer.");
  }
  return cents / USD_MINOR_UNIT;
}

export function addUsdAmounts(amounts: number[]) {
  return centsToUsd(
    amounts.reduce((total, amount) => total + usdToCents(amount), 0),
  );
}

export function multiplyUsd(amount: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("Quantity must be a non-negative integer.");
  }
  return centsToUsd(usdToCents(amount) * quantity);
}

export function subtractUsd(amount: number, deduction: number) {
  return centsToUsd(usdToCents(amount) - usdToCents(deduction));
}

export function minUsdAmount(...amounts: number[]) {
  if (!amounts.length) throw new Error("At least one USD amount is required.");
  return centsToUsd(Math.min(...amounts.map(usdToCents)));
}

export function maxUsdAmount(...amounts: number[]) {
  if (!amounts.length) throw new Error("At least one USD amount is required.");
  return centsToUsd(Math.max(...amounts.map(usdToCents)));
}

export function formatUSD(amount: number) {
  return `$${centsToUsd(usdToCents(amount)).toFixed(2)}`;
}

export function convertUsdToLbp(amount: number, usdToLbpRate: number) {
  if (!Number.isFinite(usdToLbpRate) || usdToLbpRate <= 0) return null;
  const usdCents = BigInt(usdToCents(amount));
  const rateScale = BigInt(10_000);
  const scaledRate = BigInt(usdToLbpRate.toFixed(4).replace(".", ""));
  const denominator = BigInt(USD_MINOR_UNIT) * rateScale;
  const numerator = usdCents * scaledRate;
  const whole = numerator / denominator;
  const remainder = numerator % denominator;
  return remainder * BigInt(2) >= denominator ? whole + BigInt(1) : whole;
}

export function formatLBP(amount: bigint) {
  return `L.L ${amount.toLocaleString()}`;
}

export function formatUsdWithLbp(
  amount: number,
  usdToLbpRate: number | null,
) {
  const lbp =
    usdToLbpRate === null ? null : convertUsdToLbp(amount, usdToLbpRate);

  return {
    usd: formatUSD(amount),
    lbp: lbp === null ? "LBP rate not configured" : formatLBP(lbp),
  };
}
