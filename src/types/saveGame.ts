/** Types for Stellaris save game parsing and import */

/** Log entry severity levels */
export type LogLevel = "info" | "success" | "warning" | "error";

/** A single log entry from the import process */
export interface ImportLogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
}

/** Parsed metadata from the save's `meta` file */
export interface ParsedMeta {
  version: string;
  date: string;
  year: number;
  name: string;
  dlcs: string[];
}

/** A council leader with traits and skill level */
export interface ParsedLeader {
  id: number;
  traits: string[];
  level: number;
  councilType: string;
}

/** Founder species class and traits */
export interface ParsedSpecies {
  class: string;
  traits: string[];
}

/** A player-owned starbase with its tier level */
export interface ParsedStarbase {
  level: string;
}

/** Aggregated planet-level data across all owned planets */
export interface ParsedPlanetData {
  deposits: string[];
  districts: string[];
  planetClasses: string[];
}

/** Parsed data from the player's country section */
export interface ParsedCountry {
  // Phase 1
  ethics: string[];
  authority: string;
  civics: string[];
  origin: string;
  technologies: string[];
  traditions: string[];
  ascensionPerks: string[];
  countryFlags: string[];
  ownedPlanetsCount: number;
  policies: Record<string, string>;
  // Phase 2
  policyFlags: string[];
  numCosmicStorms: number;
  acquiredSpecimenCount: number;
  faunaContacted: boolean;
  communications: number;
  councilLeaders: ParsedLeader[];
  founderSpecies: ParsedSpecies;
  resources: Record<string, number>;
  ownedPlanetIds: number[];
  starbases: ParsedStarbase[];
  megastructureTypes: string[];
  planetData: ParsedPlanetData;
  isInsideNebula: boolean;
  numPopsEnslaved: number;
  researchAlternatives: number | null;
  techInProgress: string[];
}

/** Full parsed save data returned from the Web Worker */
export interface ParsedSaveData {
  meta: ParsedMeta;
  country: ParsedCountry;
  log: ImportLogEntry[];
}

/** Calculator state produced by the mapper (ready to apply) */
export interface CalculatorSaveState {
  atomicFacts: Record<string, boolean>;
  scalarValues: Record<string, number>;
  techResearched: string[];
  expertiseCounts: Record<string, Record<number, number>>;
  councillorLevels: { shroudwalker_teacher: number; storm_caller: number };
  researchAlternatives: number | null;
  /** Tech IDs currently being researched (from research queues) */
  techInProgress: string[];
  /** Keys of facts that were set from the save (for indicator dots) */
  saveSourceKeys: string[];
}
