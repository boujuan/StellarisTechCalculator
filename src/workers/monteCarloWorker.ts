/**
 * Monte Carlo simulation worker — runs hit chance computation off the main thread.
 * Ported from LogicEngine.gd compute_hit_chances_single_area()
 *
 * Uses TypedArrays for better cache performance and binary search for O(log n)
 * weighted random selection.
 */
import * as Comlink from "comlink";

/**
 * Compute hit chances for all techs grouped by area.
 * Each area is simulated independently (physics, society, engineering).
 */
function computeHitChances(
  weightMap: Record<string, number>,
  draws: number,
  maxIterations: number = 20000,
): { chances: Record<string, number>; iterations: number; elapsed: number } {
  const start = performance.now();

  // Group by area (we need tech area info — passed via a naming convention
  // or we just run the full pool per-area). Since the worker doesn't have
  // access to the tech database, the caller should group by area before
  // dispatching. For simplicity, we accept already-grouped area maps.

  // For now, run the entire weight map as a single pool.
  // The caller (workerApi) handles per-area grouping.
  const result = computeSingleArea(weightMap, draws, maxIterations);

  const elapsed = performance.now() - start;
  return { chances: result.chances, iterations: result.iterations, elapsed };
}

/**
 * Run Monte Carlo simulation for a single area's tech pool.
 */
function computeSingleArea(
  weightMap: Record<string, number>,
  draws: number,
  maxIterations: number,
): { chances: Record<string, number>; iterations: number } {
  const techIds = Object.keys(weightMap);
  const n = techIds.length;

  // Early exit: if draws >= pool size, everything is 100%
  if (n <= draws) {
    const chances: Record<string, number> = {};
    for (const tid of techIds) {
      chances[tid] = 100;
    }
    return { chances, iterations: 0 };
  }

  // Build weight array
  const weights = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    weights[i] = weightMap[techIds[i]];
  }

  // Build prefix sums
  const basePrefixSums = new Float64Array(n);
  basePrefixSums[0] = weights[0];
  for (let i = 1; i < n; i++) {
    basePrefixSums[i] = basePrefixSums[i - 1] + weights[i];
  }

  // Win counters
  const wins = new Int32Array(n);

  // Convergence parameters
  const checkInterval = 500;
  const stableChecksNeeded = 4;
  const epsilon = 1; // 1% threshold

  let stableChecks = 0;
  let lastProbs: Float64Array | null = null;

  // Working copies (reused across iterations)
  const currentPrefixSums = new Float64Array(n);
  const currentWeights = new Float64Array(n);

  let iteration = 0;
  while (iteration < maxIterations) {
    iteration++;

    // Copy base arrays
    currentPrefixSums.set(basePrefixSums);
    currentWeights.set(weights);

    // Draw without replacement
    for (let d = 0; d < draws; d++) {
      const totalWeight = currentPrefixSums[n - 1];
      const pick = Math.random() * totalWeight;

      // Binary search for the chosen index
      const chosenIdx = binarySearchPrefix(currentPrefixSums, pick, n);

      // Record win
      wins[chosenIdx]++;

      // Remove chosen from pool by zeroing its weight and updating prefix sums
      const removedWeight = currentWeights[chosenIdx];
      currentWeights[chosenIdx] = 0;
      for (let i = chosenIdx; i < n; i++) {
        currentPrefixSums[i] -= removedWeight;
      }
    }

    // Convergence check
    if (iteration % checkInterval === 0) {
      const probs = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        probs[i] = (wins[i] * 100) / iteration;
      }

      if (lastProbs !== null) {
        let maxDiff = 0;
        for (let i = 0; i < n; i++) {
          const diff = Math.abs(probs[i] - lastProbs[i]);
          if (diff > maxDiff) maxDiff = diff;
        }

        if (maxDiff < epsilon) {
          stableChecks++;
        } else {
          stableChecks = 0;
        }

        if (stableChecks >= stableChecksNeeded) {
          break;
        }
      }

      lastProbs = probs;
    }
  }

  // Build results
  const chances: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    chances[techIds[i]] = (wins[i] * 100) / iteration;
  }

  return { chances, iterations: iteration };
}

/**
 * Binary search on prefix sums to find the index where target falls.
 */
function binarySearchPrefix(
  prefixSums: Float64Array,
  target: number,
  n: number,
): number {
  let low = 0;
  let high = n - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (target <= prefixSums[mid]) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
}

// Expose via Comlink
const api = {
  computeHitChances,
};

export type MonteCarloWorkerApi = typeof api;

Comlink.expose(api);
