"use client";

import type { ComponentProps } from "react";
import { Checkbox, CheckboxIndicator } from "@ui-sdk/react/checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function CatalogCheckbox({ className, ...props }: ComponentProps<typeof Checkbox>) {
  return (
    <Checkbox className={cn(
      "inline-flex size-4 shrink-0 items-center justify-center rounded border border-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-primary-foreground",
      className,
    )} {...props}>
      <CheckboxIndicator><Check aria-hidden="true" className="size-3" /></CheckboxIndicator>
    </Checkbox>
  );
}
