"use client";

import type { ComponentProps } from "react";
import { Dialog, DialogBackdrop, DialogContent, DialogDescription, DialogTitle } from "@ui-sdk/react/dialog";
import { cn } from "@/lib/utils";

function SheetContent({ className, ...props }: ComponentProps<typeof DialogContent>) {
  return (
    <>
      <DialogBackdrop
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs transition-opacity duration-150 motion-reduce:transition-none motion-reduce:duration-0 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
      />
      <DialogContent
        data-slot="sheet-content"
        className={cn(
          "fixed inset-x-0 top-0 z-50 mx-auto flex h-dvh max-h-dvh w-full max-w-7xl flex-col overflow-clip border-b bg-popover text-sm text-popover-foreground shadow-lg outline-none transition duration-200 ease-in-out motion-reduce:transition-none motion-reduce:duration-0 motion-safe:data-[ending-style]:-translate-y-10 motion-safe:data-[starting-style]:-translate-y-10 motion-safe:data-[ending-style]:opacity-0 motion-safe:data-[starting-style]:opacity-0",
          className,
        )}
        {...props}
      />
    </>
  );
}

export { Dialog as Sheet, DialogTitle as SheetTitle, DialogDescription as SheetDescription, SheetContent };
