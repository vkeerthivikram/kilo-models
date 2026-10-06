"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

const RETURN_KEY = "kilo-models-directory-return";
const RESTORE_KEY = "kilo-models-directory-restore";
const DIRECTORY_ORIGIN = "https://directory.local";

interface DirectoryReturn {
  href: string;
  scrollY: number;
}

let memoryReturn: DirectoryReturn | null = null;
let memoryRestore = false;

export function safeDirectoryHref(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  try {
    const url = new URL(value, DIRECTORY_ORIGIN);
    return url.origin === DIRECTORY_ORIGIN && url.pathname === "/" ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}

export function parseDirectoryReturn(stored: string | null): DirectoryReturn | null {
  try {
    const value: unknown = stored ? JSON.parse(stored) : null;
    if (!value || typeof value !== "object" || !("href" in value) || !("scrollY" in value)) return null;
    const { href, scrollY } = value;
    if (typeof href !== "string" || safeDirectoryHref(href) !== href || typeof scrollY !== "number" || !Number.isFinite(scrollY) || scrollY < 0) return null;
    return { href, scrollY };
  } catch {
    return null;
  }
}

function readDirectoryReturn(): DirectoryReturn | null {
  if (typeof window === "undefined") return null;
  try {
    return parseDirectoryReturn(window.sessionStorage.getItem(RETURN_KEY)) ?? memoryReturn;
  } catch {
    return memoryReturn;
  }
}

export function getDirectoryReturnHref(): string {
  const url = new URL(readDirectoryReturn()?.href ?? "/", DIRECTORY_ORIGIN);
  // Saved comparison IDs must not override a selection edited on the detail page.
  url.searchParams.delete("compare");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function rememberDirectoryPosition(): void {
  if (typeof window === "undefined" || window.location.pathname !== "/") return;
  memoryReturn = { href: safeDirectoryHref(`${window.location.pathname}${window.location.search}${window.location.hash}`), scrollY: Math.max(0, window.scrollY) };
  memoryRestore = false;
  try {
    window.sessionStorage.setItem(RETURN_KEY, JSON.stringify(memoryReturn));
    window.sessionStorage.removeItem(RESTORE_KEY);
  } catch {
    // The in-memory return path still works if browser storage is unavailable.
  }
}

export function prepareDirectoryReturn(): void {
  if (typeof window === "undefined") return;
  memoryRestore = true;
  try {
    window.sessionStorage.setItem(RESTORE_KEY, "true");
  } catch {
    // The current visit can restore without browser storage.
  }
}

export function restoreDirectoryPosition(): () => void {
  if (typeof window === "undefined") return () => {};
  const saved = readDirectoryReturn();
  let requested = memoryRestore;
  try {
    requested ||= window.sessionStorage.getItem(RESTORE_KEY) === "true";
  } catch {}
  if (!saved || !requested || window.location.pathname !== "/") return () => {};

  const expected = new URL(saved.href, DIRECTORY_ORIGIN);
  const actual = new URL(window.location.href);
  // Comparison links may add a compare query while retaining the directory filters.
  expected.searchParams.delete("compare");
  actual.searchParams.delete("compare");
  expected.searchParams.sort();
  actual.searchParams.sort();
  if (expected.search !== actual.search) return () => {};

  let frame = window.requestAnimationFrame(() => {
    frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: saved.scrollY, behavior: "instant" });
      memoryRestore = false;
      try {
        window.sessionStorage.removeItem(RESTORE_KEY);
      } catch {}
    });
  });
  return () => window.cancelAnimationFrame(frame);
}

export function useDirectoryScrollRestoration(ready: boolean): void {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  React.useEffect(() => {
    if (ready && pathname === "/") return restoreDirectoryPosition();
  }, [ready, pathname, search]);
}
