import { WORKLOAD_QUERY_KEYS, type CalculatorWorkload } from "./calculator-workload";
import { parseNumericFilter } from "./model-filtering";

export const SAVED_SETUPS_STORAGE_KEY = "kilo-models-saved-setups";
export const MAX_SAVED_SETUPS = 20;
export const MAX_SETUP_NAME_LENGTH = 60;
export const MAX_SETUP_BACKUP_SIZE = 200_000;
const BACKUP_FORMAT = "kilo-models-saved-setups";

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

/** Compare effective settings, ignoring pagination and explicit default values. */
export function savedSetupMatches(setup: SavedSetup, workload: CalculatorWorkload, query?: string | URLSearchParams): boolean {
  if (WORKLOAD_QUERY_KEYS.some((key) => workload[key] !== setup.workload[key])) return false;
  if (!setup.includesDirectoryView || query === undefined) return true;
  const canonical = (source: string | URLSearchParams) => {
    const params = sanitizeSavedSetupQuery(source);
    for (const [key, value] of [...params.entries()]) {
      if (!value || (booleans.includes(key) && value === "false") || (key === "view" && value === "grid") || (key === "sort" && value === "name-asc")) params.delete(key);
      else if (["providers", "inputModalities", "outputModalities"].includes(key)) params.set(key, [...new Set(value.split(","))].sort().join(","));
      else if (["minContext", "maxInputPrice", "maxOutputPrice", "maxBudget"].includes(key)) params.set(key, String(Number(value)));
    }
    params.sort();
    return params.toString();
  };
  return canonical(setup.directoryQuery) === canonical(query);
}

export function savedViewSummary(query: string): string {
  const params = sanitizeSavedSetupQuery(query);
  const labels: Record<string, string> = { free: "Free only", hideRetired: "Hide retired", reasoning: "Reasoning", tools: "Tool calling", fav: "Favorites", fitsWorkload: "Fits workload" };
  const sorts: Record<string, string> = { "name-asc": "Name A–Z", "name-desc": "Name Z–A", "price-asc": "Lowest input price", "price-desc": "Highest input price", "cost-asc": "Lowest estimated cost", "cost-desc": "Highest estimated cost", "context-desc": "Largest context", "created-desc": "Newest first", "created-asc": "Oldest first" };
  return Array.from(params, ([key, value]) => {
    if (labels[key]) return value === "true" ? labels[key] : "";
    if (key === "search") return value ? `Search: ${value}` : "";
    if (key === "sort") return `Sort: ${sorts[value]}`;
    if (key === "view") return value === "list" ? "List view" : "";
    if (key === "providers") return value ? `Providers: ${value.split(",").join(", ")}` : "";
    if (key === "inputModalities" || key === "outputModalities") return value ? `${key === "inputModalities" ? "Input" : "Output"} types: ${value.split(",").join(", ")}` : "";
    if (key === "minContext") return `Context ≥ ${Number(value).toLocaleString("en-US")} tokens`;
    if (key === "maxBudget") return `Total budget ≤ $${value}`;
    if (key === "maxInputPrice" || key === "maxOutputPrice") return `${key === "maxInputPrice" ? "Input" : "Output"} ≤ $${value}/1M tokens`;
    return "";
  }).filter(Boolean).join(" · ") || "Default search, filters, and view";
}

export const SAVED_SETUP_QUERY_KEYS = [
  "search", "sort", "free", "hideRetired", "inputModalities", "outputModalities",
  "providers", "reasoning", "tools", "view", "fav", "minContext", "maxInputPrice", "maxOutputPrice",
  "fitsWorkload", "maxBudget",
] as const;

const booleans: readonly string[] = ["free", "hideRetired", "reasoning", "tools", "fav", "fitsWorkload"];
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
    if (["minContext", "maxInputPrice", "maxOutputPrice", "maxBudget"].includes(key)) {
      if (parseNumericFilter(value, key === "minContext") === null) continue;
    }
    if (key === "search" && value.length > 512) continue;
    result.set(key, value);
    if (result.toString().length > 16_000) result.delete(key);
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
  if (!stored || stored.length > MAX_SETUP_BACKUP_SIZE) return [];
  try {
    const payload: unknown = JSON.parse(stored);
    const entries = Array.isArray(payload) ? payload :
      typeof payload === "object" && payload !== null && "version" in payload && payload.version === 1 && "setups" in payload ? payload.setups : null;
    if (!Array.isArray(entries)) return [];
    const setups: SavedSetup[] = [];
    for (const entry of entries) {
      if (setups.length >= MAX_SAVED_SETUPS) break;
      const setup = parseSetupRecord(entry);
      if (!setup || setups.some((current) => current.id === setup.id || current.name.toLowerCase() === setup.name.toLowerCase())) continue;
      setups.push(setup);
    }
    return setups;
  } catch {
    return [];
  }
}

function parseSetupRecord(value: unknown): SavedSetup | null {
  if (typeof value !== "object" || value === null) return null;
  const entry = value as Record<string, unknown>;
  if (typeof entry.id !== "string" || !entry.id.trim() || entry.id.length > 128) return null;
  if (typeof entry.name !== "string" || !entry.name.trim() || entry.name.trim().length > MAX_SETUP_NAME_LENGTH) return null;
  if (typeof entry.directoryQuery !== "string" || entry.directoryQuery.length > 16_000) return null;
  if (entry.includesDirectoryView !== undefined && typeof entry.includesDirectoryView !== "boolean") return null;
  const workload = parseWorkload(entry.workload);
  if (!workload) return null;
  const includesDirectoryView = entry.includesDirectoryView ?? true;
  return { id: entry.id, name: entry.name.trim(), workload, includesDirectoryView, directoryQuery: includesDirectoryView ? sanitizeSavedSetupQuery(entry.directoryQuery).toString() : "" };
}

export function serializeSavedSetups(setups: SavedSetup[]): string {
  return JSON.stringify({ version: 1, setups });
}

export type SaveSetupResult = { ok: true; setups: SavedSetup[]; setup: SavedSetup } | { ok: false; error: string };

function nameError(setups: SavedSetup[], name: string, exceptId?: string): string | null {
  if (!name) return "Enter a name for this setup.";
  if (name.length > MAX_SETUP_NAME_LENGTH) return `Use ${MAX_SETUP_NAME_LENGTH} characters or fewer for the setup name.`;
  if (setups.some((setup) => setup.id !== exceptId && setup.name.toLowerCase() === name.toLowerCase())) return "A setup already has this name. Choose a different name.";
  return null;
}

export function addSavedSetup(setups: SavedSetup[], name: string, workload: CalculatorWorkload & Partial<SavedSetupWorkload>, directoryQuery: string | URLSearchParams | undefined, id: string): SaveSetupResult {
  const trimmedName = name.trim();
  const error = nameError(setups, trimmedName);
  if (error) return { ok: false, error };
  if (setups.length >= MAX_SAVED_SETUPS) return { ok: false, error: `You have ${MAX_SAVED_SETUPS} saved setups. Delete one before saving another.` };
  const normalizedWorkload = parseWorkload(workload);
  if (!normalizedWorkload) return { ok: false, error: "This workload contains an invalid value. Check the calculator inputs." };
  if (!id.trim() || id.length > 128 || setups.some((setup) => setup.id === id)) return { ok: false, error: "Could not create a setup. Try saving again." };
  const includesDirectoryView = directoryQuery !== undefined;
  const setup = { id, name: trimmedName, workload: normalizedWorkload, includesDirectoryView, directoryQuery: includesDirectoryView ? sanitizeSavedSetupQuery(directoryQuery).toString() : "" };
  return { ok: true, setups: [...setups, setup], setup };
}

export function renameSavedSetup(setups: SavedSetup[], id: string, name: string): SaveSetupResult {
  const current = setups.find((setup) => setup.id === id);
  if (!current) return { ok: false, error: "This setup is no longer saved. Choose another setup." };
  const trimmedName = name.trim();
  const error = nameError(setups, trimmedName, id);
  if (error) return { ok: false, error };
  const setup = { ...current, name: trimmedName };
  return { ok: true, setups: setups.map((entry) => entry.id === id ? setup : entry), setup };
}

export function updateSavedSetup(setups: SavedSetup[], id: string, workload: CalculatorWorkload, directoryQuery?: string | URLSearchParams): SaveSetupResult {
  const current = setups.find((setup) => setup.id === id);
  if (!current) return { ok: false, error: "This setup is no longer saved. Choose another setup." };
  const normalizedWorkload = parseWorkload(workload);
  if (!normalizedWorkload) return { ok: false, error: "This workload contains an invalid value. Check the calculator inputs." };
  const setup = { ...current, workload: normalizedWorkload,
    directoryQuery: current.includesDirectoryView && directoryQuery !== undefined ? sanitizeSavedSetupQuery(directoryQuery).toString() : current.directoryQuery };
  return { ok: true, setups: setups.map((entry) => entry.id === id ? setup : entry), setup };
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
    const serialized = serializeSavedSetups(setups);
    if (serialized.length > MAX_SETUP_BACKUP_SIZE) return { ok: false, error: "These setups contain too much data. Shorten saved filters or delete a setup, then try again." };
    storage.setItem(SAVED_SETUPS_STORAGE_KEY, serialized);
    return { ok: true };
  } catch {
    return { ok: false, error: "Browser storage is unavailable or full. Allow storage or free space, then try again." };
  }
}

export function deleteSavedSetup(setups: SavedSetup[], id: string): SavedSetup[] {
  return setups.filter((setup) => setup.id !== id);
}

export interface DeletedSavedSetup {
  setup: SavedSetup;
  index: number;
}

export function restoreDeletedSetup(setups: SavedSetup[], deleted: DeletedSavedSetup): SaveSetupResult {
  if (setups.length >= MAX_SAVED_SETUPS) return { ok: false, error: `You have ${MAX_SAVED_SETUPS} saved setups. Delete one before undoing this deletion.` };
  if (setups.some((setup) => setup.id === deleted.setup.id || setup.name.toLowerCase() === deleted.setup.name.toLowerCase())) {
    return { ok: false, error: "A saved setup now uses this name or ID. Rename or delete the conflicting setup, then try Undo again." };
  }
  const next = [...setups];
  next.splice(Math.max(0, Math.min(Number.isSafeInteger(deleted.index) ? deleted.index : next.length, next.length)), 0, deleted.setup);
  return { ok: true, setups: next, setup: deleted.setup };
}

export function exportSavedSetupsBackup(setups: SavedSetup[]): string {
  if (setups.length > MAX_SAVED_SETUPS || setups.some((setup) => !parseSetupRecord(setup))) throw new Error("Saved setups contain invalid data. Reload before exporting.");
  const backup = JSON.stringify({ format: BACKUP_FORMAT, version: 1, setups }, null, 2);
  if (new TextEncoder().encode(backup).length > MAX_SETUP_BACKUP_SIZE) throw new Error("This backup is too large. Shorten saved filters before exporting.");
  return backup;
}

export type ImportSetupResult = { ok: true; setups: SavedSetup[]; imported: number; duplicates: number; overCapacity: number } | { ok: false; error: string };

/** Merge only; existing setup IDs and names always win. Invalid backups never produce a partial write. */
export function importSavedSetupsBackup(setups: SavedSetup[], backup: string): ImportSetupResult {
  if (backup.length > MAX_SETUP_BACKUP_SIZE || new TextEncoder().encode(backup).length > MAX_SETUP_BACKUP_SIZE) return { ok: false, error: "Backup is too large. Choose a JSON backup under 200 KB." };
  let payload: unknown;
  try { payload = JSON.parse(backup.trim()); } catch { return { ok: false, error: "This file is not valid JSON. Choose a saved-setups backup." }; }
  if (typeof payload !== "object" || payload === null || !("format" in payload) || payload.format !== BACKUP_FORMAT || !("version" in payload) || payload.version !== 1 || !("setups" in payload) || !Array.isArray(payload.setups)) {
    return { ok: false, error: "This is not a supported saved-setups backup (version 1)." };
  }
  if (payload.setups.length > MAX_SAVED_SETUPS) return { ok: false, error: `A backup can contain at most ${MAX_SAVED_SETUPS} setups.` };
  const incoming: SavedSetup[] = [];
  for (const [index, entry] of payload.setups.entries()) {
    const setup = parseSetupRecord(entry);
    if (!setup) return { ok: false, error: `Setup ${index + 1} in this backup has invalid data. Nothing was imported.` };
    incoming.push(setup);
  }
  const next = [...setups];
  let imported = 0, duplicates = 0, overCapacity = 0;
  for (const setup of incoming) {
    if (next.some((current) => current.id === setup.id || current.name.toLowerCase() === setup.name.toLowerCase())) { duplicates++; continue; }
    if (next.length >= MAX_SAVED_SETUPS) { overCapacity++; continue; }
    next.push(setup);
    imported++;
  }
  return { ok: true, setups: next, imported, duplicates, overCapacity };
}
