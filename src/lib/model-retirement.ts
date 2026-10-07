const DAY = 86_400_000;

/** A date-only value is the last available UTC day; a zoned timestamp is an exact deadline. */
export function parseRetirementDate(value: unknown): { deadline: number; dateOnly: boolean; date: number } | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(value);
  if (!match) return null;
  const calendarDate = Date.parse(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
  const calendar = new Date(calendarDate);
  if (calendar.getUTCFullYear() !== Number(match[1]) || calendar.getUTCMonth() + 1 !== Number(match[2]) || calendar.getUTCDate() !== Number(match[3])) return null;
  const dateOnly = value.length === 10;
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return null;
  return { date, dateOnly, deadline: dateOnly ? date + DAY : date };
}

export function getRetirementStatus(value: unknown, now: number) {
  const parsed = parseRetirementDate(value);
  if (!parsed || !Number.isFinite(now) || now <= 0) return null;
  const retired = now >= parsed.deadline;
  return { ...parsed, retired, soon: !retired && parsed.deadline - now <= 30 * DAY };
}
