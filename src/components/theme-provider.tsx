"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { THEMES, type ColorTheme } from "@/lib/themes";

// ── Color theme context ────────────────────────────────────────────────────

const COLOR_THEME_KEY = "kilo-color-theme";
const DEFAULT_COLOR_THEME: ColorTheme = "modern-minimal";

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

function applyColorTheme(theme: ColorTheme) {
  const root = document.documentElement;
  THEMES.forEach((t) => root.classList.remove(t.id));
  root.classList.add(theme);
}

function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = React.useState<ColorTheme>(() => {
    if (typeof window === "undefined") return DEFAULT_COLOR_THEME;
    const stored = localStorage.getItem(COLOR_THEME_KEY) as ColorTheme | null;
    return stored && THEMES.some((t) => t.id === stored) ? stored : DEFAULT_COLOR_THEME;
  });

  React.useEffect(() => {
    applyColorTheme(colorTheme);
  }, [colorTheme]);

  const setColorTheme = React.useCallback((theme: ColorTheme) => {
    setColorThemeState(theme);
    localStorage.setItem(COLOR_THEME_KEY, theme);
    applyColorTheme(theme);
  }, []);

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

// ── ThemeProvider ──────────────────────────────────────────────────────────
// next-themes manages ONLY the "dark" class (dark/light/system mode).
// ColorThemeProvider manages the color theme class (e.g. "modern-minimal").
// The CSS uses `.dark.modern-minimal` so both classes must coexist on <html>.

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
