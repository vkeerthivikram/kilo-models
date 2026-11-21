import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Instrument_Serif, DM_Sans } from "next/font/google";
import "./globals.css";
import { AgentTools } from "@/components/agent-tools";
import { QueryAdapter } from "@/components/query-adapter";
import { ThemeProvider } from "@/components/theme-provider";
import { defaultThemeCss, firstPaintThemeScript } from "@/lib/theme-first-paint";

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
    "Browse and compare 300+ AI models from the Kilo Gateway. Filter by modality, pricing, context length, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: defaultThemeCss }} />
        {/* Execute before body paint, rather than with the hydrated bundle. */}
        <script dangerouslySetInnerHTML={{ __html: firstPaintThemeScript }} />
      </head>
      <body
        className={`${geistMono.variable} ${instrumentSerif.variable} ${dmSans.variable} font-sans antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          <QueryAdapter>
            {children}
            <AgentTools />
          </QueryAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
