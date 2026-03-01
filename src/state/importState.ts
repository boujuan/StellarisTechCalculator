/**
 * Import state — reactive store for save import log and save-source tracking.
 * Tracks which settings were loaded from a save file.
 */
import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import type { ImportLogEntry, LogLevel } from "../types/saveGame";

// ── Log entries ──────────────────────────────────────────────────────────

const [logEntries, setLogEntries] = createStore<ImportLogEntry[]>([]);

export { logEntries };

export function addLogEntry(level: LogLevel, message: string): void {
  setLogEntries((prev) => [
    ...prev,
    { level, message, timestamp: Date.now() },
  ]);
}

export function clearLog(): void {
  setLogEntries([]);
}

// ── Panel visibility ─────────────────────────────────────────────────────

export type PanelState = "hidden" | "minimized" | "expanded";

const [panelState, setPanelState] = createSignal<PanelState>("hidden");

export { panelState, setPanelState };

// ── Save-source tracking ─────────────────────────────────────────────────

/** Set of fact/scalar keys that were populated from a save import */
const [saveSourceKeys, setSaveSourceKeys] = createStore<Record<string, boolean>>({});

export { saveSourceKeys };

export function markFromSave(key: string): void {
  setSaveSourceKeys(key, true);
}

export function markManyFromSave(keys: string[]): void {
  const updates: Record<string, boolean> = {};
  for (const key of keys) {
    updates[key] = true;
  }
  setSaveSourceKeys((prev) => ({ ...prev, ...updates }));
}

export function isFromSave(key: string): boolean {
  return saveSourceKeys[key] === true;
}

export function unmarkFromSave(key: string): void {
  setSaveSourceKeys(key, undefined as unknown as boolean);
}

export function clearSaveSource(): void {
  setSaveSourceKeys({});
}

// ── Import in progress flag ──────────────────────────────────────────────

const [isImporting, setIsImporting] = createSignal(false);

export { isImporting, setIsImporting };

// ── In-progress research toggle ─────────────────────────────────────────

import { batch } from "solid-js";
import { setTechField } from "./techState";
import { runUpdateCascade } from "../engine/updateCascade";

const [inProgressTechs, setInProgressTechs] = createSignal<string[]>([]);
const [countInProgress, setCountInProgress] = createSignal(true);

export { inProgressTechs, setInProgressTechs, countInProgress, setCountInProgress };

export function applyInProgressToggle(checked: boolean): void {
  const techs = inProgressTechs();
  if (techs.length === 0) return;
  batch(() => {
    for (const id of techs) {
      setTechField(id, "researched", checked ? 1 : 0);
    }
  });
  runUpdateCascade();
}
