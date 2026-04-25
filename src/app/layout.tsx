import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Instrument_Serif, DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { THEMES } from "@/lib/themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kilo Models | AI Model Directory",
  description:
    "Browse and compare 300+ AI models from the Kilo network. Filter by modality, pricing, context length, and more.",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤖</text></svg>",
        type: "image/svg+xml",
      },
    ],
  },
};

// Inline script that runs before paint to apply the saved color theme class,
// preventing a flash of the default theme on first load.
const colorThemeScript = `
(function() {
  var validThemes = [${THEMES.map((t) => `'${t.id}'`).join(",")}];
  try {
    var stored = localStorage.getItem('kilo-color-theme');
    var theme = stored && validThemes.indexOf(stored) !== -1 ? stored : 'modern-minimal';
  } catch (e) {
    var theme = 'modern-minimal';
  }
  document.documentElement.classList.add(theme);
})();
`.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: colorThemeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${dmSans.variable} font-sans antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          <TooltipProvider delay={300}>
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

