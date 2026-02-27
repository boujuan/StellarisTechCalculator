/**
 * Update cascade — 8-step pipeline that recomputes all tech state.
 * Ported from TechRuntimeState.gd _update_cascade()
 *
 * Steps 1-7 run synchronously on the main thread.
 * Step 8 (Monte Carlo hit chances) dispatches to a Web Worker.
 */
import { batch } from "solid-js";
import { evaluatePotential, evaluatePrerequisites, type EvalContext } from "./logicEvaluator";
import { evaluateWeight } from "./weightCalculator";
import { evaluateAllSwaps } from "./techSwaps";
import {
  allTechIds,
  technologies,
  unlockIndex,
} from "../state/dataStore";
import {
  atomicFacts,
  setAtomicValue,
  expertiseBonus,
  councillorLevels,
  researchAlternatives,
  recomputeExpertiseBonus,
} from "../state/empireState";
import {
  techState,
  activeTechnologies,
  researchedCountByArea,
  researchedCountGlobal,
  updateResearchedCounts,
  setTechField,
  setHitChances,
  applyTechOverride,
  resetTechToOriginal,
} from "../state/techState";
import type { WeightMap } from "../types/tech";

/** Callback to dispatch Monte Carlo computation to a worker */
type HitChanceDispatcher = (
  weightMap: WeightMap,
  draws: number,
) => void;

let hitChanceDispatcher: HitChanceDispatcher | null = null;

/** Register the Web Worker dispatcher for Monte Carlo (called once at init) */
export function setHitChanceDispatcher(dispatcher: HitChanceDispatcher): void {
  hitChanceDispatcher = dispatcher;
}

/**
 * Run the full 8-step update cascade.
 * Call this whenever any empire state or tech state changes.
 */
export function runUpdateCascade(): void {
  // Step 0: Recompute expertise bonus (needs to happen before weights)
  recomputeExpertiseBonus();

  // Step 1: Update researched counts per area/tier
  updateResearchedCounts();

  batch(() => {
    // Step 2: Evaluate potential for all techs
    for (const tid of allTechIds) {
      const tech = activeTechnologies[tid];
      const result = evaluatePotential(tid, tech, atomicFacts, techState);
      if (techState[tid].potential !== result) {
        setTechField(tid, "potential", result);
      }
    }

    // Step 3: Update derived atomic facts
    // Special case: genome mapping availability
    setAtomicValue(
      "Can_research_technology:tech_genome_mapping",
      techState["tech_genome_mapping"]?.potential === 1,
    );

    // Step 4: Evaluate prerequisites (with tier threshold check)
    for (const tid of allTechIds) {
      const tech = activeTechnologies[tid];
      const area = tech.area;
      const tier = tech.tier;

      // Tier threshold: need 6 researched at tier-1 to unlock this tier
      let tierThresholdMet = true;
      if (tier > 1) {
        const prevTierCount = researchedCountByArea[area]?.[tier - 1] ?? 0;
        if (prevTierCount < 6) {
          tierThresholdMet = false;
        }
      }

      let result = 0;
      if (techState[tid].potential === 1 && tierThresholdMet) {
        result = evaluatePrerequisites(tid, tech, atomicFacts, techState);
      }

      if (techState[tid].prereqs_met !== result) {
        setTechField(tid, "prereqs_met", result);
      }
    }

    // Step 5: Apply tech swaps
    const swapResult = evaluateAllSwaps(atomicFacts, techState);
    for (const tid of allTechIds) {
      if (swapResult.overrides[tid]) {
        applyTechOverride(tid, swapResult.overrides[tid]);
      } else {
        // Reset to original if no swap applies
        const active = activeTechnologies[tid];
        const original = technologies[tid];
        if (active.icon !== original.icon || active.real_name !== original.real_name) {
          resetTechToOriginal(tid);
        }
      }
    }

    // Step 6: Compute weights for available techs
    for (const tid of allTechIds) {
      let weight = 0;
      if (
        techState[tid].prereqs_met === 1 &&
        techState[tid].permanent === 0 &&
        techState[tid].researched === 0
      ) {
        weight = evaluateWeight(
          tid,
          activeTechnologies[tid],
          atomicFacts,
          techState,
          expertiseBonus,
          researchedCountByArea,
          researchedCountGlobal,
          councillorLevels,
        );
      }
      if (techState[tid].current_weight !== weight) {
        setTechField(tid, "current_weight", weight);
      }
    }

    // Step 7: Compute delta weights (opportunity cost)
    computeDeltaWeights();
  });

  // Step 8: Dispatch Monte Carlo to Web Worker
  dispatchHitChanceComputation();
}

/**
 * Step 7: Delta weight computation.
 * Delta = sum of weights that researching this tech would unlock, minus its own weight.
 */
function computeDeltaWeights(): void {
  for (const tid of allTechIds) {
    if (techState[tid].prereqs_met !== 1 || techState[tid].researched !== 0) {
      if (techState[tid].delta_weight !== 0) {
        setTechField(tid, "delta_weight", 0);
      }
      continue;
    }

    let dWeight = -techState[tid].current_weight;

    // Check what this tech would unlock via prerequisite satisfaction
    const unlocks = unlockIndex[tid];
    if (unlocks) {
      for (const unlockedTid of unlocks) {
        const target = techState[unlockedTid];
        if (!target || target.researched === 1 || target.prereqs_met === 1) {
          continue;
        }

        const ctx: EvalContext = { assume_tech: tid };
        if (evaluatePrerequisites(unlockedTid, activeTechnologies[unlockedTid], atomicFacts, techState, ctx)) {
          dWeight += evaluateWeight(
            unlockedTid,
            activeTechnologies[unlockedTid],
            atomicFacts,
            techState,
            expertiseBonus,
            researchedCountByArea,
            researchedCountGlobal,
            councillorLevels,
          );
        }
      }
    }

    // Beeline contribution: researching this helps lower-tier techs via beeline
    const tier = activeTechnologies[tid].tier;
    if (tier > 2) {
      for (const beeline of allTechIds) {
        if (activeTechnologies[beeline].tier === tier - 2) {
          const tempWeight = techState[beeline].current_weight;
          if (tempWeight > 0) {
            const globalCount = researchedCountGlobal[tier] ?? 0;
            const baseWeight = tempWeight / (1 + 0.2 * globalCount);
            dWeight += baseWeight * 0.2;
          }
        }
      }
    }

    if (techState[tid].delta_weight !== dWeight) {
      setTechField(tid, "delta_weight", dWeight);
    }
  }
}

/**
 * Step 8: Build weight map and dispatch to Monte Carlo worker.
 */
function dispatchHitChanceComputation(): void {
  const weightMap: WeightMap = {};

  for (const tid of allTechIds) {
    const w = techState[tid].current_weight;
    if (w > 0 && techState[tid].permanent === 0) {
      weightMap[tid] = w;
    }
  }

  if (Object.keys(weightMap).length === 0) {
    // No available techs — set all to 0
    setHitChances({});
    return;
  }

  const draws = researchAlternatives();

  if (hitChanceDispatcher) {
    hitChanceDispatcher(weightMap, draws);
  } else {
    // Fallback: no worker available, skip hit chances
    if (import.meta.env.DEV) {
      console.warn("No hit chance dispatcher registered, skipping Monte Carlo");
    }
  }
}
