/** Map of "key:value" → boolean */
export type AtomicFacts = Record<string, boolean>;

/** Scalar slider definition from atomic_facts_scalar_metadata.json */
export interface ScalarMetadata {
  type: "slider";
  min: number;
  max: number;
  step: number;
  default: number;
  /** Map of "fact_key:threshold" → numeric threshold value */
  values: Record<string, number>;
}

/** Map of display_name → ScalarMetadata */
export type ScalarMetadataMap = Record<string, ScalarMetadata>;

/**
 * Section structure from atomic_facts_metadata.json.
 * Sections can contain flat facts or nested subsections.
 */
export interface SectionFacts {
  facts: Record<string, string[]>;
}

export type SectionData = SectionFacts | Record<string, SectionFacts>;

/** Top-level metadata: section_name → section data */
export type MetadataSections = Record<string, SectionData>;

/** Technology swap entry */
export interface TechSwapEntry {
  trigger: unknown;
  name?: string;
  real_name?: string;
  area?: string;
  category?: string;
  inherit_icon?: string | boolean;
}

/** Map of tech_id → [swap_entry] */
export type TechSwaps = Record<string, TechSwapEntry[]>;

/** Map of tech_id → [swap_entry] for conditional names */
export type ConditionalNames = Record<string, TechSwapEntry[]>;

/** Unlock index: tech_id → [tech_ids_it_unlocks] */
export type UnlockIndex = Record<string, string[]>;

/** Expertise tier map: tier (1-3) → count of councillors at that tier */
export type ExpertiseTierMap = Record<number, number>;

/** Council expertise: category → tier map */
export type CouncilExpertise = Record<string, ExpertiseTierMap>;

/** Councillor levels */
export interface CouncillorLevels {
  shroudwalker_teacher: number;
  storm_caller: number;
}
