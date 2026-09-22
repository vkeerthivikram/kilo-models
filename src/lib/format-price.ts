export function formatPrice(perToken: string | number | undefined): string {
  const num = typeof perToken === "string" ? parseFloat(perToken) : perToken;
  if (num == null || Number.isNaN(num)) return "—";
  if (num === 0) return "Free";
  const perMillion = num * 1_000_000;
  if (perMillion < 0.005) return "<$0.01/M";
  return `$${perMillion.toFixed(2).replace(/\.00$/, "")}/M`;
}
