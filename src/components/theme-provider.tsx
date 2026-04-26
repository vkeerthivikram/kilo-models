"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import {
  buildColorThemeVariables,
  DEFAULT_COLOR_THEME,
  getDefaultColorThemeForMode,
  isThemeAvailableInMode,
  isValidColorTheme,
  THEMES,
  type ColorTheme,
  type ThemeMode,
} from "@/lib/themes";

// ── Color theme context ────────────────────────────────────────────────────

const COLOR_THEME_KEY = "kilo-color-theme";

type ColorThemeContextValue = {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
};

const ColorThemeContext = React.createContext<ColorThemeContextValue>({
  colorTheme: DEFAULT_COLOR_THEME,
  setColorTheme: () => {},
});

export function useColorTheme() {
  return React.useContext(ColorThemeContext);
}

function applyColorTheme(theme: ColorTheme, mode: ThemeMode) {
  const root = document.documentElement;
  const vars = buildColorThemeVariables(theme, mode);

  Object.entries(vars).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });

  THEMES.forEach((t) => root.classList.remove(t.id));
  root.setAttribute("data-kilo-theme", theme);
  root.style.setProperty("color-scheme", mode);
}

function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  const [colorTheme, setColorThemeState] = React.useState<ColorTheme>(() => {
    if (typeof window === "undefined") return DEFAULT_COLOR_THEME;
    const stored = localStorage.getItem(COLOR_THEME_KEY);
    return stored && isValidColorTheme(stored) ? stored : DEFAULT_COLOR_THEME;
  });

  React.useEffect(() => {
    if (!resolvedTheme) return;
    const mode: ThemeMode = resolvedTheme === "dark" ? "dark" : "light";
    const effectiveTheme = isThemeAvailableInMode(colorTheme, mode)
      ? colorTheme
      : getDefaultColorThemeForMode(mode);

    if (effectiveTheme !== colorTheme) {
      setColorThemeState(effectiveTheme);
      localStorage.setItem(COLOR_THEME_KEY, effectiveTheme);
    }

    applyColorTheme(effectiveTheme, mode);
  }, [colorTheme, resolvedTheme]);

  const setColorTheme = React.useCallback(
    (theme: ColorTheme) => {
      let nextTheme = theme;

      if (resolvedTheme) {
        const mode: ThemeMode = resolvedTheme === "dark" ? "dark" : "light";
        nextTheme = isThemeAvailableInMode(theme, mode)
          ? theme
          : getDefaultColorThemeForMode(mode);
        applyColorTheme(nextTheme, mode);
      }

      setColorThemeState(nextTheme);
      localStorage.setItem(COLOR_THEME_KEY, nextTheme);
    },
    [resolvedTheme],
  );

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

// ── ThemeProvider ──────────────────────────────────────────────────────────
// next-themes manages light/dark/system mode classes.
// ColorThemeProvider resolves and applies KiloCode color tokens.

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      themes={["light", "dark"]}
    >
      <ColorThemeProvider>{children}</ColorThemeProvider>
    </NextThemesProvider>
  );
}
