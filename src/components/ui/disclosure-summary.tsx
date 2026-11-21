"use client";

import type { ComponentProps } from "react";
import { Button } from "@ui-sdk/react/button";

export function DisclosureSummary(props: Pick<ComponentProps<"summary">, "className" | "children" | "aria-label" | "aria-describedby">) {
  return <Button render={<summary />} {...props} />;
}
