/**
 * Tech runtime state — reactive store for per-tech computed values.
 * Ported from TechRuntimeState.gd
 */
import { batch } from "solid-js";
import { createStore } from "solid-js/store";
import type {
  TechState,
  TechStateMap,
  ResearchedCounts,
  Technology,
} from "../types/tech";
import {
  allTechIds,
  technologies,
  ALWAYS_RESEARCHED,
  PERMANENT_TECHS,
} from "./dataStore";

// ── Tech state store ────────────────────────────────────────────────────

function buildInitialTechState(): TechStateMap {
  const state: TechStateMap = {};
  for (const id of allTechIds) {
    state[id] = {
      current_weight: 0,
      delta_weight: 0,
      hit_chance: 0,
      potential: 0,
      prereqs_met: 0,
      researched: 0,
      drawn_last: 0,
      permanent: 0,
    };
  }

  // Set default researched techs
  for (const id of ALWAYS_RESEARCHED) {
    if (state[id]) {
      state[id] = { ...state[id], researched: 1 };
    }
  }

  // Set permanent techs
  for (const id of PERMANENT_TECHS) {
    if (state[id]) {
      state[id] = { ...state[id], permanent: 1 };
    }
  }

  return state;
}

const [techState, setTechState] = createStore<TechStateMap>(
  buildInitialTechState()
);

export { techState };

// ── Active technologies (with swap overrides applied) ───────────────────

const [activeTechnologies, setActiveTechnologies] = createStore(
  structuredClone(technologies)
);

export { activeTechnologies };

/** Get the active (possibly swapped) technology definition */
export function getActiveTech(id: string): Technology {
  return activeTechnologies[id];
}

/** Apply a swap override to a technology */
export function applyTechOverride(
  id: string,
  overrides: Partial<Technology>,
): void {
  setActiveTechnologies(id, (prev) => ({ ...prev, ...overrides }));
}

/** Reset a technology back to its original definition */
export function resetTechToOriginal(id: string): void {
  setActiveTechnologies(id, { ...technologies[id] });
}

// ── Researched counts (recomputed each cascade) ─────────────────────────

const [researchedCountGlobal, setResearchedCountGlobal] = createStore<
  Record<number, number>
>({});
const [researchedCountByArea, setResearchedCountByArea] =
  createStore<ResearchedCounts>({
    physics: {},
    society: {},
    engineering: {},
  });

export { researchedCountGlobal, researchedCountByArea };

export function updateResearchedCounts(): void {
  const global: Record<number, number> = {};
  const byArea: ResearchedCounts = {
    physics: {},
    society: {},
    engineering: {},
  };

  // Initialize tiers 0-5
  for (let tier = 0; tier < 6; tier++) {
    global[tier] = 0;
    byArea.physics[tier] = 0;
    byArea.society[tier] = 0;
    byArea.engineering[tier] = 0;
  }

  // Count researched techs
  for (const id of allTechIds) {
    if (techState[id].researched === 1) {
      const tech = technologies[id];
      const tier = tech.tier;
      const area = tech.area;
      global[tier] = (global[tier] ?? 0) + 1;
      byArea[area][tier] = (byArea[area][tier] ?? 0) + 1;
    }
  }

  batch(() => {
    setResearchedCountGlobal(global);
    setResearchedCountByArea(byArea);
  });
}

// ── Setters ─────────────────────────────────────────────────────────────

export function setTechField(
  id: string,
  field: keyof TechState,
  value: number,
): void {
  setTechState(id, field, value);
}

export function toggleResearched(id: string): void {
  const current = techState[id].researched;
  setTechState(id, "researched", current === 1 ? 0 : 1);
}

export function toggleDrawnLast(id: string): void {
  const current = techState[id].drawn_last;
  setTechState(id, "drawn_last", current === 1 ? 0 : 1);
}

export function setHitChances(chances: Record<string, number>): void {
  batch(() => {
    // Reset all to 0 first
    for (const id of allTechIds) {
      if (techState[id].hit_chance !== 0) {
        setTechState(id, "hit_chance", 0);
      }
    }
    // Set computed chances
    for (const [id, chance] of Object.entries(chances)) {
      setTechState(id, "hit_chance", chance);
    }
  });
}

// ── Reset ───────────────────────────────────────────────────────────────

export function resetTechState(): void {
  batch(() => {
    setTechState(buildInitialTechState());
    setActiveTechnologies(structuredClone(technologies));
  });
}
