export const THEMES = [
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    primary: "oklch(0.65 0.18 335)",
  },
  {
    id: "catppuccin",
    name: "Catppuccin",
    primary: "oklch(0.55 0.25 297)",
  },
  {
    id: "nord",
    name: "Nord",
    primary: "oklch(0.78 0.10 200)",
  },
  {
    id: "doom-64",
    name: "Doom 64",
    primary: "oklch(0.50 0.19 27)",
  },
  {
    id: "cosmic-night",
    name: "Cosmic Night",
    primary: "oklch(0.54 0.18 288)",
  },
  {
    id: "northern-lights",
    name: "Northern Lights",
    primary: "oklch(0.65 0.15 150)",
  },
  {
    id: "violet-bloom",
    name: "Violet Bloom",
    primary: "oklch(0.61 0.23 292)",
  },
  {
    id: "graphite",
    name: "Graphite",
    primary: "oklch(0.49 0 0)",
  },
  {
    id: "dracula",
    name: "Dracula",
    primary: "oklch(0.72 0.18 285)",
  },
  {
    id: "solarized",
    name: "Solarized",
    primary: "oklch(0.68 0.12 195)",
  },
  {
    id: "catppuccin-latte",
    name: "Catppuccin Latte",
    primary: "oklch(0.60 0.18 330)",
  },
  {
    id: "catppuccin-frappe",
    name: "Catppuccin Frappe",
    primary: "oklch(0.72 0.15 285)",
  },
  {
    id: "catppuccin-macchiato",
    name: "Catppuccin Macchiato",
    primary: "oklch(0.68 0.18 290)",
  },
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    primary: "oklch(0.65 0.20 290)",
  },
] as const;

export type ColorTheme = (typeof THEMES)[number]["id"];
