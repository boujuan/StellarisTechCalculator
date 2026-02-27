import type { WeightMap } from "./tech";

/** Input sent to the Monte Carlo worker */
export interface MonteCarloInput {
  /** Map of tech_id → weight, already filtered to positive weights */
  weightMap: WeightMap;
  /** Number of research alternatives (draws) */
  draws: number;
  /** Max simulation iterations (default 20000) */
  maxIterations?: number;
}

/** Output returned from the Monte Carlo worker */
export interface MonteCarloOutput {
  /** Map of tech_id → hit chance percentage (0-100) */
  chances: Record<string, number>;
  /** Number of iterations actually performed */
  iterations: number;
  /** Time in milliseconds */
  elapsed: number;
}
