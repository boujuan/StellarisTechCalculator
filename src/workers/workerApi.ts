/**
 * Worker API — wraps the Monte Carlo Web Worker with Comlink.
 * Provides async computeHitChances() that dispatches to the worker thread.
 */
import * as Comlink from "comlink";
import type { MonteCarloWorkerApi } from "./monteCarloWorker";
import type { WeightMap, Area } from "../types/tech";
import { technologies } from "../state/dataStore";
import { setHitChances } from "../state/techState";

let worker: Worker | null = null;
let api: Comlink.Remote<MonteCarloWorkerApi> | null = null;
let pendingAbort: AbortController | null = null;

/** Initialize the Web Worker (call once at app startup) */
export function initMonteCarloWorker(): void {
  worker = new Worker(
    new URL("./monteCarloWorker.ts", import.meta.url),
    { type: "module" },
  );
  api = Comlink.wrap<MonteCarloWorkerApi>(worker);
}

/** Terminate the worker */
export function terminateWorker(): void {
  worker?.terminate();
  worker = null;
  api = null;
}

/**
 * Dispatch Monte Carlo computation.
 * Groups techs by area and runs each area independently.
 * Cancels any in-flight computation.
 */
export async function dispatchHitChances(
  weightMap: WeightMap,
  draws: number,
): Promise<void> {
  if (!api) {
    if (import.meta.env.DEV) {
      console.warn("Monte Carlo worker not initialized");
    }
    return;
  }

  // Cancel previous in-flight computation
  pendingAbort?.abort();
  const abort = new AbortController();
  pendingAbort = abort;

  // Group by area
  const areaWeights: Record<Area, WeightMap> = {
    physics: {},
    society: {},
    engineering: {},
  };

  for (const [tid, weight] of Object.entries(weightMap)) {
    const tech = technologies[tid];
    if (tech) {
      areaWeights[tech.area][tid] = weight;
    }
  }

  // Run areas in parallel
  const promises: Promise<Record<string, number>>[] = [];
  for (const area of ["physics", "society", "engineering"] as Area[]) {
    const areaMap = areaWeights[area];
    if (Object.keys(areaMap).length === 0) continue;

    promises.push(
      api.computeHitChances(areaMap, draws, 20000).then((r) => r.chances),
    );
  }

  try {
    const results = await Promise.all(promises);

    // Check if this computation was cancelled
    if (abort.signal.aborted) return;

    // Merge all area results
    const merged: Record<string, number> = {};
    for (const result of results) {
      Object.assign(merged, result);
    }

    setHitChances(merged);
  } catch {
    // Silently handle aborted computations
  }
}
