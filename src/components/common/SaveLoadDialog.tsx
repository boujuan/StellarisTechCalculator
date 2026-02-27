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
} from "../../state/empireState";
import { setTechField } from "../../state/techState";
import { batch } from "solid-js";

const STORAGE_PREFIX = "stellaris_tc_save_";

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

  const handleReset = () => {
    batch(() => {
      resetEmpireState();
      resetTechState();
    });
    runUpdateCascade();
    setMessage("Reset to defaults");
  };

  return (
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={props.onClose}>
      <div class="bg-bg-secondary border border-border rounded-lg p-4 w-96 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-base font-semibold">Save / Load</h3>
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
