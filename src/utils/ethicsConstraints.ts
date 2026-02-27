/**
 * Ethics constraint logic for Stellaris empire setup.
 *
 * Rules:
 * 1. Normal and fanatic of same axis are mutually exclusive
 * 2. Opposite axes are mutually exclusive (militarist vs pacifist, etc.)
 * 3. Total ethics points = 3 max (normal=1pt, fanatic=2pts)
 * 4. Gestalt Consciousness is exclusive — if selected, no other ethics allowed
 */
import { batch } from "solid-js";
import { atomicFacts, setAtomicValue } from "../state/empireState";
import { metadata } from "../state/dataStore";
import type { SectionFacts } from "../types/facts";

const ETHICS_AXIS_PAIRS: [string, string][] = [
  ["Militarist", "Pacifist"],
  ["Xenophobe", "Xenophile"],
  ["Authoritarian", "Egalitarian"],
  ["Materialist", "Spiritualist"],
];

function getEthicsFacts(): Record<string, string[]> {
  const empireSetup = metadata["Empire Setup"] as Record<string, unknown>;
  const ethicsSection = empireSetup?.["Ethics"] as SectionFacts | undefined;
  return (ethicsSection?.facts ?? {}) as Record<string, string[]>;
}

function isEthicActive(name: string): boolean {
  const facts = getEthicsFacts()[name];
  return facts ? facts.some((f) => atomicFacts[f]) : false;
}

function clearEthic(name: string): void {
  const facts = getEthicsFacts()[name];
  if (facts) {
    for (const f of facts) setAtomicValue(f, false);
  }
}

function getPoints(name: string): number {
  if (name === "Gestalt Consciousness") return 3;
  return name.startsWith("Fanatic ") ? 2 : 1;
}

function getBase(name: string): string {
  return name.replace("Fanatic ", "");
}

function getOpposite(base: string): string | null {
  for (const [a, b] of ETHICS_AXIS_PAIRS) {
    if (a === base) return b;
    if (b === base) return a;
  }
  return null;
}

/** Get total ethics points currently spent */
export function currentEthicsPoints(): number {
  const allEthics = getEthicsFacts();
  let total = 0;
  for (const name of Object.keys(allEthics)) {
    if (isEthicActive(name)) total += getPoints(name);
  }
  return total;
}

/**
 * Called before toggling an ethic ON.
 * Clears conflicting ethics to enforce game rules.
 */
export function enforceEthicsConstraints(ethicName: string): void {
  const allEthics = getEthicsFacts();

  batch(() => {
    // Rule 4: Gestalt is exclusive — clear everything else
    if (ethicName === "Gestalt Consciousness") {
      for (const name of Object.keys(allEthics)) {
        if (name !== "Gestalt Consciousness") clearEthic(name);
      }
      return;
    }

    // If Gestalt is active, clear it when selecting any normal ethic
    if (isEthicActive("Gestalt Consciousness")) {
      clearEthic("Gestalt Consciousness");
    }

    const base = getBase(ethicName);
    const isFanatic = ethicName.startsWith("Fanatic ");
    const points = getPoints(ethicName);

    // Rule 1: Clear same-axis variant (normal↔fanatic mutual exclusivity)
    const sameAxisVariant = isFanatic ? base : `Fanatic ${base}`;
    clearEthic(sameAxisVariant);

    // Rule 2: Clear opposite axis (both normal and fanatic)
    const opposite = getOpposite(base);
    if (opposite) {
      clearEthic(opposite);
      clearEthic(`Fanatic ${opposite}`);
    }

    // Rule 3: Check point budget — shed excess until we fit
    let currentPoints = 0;
    for (const name of Object.keys(allEthics)) {
      if (name === ethicName || name === "Gestalt Consciousness") continue;
      if (isEthicActive(name)) currentPoints += getPoints(name);
    }

    // Remove active ethics until adding this one fits within 3 points
    while (currentPoints + points > 3) {
      let removed = false;
      for (const name of Object.keys(allEthics)) {
        if (name === ethicName || name === "Gestalt Consciousness") continue;
        if (isEthicActive(name)) {
          clearEthic(name);
          currentPoints -= getPoints(name);
          removed = true;
          break;
        }
      }
      if (!removed) break;
    }
  });
}
