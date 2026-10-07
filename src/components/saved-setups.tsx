"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSavedSetups } from "@/hooks/use-saved-setups";
import type { CalculatorWorkload } from "@/lib/calculator-workload";
import { applySavedSetup, savedSetupMatches, savedViewSummary, MAX_SETUP_BACKUP_SIZE, MAX_SETUP_NAME_LENGTH, MAX_SAVED_SETUPS, type DeletedSavedSetup } from "@/lib/saved-setups";
import { workloadSummary } from "@/lib/workload-summary";

export interface SavedSetupsProps {
  workload: CalculatorWorkload;
  onWorkloadChange: (workload: CalculatorWorkload) => void;
  directoryQuery?: string | URLSearchParams;
  onApplyDirectoryQuery?: (query: URLSearchParams) => void | Promise<unknown>;
}

export function SavedSetups({ workload, onWorkloadChange, directoryQuery, onApplyDirectoryQuery }: SavedSetupsProps) {
  const id = useId();
  const { setups, saveSetup, renameSetup, updateSetup, deleteSetup, restoreSetup, importBackup, exportBackup } = useSavedSetups();
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [activeId, setActiveId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const [importing, setImporting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [deleted, setDeleted] = useState<DeletedSavedSetup | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const selected = setups.find((setup) => setup.id === selectedId);
  const includesView = Boolean(onApplyDirectoryQuery);
  const busy = applying || importing;
  const updatesView = includesView && Boolean(selected?.includesDirectoryView);
  const currentQuery = () => includesView ? directoryQuery ?? window.location.search : undefined;
  const active = setups.find((setup) => setup.id === activeId);
  const changed = active ? !savedSetupMatches(active, workload, currentQuery()) : false;

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const result = saveSetup(name, workload, currentQuery());
    if (!result.ok) { setError(result.error); return; }
    setError("");
    setName("");
    setSelectedId(result.setup.id);
    setActiveId(result.setup.id);
    setRenaming(false);
    setMessage(`Saved “${result.setup.name}”.`);
  }

  async function apply() {
    if (!selected) return;
    setMessage("");
    setError("");
    setApplying(true);
    try {
      await applySavedSetup(selected, onWorkloadChange, onApplyDirectoryQuery);
      setActiveId(selected.id);
      setMessage(`Applied “${selected.name}”.`);
    } catch {
      setError("Could not apply the saved view. Try applying it again.");
    } finally {
      setApplying(false);
    }
  }

  function remove() {
    if (!selected) return;
    setMessage("");
    const result = deleteSetup(selected.id);
    if (!result.ok) { setError(result.error); return; }
    setError("");
    setSelectedId("");
    setRenaming(false);
    setDeleted(result.deleted);
    setMessage(`Deleted “${selected.name}”.`);
  }

  function undo() {
    if (!deleted) return;
    setMessage("");
    const result = restoreSetup(deleted);
    if (!result.ok) { setError(result.error); return; }
    setError("");
    setSelectedId(result.setup.id);
    setDeleted(null);
    setRenaming(false);
    setMessage(`Restored “${result.setup.name}”.`);
  }

  function rename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setMessage("");
    const result = renameSetup(selected.id, renameName);
    if (!result.ok) { setError(result.error); return; }
    setError("");
    setRenaming(false);
    setMessage(`Renamed setup to “${result.setup.name}”.`);
  }

  function update() {
    if (!selected) return;
    setMessage("");
    const result = updateSetup(selected.id, workload, currentQuery());
    if (!result.ok) { setError(result.error); return; }
    setError("");
    setMessage(`Updated “${result.setup.name}” with the current workload${updatesView ? " and view" : ""}.`);
    setActiveId(selected.id);
  }

  function downloadBackup() {
    setMessage("");
    const result = exportBackup();
    if (!result.ok) { setError(result.error); return; }
    let url: string | undefined;
    try {
      url = URL.createObjectURL(new Blob([result.backup], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "kilo-models-setups.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setError("");
      setMessage("Backup download started.");
    } catch {
      setError("Could not start the backup download. Try exporting again.");
    } finally {
      if (url) { const downloadUrl = url; setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000); }
    }
  }

  async function readBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setMessage("");
    setError("");
    if (file.size > MAX_SETUP_BACKUP_SIZE) { setError("Backup is too large. Choose a JSON backup under 200 KB."); return; }
    setImporting(true);
    try {
      const result = importBackup(await file.text());
      if (!result.ok) { setError(result.error); return; }
      setMessage(`Imported ${result.imported} ${result.imported === 1 ? "setup" : "setups"}. Skipped ${result.duplicates} duplicate ${result.duplicates === 1 ? "name or ID" : "names or IDs"} and ${result.overCapacity} beyond the ${MAX_SAVED_SETUPS}-setup limit. Existing setups were kept.`);
    } catch {
      setError("Could not read this backup file. Choose a readable JSON file and try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id={`${id}-heading`} className="text-sm font-medium">Saved setups</h3>
        <p className="text-xs text-muted-foreground">Saved in this browser · {setups.length}/{MAX_SAVED_SETUPS}</p>
      </div>
      <form onSubmit={save} className="space-y-2">
        <label htmlFor={`${id}-name`} className="text-sm text-muted-foreground">Setup name</label>
        <div className="flex flex-wrap gap-2">
          <Input id={`${id}-name`} value={name} onChange={(event) => setName(event.target.value)} maxLength={MAX_SETUP_NAME_LENGTH}
            placeholder="e.g. Cheap coding models" className="h-11 min-w-0 flex-1 basis-48" />
          <Button type="submit" variant="outline" className="h-11" disabled={!name.trim() || busy}>Save setup</Button>
        </div>
      </form>
      {setups.length > 0 ? (
        <div className="space-y-2">
          <label htmlFor={`${id}-saved`} className="text-sm text-muted-foreground">Saved setup</label>
          <div className="flex flex-wrap gap-2">
            <select id={`${id}-saved`} value={selected?.id ?? ""} onChange={(event) => { setSelectedId(event.target.value); setRenaming(false); }} disabled={busy}
              className="h-11 min-w-0 flex-1 basis-48 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring">
              <option value="">Choose a setup</option>
              {setups.map((setup) => <option key={setup.id} value={setup.id}>{setup.name} · {setup.includesDirectoryView ? "Workload + view" : "Workload only"}</option>)}
            </select>
            <Button type="button" variant="outline" className="h-11" onClick={apply} disabled={!selected || busy}>{applying ? "Applying…" : "Apply"}</Button>
          </div>
        </div>
      ) : <p className="text-xs text-muted-foreground">No saved setups yet. Name this {includesView ? "workload and filter view" : "workload"} to reuse it later.</p>}
      {selected && <p className="text-xs text-muted-foreground">{updatesView ? "Applies workload and filters. Keeps your comparison." : "Applies workload only. Keeps your current filters and comparison."}</p>}
      {selected && <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
        <p>Preview: {workloadSummary(selected.workload)}</p>
        {updatesView && <p>Saved view: {savedViewSummary(selected.directoryQuery)}</p>}
      </div>}
      {active && <p className="text-xs text-muted-foreground">{changed ? `Changed since applying ${active.name}.` : `Active setup: ${active.name}`}</p>}
      <details className="border-t pt-2">
        <summary className="min-h-11 cursor-pointer rounded py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">Manage setups</summary>
        <div className="space-y-3 pt-2">
          {setups.length > 0 && <>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Manage selected setup">
              <Button type="button" variant="outline" className="h-11" onClick={update} disabled={!selected || busy}>{updatesView ? "Update workload & view" : "Update workload"}</Button>
              <Button type="button" variant="ghost" className="h-11" disabled={!selected || busy} onClick={() => { if (selected) { setRenameName(selected.name); setRenaming(true); setError(""); } }}>Rename</Button>
              <Button type="button" variant="ghost" className="h-11" onClick={remove} disabled={!selected || busy}
                aria-label={selected ? `Delete ${selected.name}` : "Delete saved setup"}>Delete</Button>
            </div>
            {selected && renaming && <form onSubmit={rename} className="space-y-2 pt-2">
              <label htmlFor={`${id}-rename`} className="text-sm text-muted-foreground">New name for {selected.name}</label>
              <div className="flex flex-wrap gap-2">
                <Input id={`${id}-rename`} value={renameName} onChange={(event) => setRenameName(event.target.value)} maxLength={MAX_SETUP_NAME_LENGTH} autoFocus className="h-11 min-w-0 flex-1 basis-48" />
                <Button type="submit" variant="outline" className="h-11" disabled={!renameName.trim() || busy}>Save name</Button>
                <Button type="button" variant="ghost" className="h-11" disabled={busy} onClick={() => { setRenaming(false); setError(""); }}>Cancel</Button>
              </div>
            </form>}
          </>}
          {selected && <p className="text-xs text-muted-foreground">Update replaces this setup’s saved workload{updatesView ? " and directory view" : ""} with current values.{!includesView && selected.includesDirectoryView ? " Its saved directory view is kept." : ""}</p>}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={downloadBackup} disabled={setups.length === 0 || busy}>Export backup</Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => fileInput.current?.click()} disabled={busy}>{importing ? "Importing…" : "Import backup"}</Button>
              <input ref={fileInput} type="file" accept=".json,application/json" aria-label="Choose a saved-setups JSON backup" onChange={readBackup} hidden />
            </div>
            <p className="text-xs text-muted-foreground">Import keeps existing setups and skips duplicates. JSON backups must be under 200 KB.</p>
          </div>
        </div>
      </details>
      {deleted && <div className="flex flex-wrap items-center gap-2">
        <p className="break-words text-xs text-muted-foreground">Last deleted: {deleted.setup.name}</p>
        <Button type="button" variant="outline" className="h-11" onClick={undo} disabled={busy} aria-label={`Undo deletion of ${deleted.setup.name}`}>Undo delete</Button>
      </div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <p role="status" aria-live="polite" className={message ? "text-sm text-muted-foreground" : "sr-only"}>{message}</p>
    </section>
  );
}
