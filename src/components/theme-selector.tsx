"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useColorTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroupLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getThemesForMode, type ThemeMode } from "@/lib/themes";
import { Check, Laptop, Moon, Palette, Sun } from "lucide-react";

function getModeSwatchColor(
  swatch: { light: string; dark: string },
  mode: ThemeMode,
) {
  return mode === "dark" ? swatch.dark : swatch.light;
}

const emptySubscribe = () => () => {};

export function ThemeSelector() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  // True after hydration; false on the server and during the first client render.
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <div className="inline-flex shrink-0 items-center justify-center rounded-lg border border-input bg-background hover:bg-muted hover:text-foreground size-11">
        <Palette className="h-4 w-4" />
      </div>
    );
  }

  const mode: ThemeMode = resolvedTheme === "dark" ? "dark" : "light";
  const visibleThemes = getThemesForMode(mode);
  const selectedTheme =
    visibleThemes.find((t) => t.id === colorTheme) ?? visibleThemes[0];
  const selectedSwatch = selectedTheme
    ? getModeSwatchColor(selectedTheme.swatch, mode)
    : "#7c3aed";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-lg border border-input bg-background hover:bg-muted hover:text-foreground size-11 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
        <div className="relative h-4 w-4 overflow-hidden rounded-full border border-border/70">
          <span className="absolute inset-0" style={{ backgroundColor: selectedSwatch }} />
          <span
            className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-background"
            style={{ backgroundColor: selectedTheme?.swatch.accent ?? "#7c3aed" }}
          />
        </div>
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 z-50 max-h-[70vh] overflow-y-auto">
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(value) => { if (value) setTheme(value); }}>
          <DropdownMenuGroupLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Mode</DropdownMenuGroupLabel>
          {[
            { id: "light", label: "Light", Icon: Sun },
            { id: "dark", label: "Dark", Icon: Moon },
            { id: "system", label: "System", Icon: Laptop },
          ].map(({ id, label, Icon }) => (
            <DropdownMenuRadioItem key={id} value={id} closeOnSelect>
              <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
              {label}
              {(theme ?? "system") === id && <Check className="ml-auto h-3.5 w-3.5 text-primary" aria-hidden="true" />}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuRadioGroup value={selectedTheme?.id} onValueChange={(value) => {
          const selection = visibleThemes.find((candidate) => candidate.id === value);
          if (selection) setColorTheme(selection.id);
        }}>
          <DropdownMenuGroupLabel className="mt-1 px-2 py-1.5 text-xs font-medium text-muted-foreground">Color Theme</DropdownMenuGroupLabel>
          {visibleThemes.map((t) => (
            <DropdownMenuRadioItem key={t.id} value={t.id} closeOnSelect className="flex items-center gap-2">
              <span aria-hidden="true" className="relative h-3.5 w-3.5 shrink-0 overflow-hidden rounded-full border border-border/70">
                <span
                  className="absolute inset-0"
                  style={{ backgroundColor: getModeSwatchColor(t.swatch, mode) }}
                />
                <span
                  className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-background"
                  style={{ backgroundColor: t.swatch.accent }}
                />
              </span>
              {t.name}
              {selectedTheme?.id === t.id && <Check className="ml-auto h-3.5 w-3.5 text-primary" aria-hidden="true" />}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
