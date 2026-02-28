/**
 * Empire state — reactive store for atomic facts, scalars, expertise, and councillors.
 * Ported from GameState.gd
 */
import { createSignal, batch } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import type {
  AtomicFacts,
  CouncilExpertise,
  CouncillorLevels,
  ExpertiseTierMap,
} from "../types/facts";
import {
  defaultAtomicFacts,
  scalarMetadata,
  metadata,
  DEFAULT_SCALARS,
  TRUE_BACKEND_FACTS,
} from "./dataStore";

// ── Atomic facts (416 booleans) ─────────────────────────────────────────

/** Initialize with defaults + true backend facts */
function buildInitialFacts(): AtomicFacts {
  const facts: AtomicFacts = { ...defaultAtomicFacts };
  // Set backend facts that are always true
  for (const key of Object.keys(facts)) {
    for (const truePrefix of TRUE_BACKEND_FACTS) {
      if (key === truePrefix || key.startsWith(truePrefix)) {
        facts[key] = true;
      }
    }
  }
  // Default all DLCs to enabled
  const dlcSection = metadata["DLC"] as { facts?: Record<string, string[]> } | undefined;
  if (dlcSection?.facts) {
    for (const factIds of Object.values(dlcSection.facts)) {
      for (const factId of factIds) {
        facts[factId] = true;
      }
    }
  }

  return facts;
}

const [atomicFacts, setAtomicFacts] = createStore<AtomicFacts>(buildInitialFacts());

export { atomicFacts };

export function setAtomicValue(name: string, value: boolean): void {
  setAtomicFacts(name, value);
}

export function getAtomicValue(name: string): boolean {
  return atomicFacts[name] ?? false;
}

// ── Scalar values (17 sliders) ──────────────────────────────────────────

const [scalarValues, setScalarValues] = createStore<Record<string, number>>(
  { ...DEFAULT_SCALARS }
);

export { scalarValues };

/**
 * Set a scalar value and update all associated threshold-based atomic facts.
 */
export function setScalarValue(displayName: string, value: number): void {
  setScalarValues(displayName, value);

  const meta = scalarMetadata[displayName];
  if (!meta) return;

  batch(() => {
    for (const [factName, threshold] of Object.entries(meta.values)) {
      setAtomicFacts(factName, value >= threshold);
    }
  });
}

// ── Council expertise ───────────────────────────────────────────────────

const [councilExpertise, setCouncilExpertise] = createStore<CouncilExpertise>({});

export { councilExpertise };

const DEFAULT_EXPERTISE_WEIGHTS: Record<number, number> = {
  1: 0.25,
  2: 0.35,
  3: 0.75,
};

const PSIONIC_EXPERTISE_WEIGHTS: Record<number, number> = {
  1: 0.5,
  2: 1.0,
  3: 2.0,
};

const ARCHAEOTECH_EXPERTISE_WEIGHTS: Record<number, number> = {
  1: 0.15,
  2: 0.2,
  3: 0.35,
};

function getExpertiseWeights(category: string): Record<number, number> {
  if (category === "psionics") return PSIONIC_EXPERTISE_WEIGHTS;
  if (category === "archaeostudies") return ARCHAEOTECH_EXPERTISE_WEIGHTS;
  return DEFAULT_EXPERTISE_WEIGHTS;
}

/** Normalized expertise ID from TRAIT:leader_trait_expertise_X → X */
export function normalizeExpertiseId(rawId: string): string {
  return rawId.replace("TRAIT:leader_trait_expertise_", "");
}

export function setCouncilExpertiseTier(
  rawExpertiseId: string,
  tier: number,
  count: number,
): void {
  const category = normalizeExpertiseId(rawExpertiseId);

  // Ensure category entry exists
  if (!councilExpertise[category]) {
    setCouncilExpertise(category, { 1: 0, 2: 0, 3: 0 });
  }
  setCouncilExpertise(category, tier, Math.max(0, count));

  // Update atomic fact: true if any tier has count > 0
  const tierMap = councilExpertise[category] as ExpertiseTierMap;
  const hasAny = Object.values(tierMap).some((v) => v > 0);
  setAtomicFacts(`TRAIT:leader_trait_expertise_${category}`, hasAny);
}

// ── Expertise bonus (computed) ──────────────────────────────────────────

const [expertiseBonus, setExpertiseBonus] = createStore<Record<string, number>>({});

export { expertiseBonus };

export function recomputeExpertiseBonus(): void {
  const newBonus: Record<string, number> = {};

  for (const category of Object.keys(councilExpertise)) {
    const tierMap = councilExpertise[category] as ExpertiseTierMap;
    const weights = getExpertiseWeights(category);

    let total = 0;
    for (const tier of [1, 2, 3]) {
      total += (tierMap[tier] ?? 0) * (weights[tier] ?? 0);
    }

    if (total > 0) {
      newBonus[category] = total;
    }
  }

  // Add shroudwalker teacher bonus to psionics
  const shroudBonus = 0.05 * councillorLevels.shroudwalker_teacher;
  if (shroudBonus > 0) {
    newBonus["psionics"] = (newBonus["psionics"] ?? 0) + shroudBonus;
  }

  setExpertiseBonus(reconcile(newBonus));
}

export function getExpertiseBonusForCategory(category: string): number {
  return expertiseBonus[category] ?? 0;
}

// ── Councillor levels ───────────────────────────────────────────────────

const [councillorLevels, setCouncillorLevels] = createStore<CouncillorLevels>({
  shroudwalker_teacher: 0,
  storm_caller: 0,
});

export { councillorLevels };

export function setCouncillorLevel(id: keyof CouncillorLevels, level: number): void {
  setCouncillorLevels(id, Math.max(level, 0));
}

export function getCouncillorLevel(id: keyof CouncillorLevels): number {
  return councillorLevels[id];
}

// ── Research alternatives count ─────────────────────────────────────────

const [researchAlternatives, setResearchAlternatives] = createSignal(3);

export { researchAlternatives, setResearchAlternatives };

// ── Reset to defaults ───────────────────────────────────────────────────

export function resetEmpireState(): void {
  batch(() => {
    setAtomicFacts(buildInitialFacts());
    setScalarValues({ ...DEFAULT_SCALARS });
    setCouncilExpertise({});
    setExpertiseBonus({});
    setCouncillorLevels({ shroudwalker_teacher: 0, storm_caller: 0 });
    setResearchAlternatives(3);
  });
}
