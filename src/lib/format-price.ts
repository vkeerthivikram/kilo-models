export function formatPrice(perToken: string | number | undefined): string {
  const num = typeof perToken === "string" ? parseFloat(perToken) : perToken;
  if (num == null || Number.isNaN(num)) return "—";
  if (num === 0) return "Free";
  const perMillion = num * 1_000_000;
  if (perMillion < 0.005) return "<$0.01/M";
  return `$${perMillion.toFixed(2).replace(/\.00$/, "")}/M`;
}

export function formatContext(ctx: number | undefined): string {
  if (!ctx || ctx <= 0) return "—";
  if (ctx >= 1_000_000) return `${Math.round(ctx / 1_000_000)}M`;
  if (ctx >= 1_000) return `${Math.round(ctx / 1_000)}K`;
  return ctx.toString();
}

export const COMPARE_LIMIT = 10;
