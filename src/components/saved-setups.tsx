"use client";

import { NativeSelect } from "@/components/ui/native-select";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSavedSetups } from "@/hooks/use-saved-setups";
import type { CalculatorWorkload } from "@/lib/calculator-workload";
import { applySavedSetup, savedSetupMatches, savedViewSummary, MAX_SETUP_BACKUP_SIZE, MAX_SETUP_NAME_LENGTH, MAX_SAVED_SETUPS, SETUP_BACKUP_TOO_LARGE, type DeletedSavedSetup } from "@/lib/saved-setups";
import { workloadSummary } from "@/lib/workload-summary";

export interface SavedSetupsProps {
  workload: CalculatorWorkload;
  onWorkloadChange: (workload: CalculatorWorkload) => void | Promise<unknown>;
  directoryQuery?: string | URLSearchParams;
  onApplyDirectoryQuery?: (query: URLSearchParams) => void | Promise<unknown>;
}

export function SavedSetups({ workload, onWorkloadChange, directoryQuery, onApplyDirectoryQuery }: SavedSetupsProps) {
  const id = useId();
  const { setups, hasUnreadableStorage, recoverySource, saveSetup, renameSetup, updateSetup, deleteSetup, restoreSetup, importBackup, exportBackup, recoverSetups } = useSavedSetups();
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [activeId, setActiveId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const [importing, setImporting] = useState(false);
  const [mutating, setMutating] = useState(false);
  const pendingMutation = useRef(false);
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [deleted, setDeleted] = useState<DeletedSavedSetup | null>(null);
  const [recoveryPreview, setRecoveryPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const selected = setups.find((setup) => setup.id === selectedId);
  const includesView = Boolean(onApplyDirectoryQuery);
  const busy = applying || importing || mutating;
  const updatesView = includesView && Boolean(selected?.includesDirectoryView);
  const currentQuery = () => includesView ? directoryQuery ?? window.location.search : undefined;
  const active = setups.find((setup) => setup.id === activeId);
  const changed = active ? !savedSetupMatches(active, workload, currentQuery()) : false;

  function fail(reason: string): never {
    setError(reason);
    throw new Error(reason);
  }

  async function runMutation(action: () => Promise<void>): Promise<void> {
    if (pendingMutation.current) throw new Error("A saved setup change is already running.");
    pendingMutation.current = true;
    setMutating(true);
    setMessage("");
    setError("");
    try {
      await action();
    } finally {
      pendingMutation.current = false;
      setMutating(false);
    }
  }

  const save = () => runMutation(async () => {
    const result = await saveSetup(name, workload, currentQuery());
    if (!result.ok) fail(result.error);
    setName("");
    setSelectedId(result.setup.id);
    setActiveId(result.setup.id);
    setRenaming(false);
    setMessage(`Saved “${result.setup.name}”.`);
  });

  async function apply() {
    if (!selected) fail("Choose a saved setup to apply.");
    setMessage("");
    setError("");
    setApplying(true);
    try {
      await applySavedSetup(selected, onWorkloadChange, onApplyDirectoryQuery);
      setActiveId(selected.id);
      setMessage(`Applied “${selected.name}”.`);
    } catch {
      fail("Could not apply the saved view. Try applying it again.");
    } finally {
      setApplying(false);
    }
  }

  const remove = () => runMutation(async () => {
    if (!selected) fail("Choose a saved setup to delete.");
    const result = await deleteSetup(selected.id);
    if (!result.ok) fail(result.error);
    setSelectedId("");
    setRenaming(false);
    setDeleted(result.deleted);
    setMessage(`Deleted “${selected.name}”.`);
  });

  const undo = () => runMutation(async () => {
    if (!deleted) fail("There is no deletion to undo.");
    const result = await restoreSetup(deleted);
    if (!result.ok) fail(result.error);
    setSelectedId(result.setup.id);
    setDeleted(null);
    setRenaming(false);
    setMessage(`Restored “${result.setup.name}”.`);
  });

  const rename = () => runMutation(async () => {
    if (!selected) fail("Choose a saved setup to rename.");
    const result = await renameSetup(selected.id, renameName);
    if (!result.ok) fail(result.error);
    setRenaming(false);
    setMessage(`Renamed setup to “${result.setup.name}”.`);
  });

  const update = () => runMutation(async () => {
    if (!selected) fail("Choose a saved setup to update.");
    const result = await updateSetup(selected.id, workload, currentQuery());
    if (!result.ok) fail(result.error);
    setMessage(`Updated “${result.setup.name}” with the current workload${updatesView ? " and view" : ""}.`);
    setActiveId(selected.id);
  });

  const recover = (original: string) => runMutation(async () => {
    const result = await recoverSetups(original);
    setRecoveryPreview(null);
    if (!result.ok) fail(result.error);
    setMessage(`Recovered ${result.count} saved ${result.count === 1 ? "setup" : "setups"}.`);
  });

  function downloadBackup(mode: "structured" | "recovery") {
    setMessage("");
    const result = exportBackup(mode);
    if (!result.ok) fail(result.error);
    let url: string | undefined;
    let link: HTMLAnchorElement | undefined;
    try {
      url = URL.createObjectURL(new Blob([result.backup], { type: "application/json" }));
      link = document.createElement("a");
      link.href = url;
      link.download = mode === "recovery" ? "kilo-models-setups-recovery.json" : "kilo-models-setups.json";
      document.body.appendChild(link);
      link.click();
      setError("");
      setMessage(mode === "recovery" ? "Original data download started." : "Backup download started.");
    } catch {
      fail("Could not start the backup download. Try exporting again.");
    } finally {
      link?.remove();
      if (url) { const downloadUrl = url; setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000); }
    }
  }

  async function readBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setMessage("");
    setError("");
    if (file.size > MAX_SETUP_BACKUP_SIZE) { setError(SETUP_BACKUP_TOO_LARGE); return; }
    setImporting(true);
    try {
      const result = await importBackup(await file.text());
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
      {hasUnreadableStorage && <p data-agent-catalog="Saved setup recovery" className="text-xs text-destructive">Some saved setup data could not be read. Download the original data or review recovery in Manage setups.</p>}
      <form onSubmit={(event) => { event.preventDefault(); if (!busy) void save().catch(() => {}); }} className="space-y-2">
        <label htmlFor={`${id}-name`} className="text-sm text-muted-foreground">Setup name</label>
        <div className="flex flex-wrap gap-2">
          <Input id={`${id}-name`} value={name} onValueChange={setName} maxLength={MAX_SETUP_NAME_LENGTH}
            placeholder="e.g. Cheap coding models" className="h-11 min-w-0 flex-1 basis-48" />
          <Button type="submit" variant="outline" className="h-11" disabled={!name.trim() || busy} onClick={(event) => { event.preventDefault(); return save(); }}>Save setup</Button>
        </div>
      </form>
      {setups.length > 0 ? (
        <div className="space-y-2">
          <label htmlFor={`${id}-saved`} className="text-sm text-muted-foreground">Saved setup</label>
          <div className="flex flex-wrap gap-2">
            <NativeSelect id={`${id}-saved`} value={selected?.id ?? ""} disabled={busy}
              items={[{ value: "", label: "Choose a setup" }, ...setups.map((setup) => ({
                value: setup.id, label: `${setup.name} · ${setup.includesDirectoryView ? "Workload + view" : "Workload only"}`,
              }))]}
              onValueChange={(value) => { setSelectedId(value); setRenaming(false); }}
              className="h-11 min-w-0 flex-1 basis-48 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring" />
            <Button type="button" variant="outline" className="h-11" onClick={apply} disabled={!selected || busy}>{applying ? "Applying…" : "Apply"}</Button>
          </div>
        </div>
      ) : <p className="text-xs text-muted-foreground">No saved setups yet. Name this {includesView ? "workload and filter view" : "workload"} to reuse it later.</p>}
      {selected && <p className="text-xs text-muted-foreground">{updatesView ? "Applies workload and filters. Keeps your comparison." : "Applies workload only. Keeps your current filters and comparison."}</p>}
      {selected && <div data-agent-catalog="Saved setup preview" className="space-y-1 text-xs leading-relaxed text-muted-foreground">
        <p>Preview: {workloadSummary(selected.workload)}</p>
        {updatesView && <p>Saved view: {savedViewSummary(selected.directoryQuery)}</p>}
      </div>}
      {active && <p data-agent-catalog="Active saved setup" className="text-xs text-muted-foreground">{changed ? `Changed since applying ${active.name}.` : `Active setup: ${active.name}`}</p>}
      <details className="border-t pt-2">
        <DisclosureSummary className="min-h-11 cursor-pointer rounded py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">Manage setups</DisclosureSummary>
        <div className="space-y-3 pt-2">
          {setups.length > 0 && <>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Manage selected setup">
              <Button type="button" variant="outline" className="h-11" onClick={update} disabled={!selected || busy}>{updatesView ? "Update workload & view" : "Update workload"}</Button>
              <Button type="button" variant="ghost" className="h-11" disabled={!selected || busy} onClick={() => { if (selected) { setRenameName(selected.name); setRenaming(true); setError(""); } }}>Rename</Button>
              <Button type="button" variant="ghost" className="h-11" onClick={remove} disabled={!selected || busy}
                aria-label={selected ? `Delete ${selected.name}` : "Delete saved setup"}>Delete</Button>
            </div>
            {selected && renaming && <form onSubmit={(event) => { event.preventDefault(); if (!busy) void rename().catch(() => {}); }} className="space-y-2 pt-2">
              <label htmlFor={`${id}-rename`} className="text-sm text-muted-foreground">New name for {selected.name}</label>
              <div className="flex flex-wrap gap-2">
                <Input id={`${id}-rename`} value={renameName} onValueChange={setRenameName} maxLength={MAX_SETUP_NAME_LENGTH} autoFocus className="h-11 min-w-0 flex-1 basis-48" />
                <Button type="submit" variant="outline" className="h-11" disabled={!renameName.trim() || busy} onClick={(event) => { event.preventDefault(); return rename(); }}>Save name</Button>
                <Button type="button" variant="ghost" className="h-11" disabled={busy} onClick={() => { setRenaming(false); setError(""); }}>Cancel</Button>
              </div>
            </form>}
          </>}
          {selected && <p className="text-xs text-muted-foreground">Update replaces this setup’s saved workload{updatesView ? " and directory view" : ""} with current values.{!includesView && selected.includesDirectoryView ? " Its saved directory view is kept." : ""}</p>}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => downloadBackup("structured")} disabled={(!hasUnreadableStorage && setups.length === 0) || busy}>Export backup</Button>
              {hasUnreadableStorage && <Button type="button" variant="outline" className="h-11" onClick={() => downloadBackup("recovery")} disabled={busy}>Download original data</Button>}
              {recoverySource !== null && <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={(_event, details) => {
                if (details.source === "agent") fail("Setup recovery needs your confirmation in Manage setups.");
                setRecoveryPreview(recoverySource);
              }}>Review setup recovery</Button>}
              <Button type="button" variant="outline" className="h-11" onClick={(_event, details) => {
                if (details.source === "agent") fail("Import backup needs a person to choose a file. Open Manage setups and use Import backup directly.");
                fileInput.current?.click();
              }} disabled={busy}>{importing ? "Importing…" : "Import backup"}</Button>
              <input ref={fileInput} type="file" accept=".json,application/json" aria-label="Choose a saved-setups JSON backup" onChange={readBackup} hidden />
            </div>
            {recoverySource !== null && recoveryPreview !== null && <div className="space-y-2 rounded-lg border p-3" role="group" aria-label="Confirm saved setup recovery">
              <p className="text-xs leading-relaxed text-muted-foreground">{recoverySource === recoveryPreview
                ? `Keep ${setups.length} readable ${setups.length === 1 ? "setup" : "setups"} and discard unreadable records or filters. Download the original data before confirming if you need a copy.`
                : "Saved setup data changed. Review recovery again before confirming."}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="destructive" className="h-11" disabled={busy || recoverySource !== recoveryPreview} onClick={(_event, details) => {
                  if (details.source === "agent") fail("Confirm setup recovery directly in Manage setups.");
                  return recover(recoveryPreview);
                }}>Confirm recovery</Button>
                <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={() => setRecoveryPreview(null)}>Cancel recovery</Button>
              </div>
            </div>}
            <p className="text-xs text-muted-foreground">Import keeps existing setups and skips duplicates. JSON backups can be up to {MAX_SETUP_BACKUP_SIZE / 1000} KB.</p>
          </div>
        </div>
      </details>
      {deleted && <div className="flex flex-wrap items-center gap-2">
        <p className="break-words text-xs text-muted-foreground">Last deleted: {deleted.setup.name}</p>
        <Button type="button" variant="outline" className="h-11" onClick={undo} disabled={busy} aria-label={`Undo deletion of ${deleted.setup.name}`}>Undo delete</Button>
      </div>}
      {error && <p role="alert" data-agent-catalog="Saved setup error" className="text-sm text-destructive">{error}</p>}
      <p role="status" aria-live="polite" data-agent-catalog={message ? "Saved setup status" : undefined}
        className={message ? "text-sm text-muted-foreground" : "sr-only"}>{message}</p>
    </section>
  );
}
