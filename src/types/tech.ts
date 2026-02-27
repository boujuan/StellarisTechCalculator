/** A single modifier entry in weight_modifier array */
export type WeightModifier =
  | { modifier: Array<Record<string, unknown>> }
  | { inline_script: string };

/** Technology definition as stored in technologies.json */
export interface Technology {
  icon: string;
  real_name: string;
  location: string;
  area: "physics" | "society" | "engineering";
  category: string;
  tier: number;
  bordermod: "common" | "rare" | "dangerous";
  cost: number;
  weight: number;
  is_rare?: string;
  is_dangerous?: string;
  cost_per_level?: number | string;
  potential?: unknown[];
  prerequisites?: unknown[];
  weight_modifier?: WeightModifier[];
}

/** Per-tech runtime state (computed during update cascade) */
export interface TechState {
  current_weight: number;
  delta_weight: number;
  hit_chance: number;
  potential: number; // 0 or 1
  prereqs_met: number; // 0 or 1
  researched: number; // 0 or 1
  drawn_last: number; // 0 or 1
  permanent: number; // 0 or 1
}

/** Map of tech_id → Technology */
export type TechDatabase = Record<string, Technology>;

/** Map of tech_id → TechState */
export type TechStateMap = Record<string, TechState>;

/** Map of tech_id → weight (for Monte Carlo input) */
export type WeightMap = Record<string, number>;

/** Area name type */
export type Area = "physics" | "society" | "engineering";

/** Tier counts per area */
export type ResearchedCounts = Record<Area, Record<number, number>>;
