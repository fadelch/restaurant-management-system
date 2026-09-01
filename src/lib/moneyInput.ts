export function hasAtMostDecimalPlaces(value: number, places: number) {
  if (!Number.isFinite(value)) return false;
  const text = String(value);
  if (/e/i.test(text)) return false;
  const fraction = text.split(".")[1] || "";
  return fraction.length <= places;
}
