"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSavedSetups } from "@/hooks/use-saved-setups";
import type { CalculatorWorkload } from "@/lib/calculator-workload";
import { applySavedSetup, MAX_SETUP_NAME_LENGTH, MAX_SAVED_SETUPS } from "@/lib/saved-setups";

export interface SavedSetupsProps {
  workload: CalculatorWorkload;
  onWorkloadChange: (workload: CalculatorWorkload) => void;
  directoryQuery?: string | URLSearchParams;
  onApplyDirectoryQuery?: (query: URLSearchParams) => void | Promise<unknown>;
}

export function SavedSetups({ workload, onWorkloadChange, directoryQuery, onApplyDirectoryQuery }: SavedSetupsProps) {
  const id = useId();
  const { setups, saveSetup, deleteSetup } = useSavedSetups();
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const selected = setups.find((setup) => setup.id === selectedId);
  const includesView = Boolean(onApplyDirectoryQuery);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const query = includesView ? directoryQuery ?? window.location.search : undefined;
    const result = saveSetup(name, workload, query);
    if (!result.ok) { setError(result.error); return; }
    setError("");
    setName("");
    setSelectedId(result.setup.id);
    setMessage(`Saved “${result.setup.name}”.`);
  }

  async function apply() {
    if (!selected) return;
    setMessage("");
    setError("");
    setApplying(true);
    try {
      await applySavedSetup(selected, onWorkloadChange, onApplyDirectoryQuery);
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
    setMessage(`Deleted “${selected.name}”.`);
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
          <Button type="submit" variant="outline" className="h-11" disabled={!name.trim() || applying}>Save setup</Button>
        </div>
      </form>
      {setups.length > 0 ? (
        <div className="space-y-2">
          <label htmlFor={`${id}-saved`} className="text-sm text-muted-foreground">Saved setup</label>
          <div className="flex flex-wrap gap-2">
            <select id={`${id}-saved`} value={selected?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)} disabled={applying}
              className="h-11 min-w-0 flex-1 basis-48 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring">
              <option value="">Choose a setup</option>
              {setups.map((setup) => <option key={setup.id} value={setup.id}>{setup.name} · {setup.includesDirectoryView ? "Workload + view" : "Workload only"}</option>)}
            </select>
            <Button type="button" variant="outline" className="h-11" onClick={apply} disabled={!selected || applying}>{applying ? "Applying…" : "Apply"}</Button>
            <Button type="button" variant="ghost" className="h-11" onClick={remove} disabled={!selected || applying}
              aria-label={selected ? `Delete ${selected.name}` : "Delete saved setup"}>Delete</Button>
          </div>
        </div>
      ) : <p className="text-xs text-muted-foreground">No saved setups yet. Name this {includesView ? "workload and filter view" : "workload"} to reuse it later.</p>}
      {setups.length > 0 && <p className="text-xs text-muted-foreground">{includesView ? selected && !selected.includesDirectoryView ? "Applies the workload only. Your current filters, sort, view, and comparison stay in place." : "Saves workload, filters, sort, and view. Applying keeps your current comparison." : "Saves and applies calculator workloads here. Saved directory views apply from the directory."}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <p role="status" aria-live="polite" className={message ? "text-sm text-muted-foreground" : "sr-only"}>{message}</p>
    </section>
  );
}
