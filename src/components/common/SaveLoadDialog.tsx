import { createSignal, For, Show, type Component } from "solid-js";
import {
  atomicFacts,
  scalarValues,
  councilExpertise,
  councillorLevels,
  researchAlternatives,
  resetEmpireState,
  setResearchAlternatives,
} from "../../state/empireState";
import {
  techState,
  resetTechState,
} from "../../state/techState";
import { runUpdateCascade } from "../../engine/updateCascade";
import { allTechIds } from "../../state/dataStore";
import {
  setAtomicValue,
  setScalarValue,
  setCouncilExpertiseTier,
  setCouncillorLevel,
  recomputeExpertiseBonus,
} from "../../state/empireState";
import { setTechField } from "../../state/techState";
import { batch } from "solid-js";
import { mapSaveToCalculatorState } from "../../engine/saveMapper";
import {
  addLogEntry,
  clearLog,
  clearSaveSource,
  markManyFromSave,
  setPanelState,
  setIsImporting,
  setInProgressTechs,
  countInProgress,
} from "../../state/importState";
import type { SaveParserWorkerApi } from "../../workers/saveParserWorker";
import * as Comlink from "comlink";

const STORAGE_PREFIX = "stellaris_tc_save_";

/** Detect OS and return the likely Stellaris save path */
function getSavePath(): { os: string; path: string } {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) {
    return {
      os: "Windows",
      path: "Documents\\Paradox Interactive\\Stellaris\\save games\\",
    };
  }
  if (ua.includes("mac") || ua.includes("darwin")) {
    return {
      os: "macOS",
      path: "~/Library/Application Support/Paradox Interactive/Stellaris/save games/",
    };
  }
  return {
    os: "Linux",
    path: "~/.local/share/Paradox Interactive/Stellaris/save games/",
  };
}

interface SaveData {
  version: 1;
  timestamp: number;
  atomicFacts: Record<string, boolean>;
  scalarValues: Record<string, number>;
  councilExpertise: Record<string, Record<number, number>>;
  councillorLevels: { shroudwalker_teacher: number; storm_caller: number };
  researchAlternatives: number;
  techResearched: string[];
  techDrawnLast: string[];
}

function buildSaveData(): SaveData {
  const researched: string[] = [];
  const drawnLast: string[] = [];
  for (const id of allTechIds) {
    if (techState[id].researched === 1) researched.push(id);
    if (techState[id].drawn_last === 1) drawnLast.push(id);
  }

  return {
    version: 1,
    timestamp: Date.now(),
    atomicFacts: { ...atomicFacts },
    scalarValues: { ...scalarValues },
    councilExpertise: JSON.parse(JSON.stringify(councilExpertise)),
    councillorLevels: { ...councillorLevels },
    researchAlternatives: researchAlternatives(),
    techResearched: researched,
    techDrawnLast: drawnLast,
  };
}

function applySaveData(data: SaveData): void {
  batch(() => {
    // Reset first
    resetEmpireState();
    resetTechState();

    // Apply atomic facts
    for (const [key, value] of Object.entries(data.atomicFacts)) {
      setAtomicValue(key, value);
    }

    // Apply scalars
    for (const [key, value] of Object.entries(data.scalarValues)) {
      setScalarValue(key, value);
    }

    // Apply expertise
    for (const [category, tiers] of Object.entries(data.councilExpertise)) {
      for (const [tier, count] of Object.entries(tiers)) {
        setCouncilExpertiseTier(
          `TRAIT:leader_trait_expertise_${category}`,
          Number(tier),
          Number(count),
        );
      }
    }

    // Apply councillors
    setCouncillorLevel("shroudwalker_teacher", data.councillorLevels.shroudwalker_teacher);
    setCouncillorLevel("storm_caller", data.councillorLevels.storm_caller);

    // Apply RAs
    setResearchAlternatives(data.researchAlternatives);

    // Apply tech state
    for (const id of data.techResearched) {
      setTechField(id, "researched", 1);
    }
    for (const id of data.techDrawnLast) {
      setTechField(id, "drawn_last", 1);
    }
  });

  runUpdateCascade();
}

function getSavedNames(): string[] {
  const names: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      names.push(key.slice(STORAGE_PREFIX.length));
    }
  }
  return names.sort();
}

const SaveLoadDialog: Component<{ onClose: () => void }> = (props) => {
  const [saveName, setSaveName] = createSignal("");
  const [saves, setSaves] = createSignal(getSavedNames());
  const [message, setMessage] = createSignal("");

  const handleSave = () => {
    const name = saveName().trim();
    if (!name) return;
    localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(buildSaveData()));
    setSaves(getSavedNames());
    setMessage(`Saved "${name}"`);
    setSaveName("");
  };

  const handleLoad = (name: string) => {
    const raw = localStorage.getItem(STORAGE_PREFIX + name);
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as SaveData;
      applySaveData(data);
      setMessage(`Loaded "${name}"`);
    } catch {
      setMessage("Failed to load save");
    }
  };

  const handleDelete = (name: string) => {
    localStorage.removeItem(STORAGE_PREFIX + name);
    setSaves(getSavedNames());
    setMessage(`Deleted "${name}"`);
  };

  const handleExport = () => {
    const data = JSON.stringify(buildSaveData(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stellaris-tc-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as SaveData;
        applySaveData(data);
        setMessage("Imported successfully");
      } catch {
        setMessage("Failed to import file");
      }
    };
    input.click();
  };

  const [dragging, setDragging] = createSignal(false);
  const savePathInfo = getSavePath();

  /** Core import pipeline — shared by drag-drop and file picker */
  const importSaveFile = async (file: File) => {
    clearLog();
    clearSaveSource();
    setPanelState("expanded");
    setIsImporting(true);
    addLogEntry("info", `Loading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)...`);
    setMessage("Importing save...");

    try {
      const buffer = await file.arrayBuffer();

      const worker = new Worker(
        new URL("../../workers/saveParserWorker.ts", import.meta.url),
        { type: "module" },
      );
      const api = Comlink.wrap<SaveParserWorkerApi>(worker);

      const parsed = await api.parse(Comlink.transfer(buffer, [buffer]));

      worker.terminate();

      for (const entry of parsed.log) {
        addLogEntry(entry.level, entry.message);
      }

      const { state, log: mapperLog } = mapSaveToCalculatorState(parsed);

      for (const entry of mapperLog) {
        addLogEntry(entry.level, entry.message);
      }

      batch(() => {
        resetEmpireState();
        resetTechState();

        for (const [key, value] of Object.entries(state.atomicFacts)) {
          setAtomicValue(key, value);
        }

        for (const [key, value] of Object.entries(state.scalarValues)) {
          setScalarValue(key, value);
        }

        for (const id of state.techResearched) {
          setTechField(id, "researched", 1);
        }

        // Apply expertise counts from council leaders
        for (const [category, tiers] of Object.entries(state.expertiseCounts)) {
          for (const [tier, count] of Object.entries(tiers)) {
            setCouncilExpertiseTier(
              `TRAIT:leader_trait_expertise_${category}`,
              Number(tier),
              Number(count),
            );
          }
        }

        // Apply councillor levels
        setCouncillorLevel("shroudwalker_teacher", state.councillorLevels.shroudwalker_teacher);
        setCouncillorLevel("storm_caller", state.councillorLevels.storm_caller);

        // Apply research alternatives if detected
        if (state.researchAlternatives !== null) {
          setResearchAlternatives(state.researchAlternatives);
        }
      });

      recomputeExpertiseBonus();
      runUpdateCascade();
      markManyFromSave(state.saveSourceKeys);

      // Store in-progress techs and apply if toggle is on
      setInProgressTechs(state.techInProgress);
      if (countInProgress() && state.techInProgress.length > 0) {
        batch(() => {
          for (const id of state.techInProgress) {
            setTechField(id, "researched", 1);
          }
        });
        runUpdateCascade();
      }

      addLogEntry("success", "Applied to calculator");
      setPanelState("minimized");
      setMessage("Save imported successfully");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      addLogEntry("error", `Import failed: ${msg}`);
      setMessage("Failed to import save");
    } finally {
      setIsImporting(false);
    }
  };

  /** Click to browse for a .sav file */
  const handleLoadSave = async () => {
    let file: File | undefined;

    try {
      if ("showOpenFilePicker" in window) {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: "Stellaris Save Files",
              accept: { "application/octet-stream": [".sav"] },
            },
          ],
          startIn: "documents",
          multiple: false,
        });
        file = await handle.getFile();
      } else {
        file = await new Promise<File | undefined>((resolve) => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".sav";
          input.onchange = () => resolve(input.files?.[0]);
          input.oncancel = () => resolve(undefined);
          input.click();
        });
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setMessage("Failed to open file picker");
      return;
    }

    if (!file) return;
    importSaveFile(file);
  };

  /** Handle drag-and-drop of .sav files */
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    if (!file.name.endsWith(".sav")) {
      setMessage("Please drop a .sav file");
      return;
    }
    importSaveFile(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleReset = () => {
    batch(() => {
      resetEmpireState();
      resetTechState();
    });
    runUpdateCascade();
    clearSaveSource();
    setMessage("Reset to defaults");
  };

  return (
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={props.onClose}>
      <div class="bg-bg-secondary border border-border rounded-lg p-4 w-96 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-base font-semibold font-display" style={{ "text-shadow": "0 0 8px rgba(59,130,246,0.3)" }}>Save / Load</h3>
          <button onClick={props.onClose} class="text-text-muted hover:text-text-primary text-lg">&times;</button>
        </div>

        {/* Save input */}
        <div class="flex gap-2 mb-4">
          <input
            type="text"
            value={saveName()}
            onInput={(e) => setSaveName(e.currentTarget.value)}
            placeholder="Save name..."
            class="flex-1 bg-bg-primary border border-border rounded px-2 py-1 text-sm text-text-primary"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <button
            onClick={handleSave}
            class="bg-physics/20 text-physics px-3 py-1 rounded text-sm hover:bg-physics/30"
          >
            Save
          </button>
        </div>

        {/* Saved list */}
        <Show when={saves().length > 0}>
          <div class="mb-4 space-y-1">
            <For each={saves()}>
              {(name) => (
                <div class="flex items-center gap-2 bg-bg-primary rounded px-2 py-1">
                  <span class="text-sm text-text-secondary flex-1 truncate">{name}</span>
                  <button
                    onClick={() => handleLoad(name)}
                    class="text-xs text-physics hover:text-physics/80"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDelete(name)}
                    class="text-xs text-dangerous hover:text-dangerous/80"
                  >
                    Del
                  </button>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Load Stellaris Save — drop zone + browse button */}
        <div class="mb-3 border-t border-border pt-3">
          <div
            class={`relative rounded-lg border-2 border-dashed p-4 text-center transition-all cursor-pointer ${
              dragging()
                ? "border-rare bg-rare/10"
                : "border-border/60 hover:border-rare/50 hover:bg-rare/5"
            }`}
            onClick={handleLoadSave}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div class="text-rare text-lg mb-1">{dragging() ? "\u2193" : "\u2B06"}</div>
            <p class="text-sm text-text-primary font-semibold">
              {dragging() ? "Drop save file here" : "Drop .sav file here"}
            </p>
            <p class="text-[10px] text-text-muted mt-1">or click to browse</p>
          </div>
          <p class="text-[10px] text-text-muted mt-2 leading-tight">
            <span class="text-text-secondary">{savePathInfo.os} saves:</span>{" "}
            <span class="font-mono text-[9px]">{savePathInfo.path}</span>
          </p>
          <p class="text-[10px] text-text-muted mt-0.5 leading-tight">
            Auto-detects DLCs, ethics, civics, origin, traditions, techs, and more.
          </p>
        </div>

        {/* Actions */}
        <div class="flex gap-2 border-t border-border pt-3">
          <button onClick={handleExport} class="text-xs text-text-secondary hover:text-text-primary px-2 py-1 border border-border rounded">
            Export JSON
          </button>
          <button onClick={handleImport} class="text-xs text-text-secondary hover:text-text-primary px-2 py-1 border border-border rounded">
            Import JSON
          </button>
          <button onClick={handleReset} class="text-xs text-dangerous hover:text-dangerous/80 px-2 py-1 border border-dangerous/30 rounded ml-auto">
            Reset All
          </button>
        </div>

        {/* Status message */}
        <Show when={message()}>
          <p class="text-xs text-text-muted mt-2">{message()}</p>
        </Show>
      </div>
    </div>
  );
};

export default SaveLoadDialog;
