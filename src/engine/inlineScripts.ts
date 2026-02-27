/**
 * Inline script handlers for tech weight modifiers.
 * Ported from LogicEngine.gd _evaluate_inline_script and its 3 handlers.
 */
import type { AtomicFacts } from "../types/facts";
import type { TechStateMap } from "../types/tech";
import { ARCHAEOTECH_IDS } from "../state/dataStore";

/**
 * Evaluate an inline script by name, returning a multiplier delta.
 * The returned value is added to 1.0 to produce the final multiplier:
 *   weight *= 1 + evaluateInlineScript(...)
 */
export function evaluateInlineScript(
  scriptName: string,
  _techId: string,
  atomicFacts: AtomicFacts,
  techState: TechStateMap,
  councillorLevels: { storm_caller: number },
): number {
  switch (scriptName) {
    case "technologies/rare_technologies_weight_modifiers":
      return inlineRareScript(atomicFacts);
    case "technology/archaeotech_weight":
      return inlineArchaeotech(atomicFacts, techState);
    case "technologies/cosmic_storms_technologies_weight_modifiers":
      return inlineCosmicStorms(atomicFacts, councillorLevels);
    default:
      if (import.meta.env.DEV) {
        console.warn("Unknown inline_script:", scriptName);
      }
      return 0;
  }
}

/**
 * Rare tech script: +50% if Technological Ascendancy, +10% if Dimensional Worship
 */
function inlineRareScript(facts: AtomicFacts): number {
  let bonus = 0;
  if (facts["has_ascension_perk:ap_technological_ascendancy"]) {
    bonus += 0.5;
  }
  if (facts["is_dimensional_worship_empire:yes"]) {
    bonus += 0.1;
  }
  return bonus;
}

/**
 * Archaeotech script: 0.85^(researched_count) penalty, bypassed by Archaeoengineers perk.
 * Returns (penalty - 1), so the multiplier becomes 1 + (penalty - 1) = penalty.
 */
function inlineArchaeotech(facts: AtomicFacts, state: TechStateMap): number {
  if (facts["has_ascension_perk:ap_archaeoengineers"]) {
    return 0;
  }
  let numPenalties = 0;
  for (const id of ARCHAEOTECH_IDS) {
    if (state[id]?.researched === 1) {
      numPenalties++;
    }
  }
  const penalty = Math.pow(0.85, numPenalties);
  return penalty - 1;
}

/**
 * Cosmic storms script: origin/councillor/resolution multipliers.
 * Returns (multiplier - 1), so the final factor is 1 + result.
 */
function inlineCosmicStorms(
  facts: AtomicFacts,
  councillorLevels: { storm_caller: number },
): number {
  let multiplier = 1;

  if (facts["has_origin:origin_storm_chasers"]) {
    multiplier *= 1.5;
  }

  multiplier *= 1 + 0.05 * councillorLevels.storm_caller;

  // Resolution chain (highest match wins, checked top-down)
  if (
    facts[
      "is_active_resolution:resolution_cosmic_storms_manipulation_mandate"
    ]
  ) {
    multiplier *= 10000;
    return multiplier - 1;
  }
  if (
    facts[
      "is_active_resolution:resolution_cosmic_storms_utilization_protocols"
    ]
  ) {
    multiplier *= 10000;
    return multiplier - 1;
  }
  if (
    facts[
      "is_active_resolution:resolution_cosmic_storms_galactic_management"
    ]
  ) {
    multiplier *= 1.75;
    return multiplier - 1;
  }
  if (
    facts[
      "is_active_resolution:resolution_cosmic_storms_protection_initiative"
    ]
  ) {
    multiplier *= 1.5;
    return multiplier - 1;
  }
  if (
    facts[
      "is_active_resolution:resolution_cosmic_storms_shared_knowledge"
    ]
  ) {
    multiplier *= 1.2;
    return multiplier - 1;
  }

  return multiplier - 1;
}
