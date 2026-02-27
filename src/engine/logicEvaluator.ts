/**
 * Boolean logic evaluator — recursive AND/OR/NOT/NOR tree evaluation.
 * Ported from LogicEngine.gd evaluate_node() and _resolve_atomic()
 */
import type { AtomicFacts } from "../types/facts";
import type { TechStateMap } from "../types/tech";

const LOGICAL_OPERATORS = new Set(["AND", "OR", "NOT", "NOR"]);

export interface EvalContext {
  /** If set, pretend this tech is researched (for delta weight hypothetical) */
  assume_tech?: string;
}

/**
 * Evaluate a nested boolean condition tree.
 * Nodes can be arrays (implicit AND), dictionaries with logical operators or atomic facts, or booleans.
 */
export function evaluateNode(
  node: unknown,
  atomicFacts: AtomicFacts,
  techState: TechStateMap,
  ctx?: EvalContext,
): boolean {
  // Array → implicit AND (all must be true)
  if (Array.isArray(node)) {
    if (node.length === 0) return true;
    for (const item of node) {
      if (!evaluateNode(item, atomicFacts, techState, ctx)) return false;
    }
    return true;
  }

  // Dictionary
  if (node !== null && typeof node === "object") {
    const dict = node as Record<string, unknown>;
    const keys = Object.keys(dict);
    if (keys.length === 0) return true;

    // Check for logical operators first
    for (const k of keys) {
      if (LOGICAL_OPERATORS.has(k)) {
        const v = dict[k];
        switch (k) {
          case "AND":
            return evalAnd(v, atomicFacts, techState, ctx);
          case "OR":
            return evalOr(v, atomicFacts, techState, ctx);
          case "NOT":
            return !evaluateNode(v, atomicFacts, techState, ctx);
          case "NOR":
            return evalNor(v, atomicFacts, techState, ctx);
        }
      }
    }

    // No logical operator — treat each key-value pair as an implicit AND
    for (const k of keys) {
      const v = dict[k];
      if (
        v !== null &&
        (typeof v === "object" || Array.isArray(v))
      ) {
        if (!evaluateNode(v, atomicFacts, techState, ctx)) return false;
      } else {
        if (!resolveAtomic(k, v, atomicFacts, techState, ctx)) return false;
      }
    }
    return true;
  }

  // Boolean literal
  if (typeof node === "boolean") return node;

  return false;
}

function evalAnd(
  v: unknown,
  facts: AtomicFacts,
  state: TechStateMap,
  ctx?: EvalContext,
): boolean {
  if (Array.isArray(v)) {
    for (const item of v) {
      if (!evaluateNode(item, facts, state, ctx)) return false;
    }
    return true;
  }
  return evaluateNode(v, facts, state, ctx);
}

function evalOr(
  v: unknown,
  facts: AtomicFacts,
  state: TechStateMap,
  ctx?: EvalContext,
): boolean {
  if (Array.isArray(v)) {
    for (const item of v) {
      if (evaluateNode(item, facts, state, ctx)) return true;
    }
    return false;
  }
  return evaluateNode(v, facts, state, ctx);
}

function evalNor(
  v: unknown,
  facts: AtomicFacts,
  state: TechStateMap,
  ctx?: EvalContext,
): boolean {
  if (Array.isArray(v)) {
    for (const item of v) {
      if (evaluateNode(item, facts, state, ctx)) return false;
    }
    return true;
  }
  return !evaluateNode(v, facts, state, ctx);
}

/**
 * Resolve an atomic fact or special key.
 * Handles "has_technology" lookups and "key:value" atomic fact lookups.
 */
function resolveAtomic(
  key: string,
  value: unknown,
  facts: AtomicFacts,
  state: TechStateMap,
  ctx?: EvalContext,
): boolean {
  // Special case: has_technology
  if (key === "has_technology") {
    if (ctx?.assume_tech) {
      if (typeof value === "string" && value === ctx.assume_tech) return true;
      if (Array.isArray(value) && value.includes(ctx.assume_tech)) return true;
    }
    if (typeof value === "string") {
      return state[value]?.researched === 1;
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        if (state[v]?.researched === 1) return true;
      }
      return false;
    }
    return false;
  }

  // Standard atomic fact: "key:value" → boolean lookup
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    const flat = `${key}:${String(value)}`;
    return facts[flat] ?? false;
  }

  // Nested structure — recurse
  if (typeof value === "object" || Array.isArray(value)) {
    return evaluateNode(value, facts, state, ctx);
  }

  return false;
}

// ── High-level evaluation functions ─────────────────────────────────────

/**
 * Evaluate a tech's potential block.
 * Returns 1 if the tech can appear in the pool, 0 otherwise.
 */
export function evaluatePotential(
  _techId: string,
  tech: { potential?: unknown[] },
  atomicFacts: AtomicFacts,
  techState: TechStateMap,
): number {
  if (!tech.potential) return 1;
  return evaluateNode(tech.potential, atomicFacts, techState) ? 1 : 0;
}

/**
 * Evaluate a tech's prerequisites block.
 * Returns 1 if all prereqs are met, 0 otherwise.
 */
export function evaluatePrerequisites(
  _techId: string,
  tech: { prerequisites?: unknown[] },
  atomicFacts: AtomicFacts,
  techState: TechStateMap,
  ctx?: EvalContext,
): number {
  if (!tech.prerequisites) return 1;
  return evaluateNode(tech.prerequisites, atomicFacts, techState, ctx) ? 1 : 0;
}
