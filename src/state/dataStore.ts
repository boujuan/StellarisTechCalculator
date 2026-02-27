/**
 * Static data store — loads all JSON data files and provides indexed lookups.
 * This module contains no reactive state; it's pure data loaded once at init.
 */
import type {
  TechDatabase,
  Technology,
  Area,
} from "../types/tech";
import type {
  AtomicFacts,
  ScalarMetadataMap,
  MetadataSections,
  TechSwaps,
  ConditionalNames,
  UnlockIndex,
} from "../types/facts";

import rawTechnologies from "../data/technologies.json";
import rawAtomicFacts from "../data/atomic_facts.json";
import rawMetadata from "../data/atomic_facts_metadata.json";
import rawScalarMetadata from "../data/atomic_facts_scalar_metadata.json";
import rawTechSwaps from "../data/technology_swaps.json";
import rawConditionalNames from "../data/technology_conditional_names.json";
import rawUnlockIndex from "../data/unlock_index.json";

// ── Typed data ──────────────────────────────────────────────────────────

export const technologies: TechDatabase = rawTechnologies as TechDatabase;
export const defaultAtomicFacts: AtomicFacts = rawAtomicFacts as AtomicFacts;
export const metadata: MetadataSections = rawMetadata as MetadataSections;
export const scalarMetadata: ScalarMetadataMap = rawScalarMetadata as ScalarMetadataMap;
export const techSwaps: TechSwaps = rawTechSwaps as TechSwaps;
export const conditionalNames: ConditionalNames = rawConditionalNames as ConditionalNames;
export const unlockIndex: UnlockIndex = rawUnlockIndex as UnlockIndex;

// ── Derived indexes (computed once at module load) ──────────────────────

/** All tech IDs as a sorted array */
export const allTechIds: string[] = Object.keys(technologies).sort();

/** Tech IDs grouped by area */
export const techsByArea: Record<Area, string[]> = {
  physics: [],
  society: [],
  engineering: [],
};
for (const id of allTechIds) {
  techsByArea[technologies[id].area].push(id);
}

/** Tech IDs grouped by tier */
export const techsByTier: Record<number, string[]> = {};
for (const id of allTechIds) {
  const tier = technologies[id].tier;
  (techsByTier[tier] ??= []).push(id);
}

/** Quick lookup: get a tech by ID */
export function getTech(id: string): Technology {
  return technologies[id];
}

// ── Default state constants ─────────────────────────────────────────────

/** Techs that start researched in a fresh game */
export const ALWAYS_RESEARCHED: string[] = [
  "tech_solar_panel_network",
  "tech_space_exploration",
  "tech_starbase_1",
  "tech_starbase_2",
  "tech_assault_armies",
  "tech_ship_armor_1",
  "tech_thrusters_1",
  "tech_space_defense_station_1",
  "tech_basic_industry",
  "tech_mechanized_mining",
  "tech_space_construction",
  "tech_flak_batteries_1",
  "tech_fission_power",
  "tech_reactor_boosters_1",
  "tech_shields_1",
  "tech_power_plant_1",
  "tech_pd_tracking_1",
  "tech_planetary_defenses",
  "tech_industrial_farming",
  "tech_colonization_1",
];

/** Techs that are permanently available (never appear in the tech pool) */
export const PERMANENT_TECHS: string[] = [
  "tech_basic_science_lab_1",
  "tech_hyper_drive_1",
  "tech_planetary_government",
  "tech_maulers",
  "tech_weavers",
  "tech_weaver_bio_evasion_1",
  "tech_weaver_bio_anti_evasion_1",
  "tech_corvettes",
  "tech_subspace_drive",
  "tech_critter_feeder",
  "tech_missiles_1",
  "tech_interplanetary_commerce",
  "tech_hydroponics",
  "tech_basic_health",
  "tech_holo_entertainment",
  "tech_hive_node",
  "tech_wilderness_node",
  "tech_mass_drivers_1",
  "tech_lasers_1",
];

/** Backend facts that are always true */
export const TRUE_BACKEND_FACTS: string[] = [
  "True: Always",
  "True: Days Passed ",
  "True: Dummy relations",
  "True: Permanent Anyway",
  "True: Isn't AI",
  "True: Dummy country relations",
  "True: Unsure as to how to handle",
  "True: Unsure but might be all",
];

/** Default scalar values */
export const DEFAULT_SCALARS: Record<string, number> = {
  "Behemoth Fury Crisis Level": 0,
  "Cosmogenesis Crisis Level": 0,
  "Current Game Year": 2200,
  "Galactic Hyperthermia Crisis Level": 0,
  "Galactic Nemesis Crisis Level": 0,
  "Highest Councillor Base Skill": 1,
  "Number of Colonised Planets": 1,
  "Number of Communications": 0,
  "Number of Cosmic Storms Encountered": 0,
  "Number of Pops Enslaved": 0,
  "Number of Pops in Synaptic Lathe": 0,
  "Number of Starbases Citadel Tier or Higher": 0,
  "Number of Starbases Starfortress Tier or Higher": 0,
  "Number of Starbases Starhold Tier or Higher": 0,
  "Number of Starbases Starport Tier or Higher": 1,
  "Space Weather Exploitation Resolution Level": 0,
};

/** Archaeotech IDs (for inline script penalty calculation) */
export const ARCHAEOTECH_IDS: string[] = [
  "tech_archaeoshield",
  "tech_archaeoarmor",
  "tech_archaeo_detection_scrambler",
  "tech_archaeo_titan_beam",
  "tech_archaeo_pk_devolving_beam",
  "tech_archaeo_mass_drivers",
  "tech_archaeo_lasers",
  "tech_archaeo_point_defence",
  "tech_archaeo_missiles",
  "tech_archaeo_mass_accelerator",
  "tech_archaeo_strike_crafts",
  "tech_archaeo_rampart",
  "tech_archaeo_overcharger",
  "tech_archaeo_refinery",
];
