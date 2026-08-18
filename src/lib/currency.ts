export const USD_TO_LBP_RATE = 89500;

export function formatUSD(amount: number) {
  return `$${amount.toFixed(2)}`;
}

export function convertUsdToLbp(amount: number) {
  return Math.round(amount * USD_TO_LBP_RATE);
}

export function formatLBP(amount: number) {
  return `L.L ${amount.toLocaleString()}`;
}

export function formatUsdWithLbp(amount: number) {
  const lbp = convertUsdToLbp(amount);

  return {
    usd: formatUSD(amount),
    lbp: formatLBP(lbp),
  };
}
