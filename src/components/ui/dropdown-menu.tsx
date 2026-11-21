"use client";

import type { ComponentProps } from "react";
import { Menu, MenuContent, MenuGroupLabel, MenuItem, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "@ui-sdk/react/menu";
import { cn } from "@/lib/utils";

const itemClass = "relative flex cursor-default select-none items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:opacity-50";

function DropdownMenuContent({ className, sideOffset = 4, ...props }: ComponentProps<typeof MenuContent>) {
  return <MenuContent sideOffset={sideOffset} className={cn(
    "z-50 max-h-(--available-height) min-w-32 origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none motion-safe:data-[starting-style]:opacity-0 motion-safe:data-[ending-style]:opacity-0",
    className,
  )} {...props} />;
}

function DropdownMenuItem({ className, ...props }: ComponentProps<typeof MenuItem>) {
  return <MenuItem className={cn(itemClass, className)} {...props} />;
}

function DropdownMenuRadioItem({ className, ...props }: ComponentProps<typeof MenuRadioItem>) {
  return <MenuRadioItem className={cn(itemClass, className)} {...props} />;
}

export {
  Menu as DropdownMenu, MenuTrigger as DropdownMenuTrigger, MenuRadioGroup as DropdownMenuRadioGroup,
  MenuGroupLabel as DropdownMenuGroupLabel, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioItem,
};
