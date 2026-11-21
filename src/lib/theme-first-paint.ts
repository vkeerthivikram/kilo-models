import { buildColorThemeVariables, DEFAULT_COLOR_THEME, getThemesForMode, type ThemeMode } from "./themes";

function variablesForMode(mode: ThemeMode) {
  return Object.fromEntries(getThemesForMode(mode).map(({ id }) => [id, buildColorThemeVariables(id, mode)]));
}

const modes = { light: variablesForMode("light"), dark: variablesForMode("dark") };
const declarations = (mode: ThemeMode) => Object.entries(modes[mode][DEFAULT_COLOR_THEME])
  .map(([key, value]) => `${key}:${value};`).join("") + `color-scheme:${mode};`;

export const defaultThemeCss = `:root{${declarations("light")}}:root.dark{${declarations("dark")}}@media(prefers-color-scheme:dark){:root:not(.light){${declarations("dark")}}}`;

// Derive both first-paint and interactive tokens from the same trusted palettes.
// The preferences are lookup keys, never inserted into the script or into CSS.
export const firstPaintThemeScript = `(()=>{try{
const theme=localStorage.getItem("kilo-color-theme");
if(!theme||theme===${JSON.stringify(DEFAULT_COLOR_THEME)})return;
const preference=localStorage.getItem("theme");
const mode=preference==="light"||preference==="dark"?preference:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
const themes=${JSON.stringify(modes).replaceAll("<", "\\u003c")}[mode];
if(!Object.hasOwn(themes,theme))return;
const root=document.documentElement;
for(const [key,value] of Object.entries(themes[theme]))root.style.setProperty(key,value);
root.dataset.kiloTheme=theme;
root.style.colorScheme=mode;
}catch{}})();`;
