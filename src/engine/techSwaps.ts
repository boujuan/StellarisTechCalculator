/**
 * Tech swap evaluator — handles conditional technology swaps and name overrides.
 * Ported from GameState.gd _update_tech_swaps(), initialize_swaps(), etc.
 */
import type { AtomicFacts } from "../types/facts";
import type { TechStateMap, Technology } from "../types/tech";
import { evaluateNode } from "./logicEvaluator";
import { technologies, techSwaps, conditionalNames } from "../state/dataStore";

// ── Swap application ────────────────────────────────────────────────────

export interface SwapResult {
  /** Tech ID → overridden technology fields */
  overrides: Record<string, Partial<Technology>>;
}

/**
 * Evaluate all tech swaps and conditional names against the current state.
 * Returns a map of tech_id → overridden fields to apply.
 */
export function evaluateAllSwaps(
  atomicFacts: AtomicFacts,
  techState: TechStateMap,
): SwapResult {
  const overrides: Record<string, Partial<Technology>> = {};

  // Process tech swaps (icon, area, category changes)
  for (const swapId of Object.keys(techSwaps)) {
    const entries = techSwaps[swapId];
    if (!entries || entries.length === 0) continue;
    const swap = entries[0];

    // Start from original tech
    const original = technologies[swapId];
    if (!original) continue;

    if (evaluateNode(swap.trigger, atomicFacts, techState)) {
      const override: Partial<Technology> = {};
      if (swap.inherit_icon) {
        override.icon = swap.name ?? original.icon;
      }
      if (swap.real_name) {
        override.real_name = swap.real_name;
      }
      if (swap.area) {
        override.area = swap.area as Technology["area"];
      }
      if (swap.category) {
        override.category = swap.category;
      }
      if (Object.keys(override).length > 0) {
        overrides[swapId] = override;
      }
    }
  }

  // Process conditional names
  for (const swapId of Object.keys(conditionalNames)) {
    const entries = conditionalNames[swapId];
    if (!entries || entries.length === 0) continue;
    const swap = entries[0];

    if (evaluateNode(swap.trigger, atomicFacts, techState)) {
      const existing = overrides[swapId] ?? {};
      if (swap.real_name) {
        existing.real_name = swap.real_name;
      }
      if (Object.keys(existing).length > 0) {
        overrides[swapId] = existing;
      }
    }
  }

  return { overrides };
}
