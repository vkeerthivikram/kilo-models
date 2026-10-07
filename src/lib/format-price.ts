export function parsePrice(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function formatPrice(perToken: string | number | undefined): string {
  const num = parsePrice(perToken);
  if (num === null || !Number.isFinite(num * 1_000_000)) return "—";
  if (num === 0) return "Free";
  const perMillion = num * 1_000_000;
  if (perMillion < 0.005) return "<$0.01/M";
  return `$${perMillion.toFixed(2).replace(/\.00$/, "")}/M`;
}

export function formatDiscount(percent: number): string {
  return `${percent.toLocaleString("en-US", { useGrouping: false, maximumSignificantDigits: 21 })}%`;
}

export function formatContext(ctx: number | undefined): string {
  if (!ctx || !Number.isFinite(ctx) || ctx <= 0) return "—";
  if (ctx >= 1_000_000) return `${Math.round(ctx / 1_000_000)}M`;
  if (ctx >= 1_000) return `${Math.round(ctx / 1_000)}K`;
  return ctx.toString();
}

export const COMPARE_LIMIT = 10;
