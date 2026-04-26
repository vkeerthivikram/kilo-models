"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useColorTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { THEMES } from "@/lib/themes";
import { Check, Laptop, Moon, Palette, Sun } from "lucide-react";

function swatchGradient(light: string, dark: string) {
  return `linear-gradient(135deg, ${light} 0 50%, ${dark} 50% 100%)`;
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="inline-flex shrink-0 items-center justify-center rounded-lg border border-input bg-background hover:bg-muted hover:text-foreground size-9">
        <Palette className="h-4 w-4" />
      </div>
    );
  }

  const selectedTheme = THEMES.find((t) => t.id === colorTheme);
  const selectedSwatch = selectedTheme
    ? swatchGradient(selectedTheme.swatch.light, selectedTheme.swatch.dark)
    : swatchGradient("#d4d4d8", "#18181b");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-lg border border-input bg-background hover:bg-muted hover:text-foreground size-9 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
        <div className="relative h-4 w-4 overflow-hidden rounded-full border border-border/70">
          <span className="absolute inset-0" style={{ background: selectedSwatch }} />
          <span
            className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-background"
            style={{ backgroundColor: selectedTheme?.swatch.accent ?? "#7c3aed" }}
          />
        </div>
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 z-50 max-h-[70vh] overflow-y-auto">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Mode
        </div>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
          {theme === "light" && (
            <Check className="ml-auto h-3.5 w-3.5 text-primary" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
          {theme === "dark" && (
            <Check className="ml-auto h-3.5 w-3.5 text-primary" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Laptop className="mr-2 h-4 w-4" />
          System
          {theme === "system" && (
            <Check className="ml-auto h-3.5 w-3.5 text-primary" />
          )}
        </DropdownMenuItem>

        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-1">
          Color Theme
        </div>
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setColorTheme(t.id)}
            className="flex items-center gap-2"
          >
            <span className="relative h-3.5 w-3.5 shrink-0 overflow-hidden rounded-full border border-border/70">
              <span
                className="absolute inset-0"
                style={{ background: swatchGradient(t.swatch.light, t.swatch.dark) }}
              />
              <span
                className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-background"
                style={{ backgroundColor: t.swatch.accent }}
              />
            </span>
            {t.name}
            {colorTheme === t.id && (
              <Check className="ml-auto h-3.5 w-3.5 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
