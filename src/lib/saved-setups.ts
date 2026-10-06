import type { CalculatorWorkload } from "./calculator-workload";

export const SAVED_SETUPS_STORAGE_KEY = "kilo-models-saved-setups";
export const MAX_SAVED_SETUPS = 20;
export const MAX_SETUP_NAME_LENGTH = 60;

export type SavedSetupWorkload = CalculatorWorkload & {
  images: number;
  searches: number;
  cacheWriteTokens: number;
};

export interface SavedSetup {
  id: string;
  name: string;
  workload: SavedSetupWorkload;
  directoryQuery: string;
  includesDirectoryView: boolean;
}

export const SAVED_SETUP_QUERY_KEYS = [
  "search", "sort", "free", "hideRetired", "inputModalities", "outputModalities",
  "providers", "reasoning", "tools", "view", "fav", "minContext", "maxInputPrice", "maxOutputPrice",
] as const;

const booleans: readonly string[] = ["free", "hideRetired", "reasoning", "tools", "fav"];
const sorts = ["name-asc", "name-desc", "price-asc", "price-desc", "cost-asc", "cost-desc", "context-desc", "created-desc", "created-asc"];

/** Capture directory state only. Comparison selections and pagination belong to the current session. */
export function sanitizeSavedSetupQuery(query: string | URLSearchParams): URLSearchParams {
  const source = new URLSearchParams(query);
  const result = new URLSearchParams();
  for (const key of SAVED_SETUP_QUERY_KEYS) {
    const value = source.get(key);
    if (value === null || value.length > 2000) continue;
    if (booleans.includes(key) && value !== "true" && value !== "false") continue;
    if (key === "sort" && !sorts.includes(value)) continue;
    if (key === "view" && value !== "grid" && value !== "list") continue;
    if (["minContext", "maxInputPrice", "maxOutputPrice"].includes(key)) {
      if (!/^\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) continue;
      if (key === "minContext" && !Number.isSafeInteger(Number(value))) continue;
    }
    if (key === "search" && value.length > 512) continue;
    result.set(key, value);
  }
  return result;
}

function parseWorkload(value: unknown): SavedSetupWorkload | null {
  if (typeof value !== "object" || value === null) return null;
  const data = value as Record<string, unknown>;
  const result: Record<string, number | string> = {};
  for (const key of ["inputTokens", "outputTokens", "requests", "images", "searches", "cacheWriteTokens"] as const) {
    const number = data[key] === undefined && ["images", "searches", "cacheWriteTokens"].includes(key) ? 0 : data[key];
    if (typeof number !== "number" || !Number.isSafeInteger(number) || number < (key === "requests" ? 1 : 0)) return null;
    result[key] = number;
  }
  if (data.period !== "batch" && data.period !== "month") return null;
  if (typeof data.cachePercent !== "number" || !Number.isFinite(data.cachePercent) || data.cachePercent < 0 || data.cachePercent > 100) return null;
  return { ...result, period: data.period, cachePercent: data.cachePercent } as SavedSetupWorkload;
}

export function parseSavedSetups(stored: string | null): SavedSetup[] {
  if (!stored || stored.length > 200_000) return [];
  try {
    const payload: unknown = JSON.parse(stored);
    const entries = Array.isArray(payload) ? payload :
      typeof payload === "object" && payload !== null && "version" in payload && payload.version === 1 && "setups" in payload ? payload.setups : null;
    if (!Array.isArray(entries)) return [];
    const setups: SavedSetup[] = [];
    for (const entry of entries) {
      if (setups.length >= MAX_SAVED_SETUPS) break;
      if (typeof entry !== "object" || entry === null) continue;
      if (typeof entry.id !== "string" || !entry.id.trim() || entry.id.length > 128) continue;
      if (typeof entry.name !== "string" || !entry.name.trim() || entry.name.trim().length > MAX_SETUP_NAME_LENGTH) continue;
      if (typeof entry.directoryQuery !== "string" || entry.directoryQuery.length > 16_000) continue;
      if (entry.includesDirectoryView !== undefined && typeof entry.includesDirectoryView !== "boolean") continue;
      const workload = parseWorkload(entry.workload);
      if (!workload || setups.some((setup) => setup.id === entry.id || setup.name.toLowerCase() === entry.name.trim().toLowerCase())) continue;
      const includesDirectoryView = entry.includesDirectoryView ?? true;
      setups.push({ id: entry.id, name: entry.name.trim(), workload, includesDirectoryView, directoryQuery: includesDirectoryView ? sanitizeSavedSetupQuery(entry.directoryQuery).toString() : "" });
    }
    return setups;
  } catch {
    return [];
  }
}

export function serializeSavedSetups(setups: SavedSetup[]): string {
  return JSON.stringify({ version: 1, setups });
}

export type SaveSetupResult = { ok: true; setups: SavedSetup[]; setup: SavedSetup } | { ok: false; error: string };

export function addSavedSetup(setups: SavedSetup[], name: string, workload: CalculatorWorkload & Partial<SavedSetupWorkload>, directoryQuery: string | URLSearchParams | undefined, id: string): SaveSetupResult {
  const trimmedName = name.trim();
  if (!trimmedName) return { ok: false, error: "Enter a name for this setup." };
  if (trimmedName.length > MAX_SETUP_NAME_LENGTH) return { ok: false, error: `Use ${MAX_SETUP_NAME_LENGTH} characters or fewer for the setup name.` };
  if (setups.some((setup) => setup.name.toLowerCase() === trimmedName.toLowerCase())) return { ok: false, error: "A setup already has this name. Choose a different name." };
  if (setups.length >= MAX_SAVED_SETUPS) return { ok: false, error: `You have ${MAX_SAVED_SETUPS} saved setups. Delete one before saving another.` };
  const normalizedWorkload = parseWorkload(workload);
  if (!normalizedWorkload) return { ok: false, error: "This workload contains an invalid value. Check the calculator inputs." };
  if (!id.trim() || id.length > 128 || setups.some((setup) => setup.id === id)) return { ok: false, error: "Could not create a setup. Try saving again." };
  const includesDirectoryView = directoryQuery !== undefined;
  const setup = { id, name: trimmedName, workload: normalizedWorkload, includesDirectoryView, directoryQuery: includesDirectoryView ? sanitizeSavedSetupQuery(directoryQuery).toString() : "" };
  return { ok: true, setups: [...setups, setup], setup };
}

export async function applySavedSetup(setup: SavedSetup, onWorkloadChange: (workload: CalculatorWorkload) => void, onApplyDirectoryQuery?: (query: URLSearchParams) => void | Promise<unknown>): Promise<void> {
  onWorkloadChange({ ...setup.workload });
  if (setup.includesDirectoryView) await onApplyDirectoryQuery?.(sanitizeSavedSetupQuery(setup.directoryQuery));
}

type SetupStorage = Pick<Storage, "getItem" | "setItem">;

export function readSavedSetups(storage: SetupStorage): SavedSetup[] {
  try {
    return parseSavedSetups(storage.getItem(SAVED_SETUPS_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function writeSavedSetups(storage: SetupStorage, setups: SavedSetup[]): { ok: true } | { ok: false; error: string } {
  try {
    storage.setItem(SAVED_SETUPS_STORAGE_KEY, serializeSavedSetups(setups));
    return { ok: true };
  } catch {
    return { ok: false, error: "Browser storage is unavailable or full. Allow storage or free space, then try again." };
  }
}

export function deleteSavedSetup(setups: SavedSetup[], id: string): SavedSetup[] {
  return setups.filter((setup) => setup.id !== id);
}
