"use client";

import { Badge } from "@/components/ui/badge";
import { useRetirementClock } from "@/hooks/use-retirement-clock";
import { getRetirementStatus } from "@/lib/model-retirement";

export function RetirementBadge({ expirationDate }: { expirationDate?: string | null }) {
  const now = useRetirementClock();
  const status = getRetirementStatus(expirationDate, now);
  if (!status) return null;
  const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(status.date);
  const exact = status.dateOnly ? `${date}, end of day UTC` : new Date(status.deadline).toISOString();
  return (
    <Badge variant="outline" className={`max-w-full whitespace-normal text-[11px] ${status.retired ? "border-destructive/40 text-destructive" : status.soon ? "border-amber-500/40 text-amber-800 dark:text-amber-300" : "text-muted-foreground"}`} title={`Retirement date: ${exact}`}>
      {status.retired ? "Retired" : "Retires"} {date} (UTC)
    </Badge>
  );
}
