/**
 * Weight calculator — computes tech weight from base × modifier chain.
 * Ported from LogicEngine.gd evaluate_weight(), _expertise_destiny(),
 * _beeline_modifier(), and _drawn_last()
 */
import type { Technology, TechStateMap } from "../types/tech";
import type { AtomicFacts, CouncillorLevels } from "../types/facts";
import { evaluateNode } from "./logicEvaluator";
import { evaluateInlineScript } from "./inlineScripts";

/**
 * Calculate the current weight for a technology.
 *
 * Formula: base_weight × modifier_chain × inline_scripts × expertise × beeline × drawn_last
 */
export function evaluateWeight(
  techId: string,
  tech: Technology,
  atomicFacts: AtomicFacts,
  techState: TechStateMap,
  expertiseBonus: Record<string, number>,
  researchedCountByArea: Record<string, Record<number, number>>,
  _researchedCountGlobal: Record<number, number>,
  councillorLevels: CouncillorLevels,
): number {
  let weight = tech.weight;

  // Apply weight modifiers
  if (tech.weight_modifier) {
    for (const modEntry of tech.weight_modifier) {
      const mod = modEntry as Record<string, unknown>;

      if ("modifier" in mod) {
        const modArray = mod.modifier as Array<Record<string, unknown>>;
        // First element contains the factor
        let factor = 1;
        for (const item of modArray) {
          if ("factor" in item) {
            factor = parseFloat(String(item.factor));
            break;
          }
        }
        // Remaining elements are conditions
        const conditions = modArray.slice(1);
        const conditionsMet = evaluateNode(
          conditions,
          atomicFacts,
          techState,
        );
        weight *= 1 + (factor - 1) * (conditionsMet ? 1 : 0);
      } else if ("inline_script" in mod) {
        const scriptName = mod.inline_script as string;
        const delta = evaluateInlineScript(
          scriptName,
          techId,
          atomicFacts,
          techState,
          councillorLevels,
        );
        weight *= 1 + delta;
      }
    }
  }

  // Expertise bonus
  weight = applyExpertise(weight, tech.category, expertiseBonus);

  // Beeline modifier
  weight = applyBeeline(
    weight,
    tech.tier,
    researchedCountByArea,
  );

  // Drawn last
  if (techState[techId]?.drawn_last === 1) {
    weight = 0;
  }

  return weight;
}

/**
 * Expertise modifier: weight *= 1 + bonus_for_category
 */
function applyExpertise(
  weight: number,
  category: string,
  expertiseBonus: Record<string, number>,
): number {
  const bonus = expertiseBonus[category] ?? 0;
  return weight * (1 + bonus);
}

/**
 * Beeline modifier: for tiers 1-3, boost weight based on higher-tier researched count.
 * weight *= 1 + 0.2 × (researched_at_tier+2 across all areas)
 */
function applyBeeline(
  weight: number,
  tier: number,
  researchedCountByArea: Record<string, Record<number, number>>,
): number {
  if (tier >= 1 && tier <= 3) {
    const higherTier = tier + 2;
    const count =
      (researchedCountByArea["physics"]?.[higherTier] ?? 0) +
      (researchedCountByArea["society"]?.[higherTier] ?? 0) +
      (researchedCountByArea["engineering"]?.[higherTier] ?? 0);
    weight *= 1 + 0.2 * count;
  }
  return weight;
}
