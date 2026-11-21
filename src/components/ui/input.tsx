import * as React from "react"
import { flushSync } from "react-dom"
import { Input as InputPrimitive } from "@ui-sdk/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, value, defaultValue, onValueChange, ...props }: React.ComponentProps<"input"> & Pick<React.ComponentProps<typeof InputPrimitive>, "onValueChange">) {
  return (
    <InputPrimitive
      type={type}
      value={value === undefined ? undefined : String(value)}
      defaultValue={defaultValue === undefined ? undefined : String(defaultValue)}
      onValueChange={onValueChange && ((value, details) => {
        // The next agent step can depend on controls enabled by this value.
        if (details.source === "agent") {
          if (typeof value !== "string") throw new Error("Pass the input value as a string.")
          flushSync(() => onValueChange(value, details))
        } else onValueChange(value, details)
      })}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
