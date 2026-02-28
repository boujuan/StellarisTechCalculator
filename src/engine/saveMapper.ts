/**
 * Save mapper — converts parsed save data to calculator state.
 *
 * Maps DLCs, ethics, authority, civics, origins, traditions, ascension perks,
 * country flags, policies, technologies, council leaders, starbases, resources,
 * species traits, deposits, districts, megastructures, and more to
 * atomic facts + scalars + expertise counts.
 * Unknown keys are logged as warnings but don't cause errors.
 */
import type {
  ParsedSaveData,
  CalculatorSaveState,
  ImportLogEntry,
  LogLevel,
} from "../types/saveGame";
import { defaultAtomicFacts, allTechIds } from "../state/dataStore";

// ── Internal log accumulator ─────────────────────────────────────────────

let _log: ImportLogEntry[] = [];

function log(level: LogLevel, message: string): void {
  _log.push({ level, message, timestamp: Date.now() });
}

// ── Known atomic fact keys (for validation) ──────────────────────────────

const KNOWN_FACTS = new Set(Object.keys(defaultAtomicFacts));
const KNOWN_TECH_IDS = new Set(allTechIds);

function setFact(
  facts: Record<string, boolean>,
  key: string,
  sourceKeys: string[],
): boolean {
  if (KNOWN_FACTS.has(key)) {
    facts[key] = true;
    sourceKeys.push(key);
    return true;
  }
  return false;
}

// ── DLC mapping ──────────────────────────────────────────────────────────

const DLC_MAP: Record<string, string[]> = {
  "Utopia": ["has_utopia:yes", "host_has_dlc:Utopia"],
  "Apocalypse": ["host_has_dlc:Apocalypse"],
  "Distant Stars Story Pack": ["host_has_dlc:Distant Stars Story Pack"],
  "Megacorp": ["host_has_dlc:Megacorp"],
  "Ancient Relics Story Pack": ["has_ancrel:yes"],
  "Federations": ["host_has_dlc:Federations"],
  "Nemesis": ["has_nemesis:yes"],
  "Overlord": ["has_overlord_dlc:yes"],
  "First Contact Story Pack": ["has_first_contact_dlc:yes"],
  "Galactic Paragons": ["has_paragon_dlc:yes"],
  "Astral Planes": ["has_astral_planes_dlc:yes"],
  "The Machine Age": ["has_machine_age_dlc:yes"],
  "Cosmic Storms": ["has_cosmic_storms_dlc:yes"],
  "Grand Archive": ["has_grand_archive_dlc:yes"],
  "BioGenesis": ["has_biogenesis_dlc:yes"],
  "Shadows of the Shroud": ["has_shroud_dlc:yes"],
  "Infernals Species Pack": ["has_infernals:yes"],
};

// ── Authority mapping ────────────────────────────────────────────────────

const AUTHORITY_MAP: Record<string, string[]> = {
  "auth_hive_mind": ["is_hive_empire:yes", "is_gestalt:yes"],
  "auth_machine_intelligence": ["is_machine_empire:yes", "is_gestalt:yes"],
  "auth_corporate": ["is_megacorp:yes", "is_regular_empire:yes"],
  "auth_cloning": ["is_cloning_authority:yes", "is_regular_empire:yes"],
  "auth_democratic": ["is_regular_empire:yes"],
  "auth_oligarchic": ["is_regular_empire:yes"],
  "auth_dictatorial": ["is_regular_empire:yes"],
  "auth_imperial": ["is_regular_empire:yes"],
};

// ── Civic-derived extra facts ────────────────────────────────────────────

const CIVIC_EXTRA_FACTS: Record<string, string[]> = {
  "civic_anglers": ["is_anglers_empire:yes"],
  "civic_machine_guided_sapience": ["is_guided_sapience_empire:yes"],
  "civic_fanatic_purifiers": ["has_valid_civic:civic_fanatic_purifiers"],
  "civic_hive_devouring_swarm": ["has_valid_civic:civic_hive_devouring_swarm"],
  "civic_machine_assimilator": [
    "has_civic:civic_machine_assimilator",
    "has_valid_civic:civic_machine_assimilator",
  ],
  "civic_machine_servitor": [
    "has_civic:civic_machine_servitor",
    "has_valid_civic:civic_machine_servitor",
  ],
  "civic_machine_terminator": ["has_valid_civic:civic_machine_terminator"],
  "civic_agrarian_idyll": ["has_valid_civic:civic_agrarian_idyll"],
  "civic_inwards_perfection": ["has_civic:civic_inwards_perfection"],
  "civic_dystopian_society": ["has_civic:civic_dystopian_society"],
  "civic_police_state": ["has_valid_civic:civic_police_state"],
  "civic_natural_design": ["has_valid_civic:civic_natural_design"],
  "civic_hive_natural_design": ["has_valid_civic:civic_hive_natural_design"],
  "civic_scorched_earth": ["has_valid_civic:civic_scorched_earth"],
  "civic_hive_scorched_earth": ["has_valid_civic:civic_hive_scorched_earth"],
  "civic_memorialist": ["is_memorialist_empire:yes"],
  "civic_hive_memorialist": ["is_memorialist_empire:yes"],
  "civic_machine_memorialist": ["is_memorialist_empire:yes"],
  "civic_catalytic_processing": ["is_catalytic_empire:yes"],
  "civic_hive_catalytic_processing": ["is_catalytic_empire:yes"],
  "civic_corporate_catalytic_processing": ["is_catalytic_empire:yes"],
  "civic_machine_catalytic_processing": ["is_catalytic_empire:yes"],
  "civic_hive_beastmasters": ["is_beastmasters_empire:yes"],
  "civic_machine_world_forger": ["is_world_forger_empire:yes"],
  "civic_eager_explorers": ["is_eager_explorer_empire:yes"],
  "civic_hive_eager_explorers": ["is_eager_explorer_empire:yes"],
  "civic_dimensional_worship": ["is_dimensional_worship_empire:yes"],
  "civic_hive_entropy_drinkers": ["is_entropy_drinkers_empire:yes"],
  "civic_galactic_curators": ["is_galactic_curators_empire:yes"],
  "civic_machine_galactic_curators": ["is_galactic_curators_empire:yes"],
  "civic_wilderness_commune": ["is_wilderness_empire:yes"],
  "civic_hive_wilderness": ["is_wilderness_empire:yes"],
  "civic_storm_chasers": ["has_storm_attraction_civic:yes"],
  "civic_hive_storm_chasers": ["has_storm_attraction_civic:yes"],
  "civic_machine_storm_chasers": ["has_storm_attraction_civic:yes"],
  "civic_void_dwellers": ["is_void_dweller_empire:yes"],
  "civic_hive_void_dwellers": ["is_void_dweller_empire:yes"],
  "civic_machine_void_dwellers": ["is_void_dweller_empire:yes"],
  "civic_tankbound": ["is_tankbound_empire:yes"],
  "civic_hive_tankbound": ["is_tankbound_empire:yes"],
  "civic_infernal": ["is_infernal_empire:yes"],
  "civic_machine_infernal": ["is_infernal_empire:yes"],
};

// ── Policy mapping (structured active_policies) ─────────────────────────

const POLICY_MAP: Record<string, Record<string, string>> = {
  "artificial_intelligence_policy": {
    "ai_outlawed": "has_policy_flag:ai_outlawed",
  },
  "robot_pop_policy": {
    "robot_pops_outlawed": "has_policy_flag:robots_outlawed",
  },
};

// ── Policy flag mapping (flat policy_flags list) ─────────────────────────

const POLICY_FLAG_MAP: Record<string, string> = {
  "slavery_allowed": "allows_slavery:yes",
  "ai_outlawed": "has_policy_flag:ai_outlawed",
  "robots_outlawed": "has_policy_flag:robots_outlawed",
};

// ── Resource → atomic fact mapping ───────────────────────────────────────

const RESOURCE_FACTS: Record<string, string> = {
  "sr_dark_matter": "sr_dark_matter:1",
  "nanites": "nanites:1",
  "minor_artifacts": "minor_artifacts:1",
  "astral_threads": "astral_threads:1",
};

// ── Organic species classes ──────────────────────────────────────────────

const ORGANIC_CLASSES = new Set([
  "HUM", "MAM", "REP", "AVI", "ART", "MOL", "FUN", "PLA", "LIT",
  "AQU", "TOX", "INF", "NECROID", "PRESAPIENT",
]);

// ── Starbase level rank (for cumulative counting) ────────────────────────

const STARBASE_LEVEL_RANK: Record<string, number> = {
  "starbase_level_starport": 1,
  "starbase_level_starhold": 2,
  "starbase_level_starfortress": 3,
  "starbase_level_citadel": 4,
};

// ── Main mapper function ─────────────────────────────────────────────────

export function mapSaveToCalculatorState(
  parsed: ParsedSaveData,
): { state: CalculatorSaveState; log: ImportLogEntry[] } {
  _log = [];

  const facts: Record<string, boolean> = {};
  const scalars: Record<string, number> = {};
  const sourceKeys: string[] = [];
  const techResearched: string[] = [];
  const expertiseCounts: Record<string, Record<number, number>> = {};
  const councillorLevels = { shroudwalker_teacher: 0, storm_caller: 0 };

  // ── DLCs ────────────────────────────────────────────────────────────

  // First, set all DLC facts to false (since we're replacing defaults)
  for (const factKeys of Object.values(DLC_MAP)) {
    for (const key of factKeys) {
      if (KNOWN_FACTS.has(key)) {
        facts[key] = false;
      }
    }
  }

  let dlcMapped = 0;
  for (const dlcName of parsed.meta.dlcs) {
    const factKeys = DLC_MAP[dlcName];
    if (factKeys) {
      for (const key of factKeys) {
        setFact(facts, key, sourceKeys);
      }
      dlcMapped++;
    }
    // DLCs without mapping (cosmetic packs) are silently skipped
  }
  log("success", `Mapped ${dlcMapped} DLCs to atomic facts`);

  // ── Game year ───────────────────────────────────────────────────────

  scalars["Current Game Year"] = parsed.meta.year;
  sourceKeys.push("Current Game Year");
  log("info", `Game year: ${parsed.meta.year}`);

  // ── Ethics ──────────────────────────────────────────────────────────

  // Clear all ethics first
  for (const key of KNOWN_FACTS) {
    if (key.startsWith("has_ethic:")) {
      facts[key] = false;
    }
  }

  for (const ethic of parsed.country.ethics) {
    const key = `has_ethic:${ethic}`;
    if (setFact(facts, key, sourceKeys)) {
      // Check for fanatic pacifist special fact
      if (ethic === "ethic_fanatic_pacifist") {
        setFact(facts, "is_fanatic_pacifist:yes", sourceKeys);
      }
    } else {
      log("warning", `Unknown ethic: ${ethic}`);
    }
  }

  // ── Authority ───────────────────────────────────────────────────────

  // Clear empire type facts first
  for (const key of [
    "is_hive_empire:yes",
    "is_machine_empire:yes",
    "is_gestalt:yes",
    "is_megacorp:yes",
    "is_regular_empire:yes",
    "is_cloning_authority:yes",
  ]) {
    if (KNOWN_FACTS.has(key)) facts[key] = false;
  }

  if (parsed.country.authority) {
    const authorityFacts = AUTHORITY_MAP[parsed.country.authority];
    if (authorityFacts) {
      for (const key of authorityFacts) {
        setFact(facts, key, sourceKeys);
      }
    } else {
      log("warning", `Unknown authority: ${parsed.country.authority}`);
    }
  }

  // ── Civics ──────────────────────────────────────────────────────────

  let civicsMapped = 0;
  let civicsSkipped = 0;

  for (const civic of parsed.country.civics) {
    let mapped = false;

    // Direct has_civic:*
    const civicKey = `has_civic:${civic}`;
    if (setFact(facts, civicKey, sourceKeys)) mapped = true;

    // Direct has_valid_civic:*
    const validKey = `has_valid_civic:${civic}`;
    if (setFact(facts, validKey, sourceKeys)) mapped = true;

    // Extra derived facts
    const extras = CIVIC_EXTRA_FACTS[civic];
    if (extras) {
      for (const key of extras) {
        if (setFact(facts, key, sourceKeys)) mapped = true;
      }
    }

    if (mapped) civicsMapped++;
    else civicsSkipped++;
  }

  if (civicsSkipped > 0) {
    log(
      "info",
      `${civicsMapped} civics mapped, ${civicsSkipped} with no matching facts`,
    );
  } else {
    log("info", `${civicsMapped} civics mapped`);
  }

  // ── Origin ──────────────────────────────────────────────────────────

  // Clear origins first
  for (const key of KNOWN_FACTS) {
    if (key.startsWith("has_origin:")) facts[key] = false;
  }

  if (parsed.country.origin) {
    const originKey = `has_origin:${parsed.country.origin}`;
    if (!setFact(facts, originKey, sourceKeys)) {
      log("info", `Origin ${parsed.country.origin} has no matching fact`);
    }
  }

  // ── Traditions ──────────────────────────────────────────────────────

  let tradMapped = 0;
  for (const tradition of parsed.country.traditions) {
    const key = `has_tradition:${tradition}`;
    if (setFact(facts, key, sourceKeys)) tradMapped++;
  }
  log(
    "success",
    `Mapped ${tradMapped} of ${parsed.country.traditions.length} traditions`,
  );

  // ── Ascension perks ─────────────────────────────────────────────────

  let apMapped = 0;
  for (const perk of parsed.country.ascensionPerks) {
    const key = `has_ascension_perk:${perk}`;
    if (setFact(facts, key, sourceKeys)) apMapped++;
  }
  log(
    "success",
    `Mapped ${apMapped} of ${parsed.country.ascensionPerks.length} ascension perks`,
  );

  // AP slot count — num_ascension_perk_slots:6 is true when ≥ 6 APs used
  if (parsed.country.ascensionPerks.length >= 6) {
    setFact(facts, "num_ascension_perk_slots:6", sourceKeys);
  }

  // ── Country flags ───────────────────────────────────────────────────

  let flagsMapped = 0;
  for (const flag of parsed.country.countryFlags) {
    const key = `has_country_flag:${flag}`;
    if (setFact(facts, key, sourceKeys)) flagsMapped++;
  }
  log(
    "info",
    `Mapped ${flagsMapped} country flags (of ${parsed.country.countryFlags.length} total)`,
  );

  // ── Policies (structured) ─────────────────────────────────────────

  let policiesMapped = 0;
  for (const [policyName, selected] of Object.entries(
    parsed.country.policies,
  )) {
    const policyOptions = POLICY_MAP[policyName];
    if (policyOptions) {
      const factKey = policyOptions[selected];
      if (factKey && setFact(facts, factKey, sourceKeys)) {
        policiesMapped++;
      }
    }
  }

  // ── Policy flags (flat list) ──────────────────────────────────────

  for (const flag of parsed.country.policyFlags) {
    const factKey = POLICY_FLAG_MAP[flag];
    if (factKey && setFact(facts, factKey, sourceKeys)) {
      policiesMapped++;
    }
  }

  if (policiesMapped > 0) {
    log("info", `Mapped ${policiesMapped} policy flags`);
  }

  // ── Owned planets ───────────────────────────────────────────────────

  scalars["Number of Colonised Planets"] = parsed.country.ownedPlanetsCount;
  sourceKeys.push("Number of Colonised Planets");

  // ── Technologies ────────────────────────────────────────────────────

  let techMapped = 0;
  let techSkipped = 0;
  for (const tech of parsed.country.technologies) {
    if (KNOWN_TECH_IDS.has(tech)) {
      techResearched.push(tech);
      techMapped++;
    } else {
      techSkipped++;
    }
  }

  log("success", `${techMapped} technologies loaded`);
  if (techSkipped > 0) {
    log(
      "warning",
      `Skipped ${techSkipped} unknown tech IDs (possibly modded)`,
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // Phase 2 mappings
  // ══════════════════════════════════════════════════════════════════════

  // ── Council leaders → traits, expertise, councillor levels ─────────

  let leaderTraitsMapped = 0;
  let maxCouncilSkill = 1;

  for (const leader of parsed.country.councilLeaders) {
    if (leader.level > maxCouncilSkill) maxCouncilSkill = leader.level;

    // Detect shroudwalker teacher / storm caller council positions
    if (leader.councilType === "councilor_shroudwalker_teacher") {
      councillorLevels.shroudwalker_teacher = leader.level;
    }
    if (leader.councilType === "councilor_storm_callers") {
      councillorLevels.storm_caller = leader.level;
    }

    for (const trait of leader.traits) {
      // Set TRAIT:* atomic fact
      if (setFact(facts, `TRAIT:${trait}`, sourceKeys)) {
        leaderTraitsMapped++;
      }

      // Expertise counting — accumulate per category across leaders
      const expertiseMatch = trait.match(/^leader_trait_expertise_(\w+?)(_[23])?$/);
      if (expertiseMatch) {
        const category = expertiseMatch[1];
        const tier = expertiseMatch[2] === "_2" ? 2 : expertiseMatch[2] === "_3" ? 3 : 1;
        if (!expertiseCounts[category]) {
          expertiseCounts[category] = { 1: 0, 2: 0, 3: 0 };
        }
        expertiseCounts[category][tier]++;
      }
    }
  }

  scalars["Highest Councillor Base Skill"] = maxCouncilSkill;
  sourceKeys.push("Highest Councillor Base Skill");

  if (leaderTraitsMapped > 0) {
    log("success", `Mapped ${leaderTraitsMapped} leader traits from ${parsed.country.councilLeaders.length} council leaders`);
  }

  const expertiseCategories = Object.keys(expertiseCounts);
  if (expertiseCategories.length > 0) {
    log("info", `Expertise categories detected: ${expertiseCategories.join(", ")}`);
  }

  // ── Starbases (cumulative tier counting) ───────────────────────────

  let starport = 0, starhold = 0, starfortress = 0, citadel = 0;
  for (const sb of parsed.country.starbases) {
    const rank = STARBASE_LEVEL_RANK[sb.level] ?? 0;
    if (rank >= 1) starport++;
    if (rank >= 2) starhold++;
    if (rank >= 3) starfortress++;
    if (rank >= 4) citadel++;
  }

  scalars["Number of Starbases Starport Tier or Higher"] = starport;
  scalars["Number of Starbases Starhold Tier or Higher"] = starhold;
  scalars["Number of Starbases Starfortress Tier or Higher"] = starfortress;
  scalars["Number of Starbases Citadel Tier or Higher"] = citadel;
  sourceKeys.push(
    "Number of Starbases Starport Tier or Higher",
    "Number of Starbases Starhold Tier or Higher",
    "Number of Starbases Starfortress Tier or Higher",
    "Number of Starbases Citadel Tier or Higher",
  );

  if (starport > 0) {
    log("info", `Starbases: ${starport} starport+, ${starhold} starhold+, ${starfortress} starfortress+, ${citadel} citadel`);
  }

  // ── Cosmic storms ─────────────────────────────────────────────────

  scalars["Number of Cosmic Storms Encountered"] = parsed.country.numCosmicStorms;
  sourceKeys.push("Number of Cosmic Storms Encountered");

  // ── Enslaved pops ──────────────────────────────────────────────────

  if (parsed.country.numPopsEnslaved > 0) {
    scalars["Number of Pops Enslaved"] = parsed.country.numPopsEnslaved;
    sourceKeys.push("Number of Pops Enslaved");
    log("info", `Enslaved pops: ${parsed.country.numPopsEnslaved}`);
  }

  // ── Communications ─────────────────────────────────────────────────

  scalars["Number of Communications"] = parsed.country.communications;
  sourceKeys.push("Number of Communications");

  // ── Species detection ─────────────────────────────────────────────

  const species = parsed.country.founderSpecies;
  if (species.class) {
    if (ORGANIC_CLASSES.has(species.class)) {
      setFact(facts, "is_organic_species:yes", sourceKeys);
      setFact(facts, "has_any_dna:yes", sourceKeys);
      setFact(facts, "country_uses_food:yes", sourceKeys);
    }
    if (species.class === "LIT" || species.class === "LITHOID") {
      setFact(facts, "is_lithoid_empire:yes", sourceKeys);
    }
    if (species.class === "ROBOT" || species.class === "MACHINE") {
      setFact(facts, "is_mechanical_empire:yes", sourceKeys);
    }

    // Non-gestalt empires use consumer goods
    if (!facts["is_gestalt:yes"]) {
      setFact(facts, "country_uses_consumer_goods:yes", sourceKeys);
    }

    // Species traits
    for (const trait of species.traits) {
      if (trait === "trait_psionic") {
        setFact(facts, "is_psionic_species:yes", sourceKeys);
        setFact(facts, "has_psionic_species_trait:yes", sourceKeys);
        setFact(facts, "has_psionic_ascension:yes", sourceKeys);
      }
      if (trait === "trait_latent_psionic") {
        setFact(facts, "is_latent_psionic_species:yes", sourceKeys);
      }
      if (trait === "trait_aquatic") {
        setFact(facts, "has_trait:trait_aquatic", sourceKeys);
      }
      if (trait === "trait_necrophage") {
        setFact(facts, "has_trait:trait_necrophage", sourceKeys);
      }
      if (trait === "trait_mechanical" || trait === "trait_machine_unit") {
        setFact(facts, "is_mechanical_empire:yes", sourceKeys);
      }
    }

    log("info", `Species: ${species.class}, ${species.traits.length} traits`);
  }

  // ── Resources ─────────────────────────────────────────────────────

  let resourcesMapped = 0;
  for (const [resource, factKey] of Object.entries(RESOURCE_FACTS)) {
    if ((parsed.country.resources[resource] ?? 0) > 0) {
      if (setFact(facts, factKey, sourceKeys)) resourcesMapped++;
    }
  }

  if (resourcesMapped > 0) {
    log("info", `Mapped ${resourcesMapped} strategic resources`);
  }

  // ── Space fauna / specimens (from flags or variables) ───────────────

  // Space fauna — check variable OR country flag
  if (parsed.country.faunaContacted ||
      parsed.country.countryFlags.includes("amoeba_encountered") ||
      parsed.country.countryFlags.includes("triggered_flightless_fauna")) {
    setFact(facts, "has_encountered_any_fauna:yes", sourceKeys);
  }

  // Specimens — check variable count OR country flag
  if (parsed.country.acquiredSpecimenCount >= 1 ||
      parsed.country.countryFlags.includes("first_specimen_acquired_event_occured")) {
    setFact(facts, "acquired_specimen_count:1", sourceKeys);
  }

  // ── Deposits (from planet scan) ───────────────────────────────────

  let depositsMapped = 0;
  for (const depositType of parsed.country.planetData.deposits) {
    if (setFact(facts, `has_deposit:${depositType}`, sourceKeys)) {
      depositsMapped++;
    }
  }
  if (depositsMapped > 0) {
    log("info", `Mapped ${depositsMapped} deposit types from owned planets`);
  }

  // ── Districts (from planet scan) ──────────────────────────────────

  let districtsMapped = 0;
  for (const districtType of parsed.country.planetData.districts) {
    if (setFact(facts, `${districtType}:1`, sourceKeys)) {
      districtsMapped++;
    }
  }
  if (districtsMapped > 0) {
    log("info", `Mapped ${districtsMapped} district types from owned planets`);
  }

  // Derived zone facts from districts
  const DISTRICT_TO_ZONE: Record<string, string> = {
    "district_generator": "has_any_generator_zone:yes",
    "district_hab_energy": "has_any_generator_zone:yes",
    "district_photosynthesis_fields": "has_any_generator_zone:yes",
    "district_mining": "has_any_mining_zone:yes",
    "district_hab_mining": "has_any_mining_zone:yes",
    "district_hollow_mountains": "has_any_mining_zone:yes",
  };

  // Farming districts have no individual `district_farming:1` fact —
  // set the zone aggregates directly
  const FARMING_DISTRICT_PREFIXES = ["district_farming", "district_rw_farming"];

  for (const districtType of parsed.country.planetData.districts) {
    const zoneKey = DISTRICT_TO_ZONE[districtType];
    if (zoneKey) setFact(facts, zoneKey, sourceKeys);

    if (FARMING_DISTRICT_PREFIXES.some(p => districtType.startsWith(p))) {
      setFact(facts, "has_any_agriculture_zone:yes", sourceKeys);
      setFact(facts, "has_any_capped_planet_farming_district:yes", sourceKeys);
    }
  }

  // ── Planet classes ────────────────────────────────────────────────

  for (const planetClass of parsed.country.planetData.planetClasses) {
    setFact(facts, `is_planet_class:${planetClass}`, sourceKeys);
  }

  // ── Megastructures ────────────────────────────────────────────────

  let megaMapped = 0;
  for (const megaType of parsed.country.megastructureTypes) {
    if (setFact(facts, `has_megastructure:${megaType}`, sourceKeys)) {
      megaMapped++;
    }
  }
  if (parsed.country.megastructureTypes.length > 0) {
    setFact(facts, "has_any_megastructure_in_empire:yes", sourceKeys);
    // Hyper relay → also a bypass
    if (parsed.country.megastructureTypes.some(t => t.startsWith("hyper_relay"))) {
      setFact(facts, "has_seen_any_bypass:relay_bypass", sourceKeys);
    }
    log("info", `Mapped ${megaMapped} megastructure types`);
  }

  // ── Nebula ────────────────────────────────────────────────────────

  if (parsed.country.isInsideNebula) {
    setFact(facts, "is_inside_nebula:yes", sourceKeys);
  }

  // ── Crisis levels (derived from APs + flags) ─────────────────────

  // Galactic Hyperthermia — AP implies at least level 1
  if (parsed.country.ascensionPerks.includes("ap_galactic_hyperthermia")) {
    let hyperLevel = 1;
    // Check flags for higher levels
    for (const flag of parsed.country.countryFlags) {
      const lvlMatch = flag.match(/^Hyperthermia_Lv(\d+)_unlocked$/);
      if (lvlMatch) {
        const lvl = parseInt(lvlMatch[1], 10);
        if (lvl > hyperLevel) hyperLevel = lvl;
      }
    }
    scalars["Galactic Hyperthermia Crisis Level"] = hyperLevel;
    sourceKeys.push("Galactic Hyperthermia Crisis Level");
  }

  // Cosmogenesis — AP implies at least level 1
  if (parsed.country.ascensionPerks.includes("ap_cosmogenesis")) {
    let cosmoLevel = 1;
    for (const flag of parsed.country.countryFlags) {
      const lvlMatch = flag.match(/^cosmogenesis_level_(\d+)$/);
      if (lvlMatch) {
        const lvl = parseInt(lvlMatch[1], 10);
        if (lvl > cosmoLevel) cosmoLevel = lvl;
      }
    }
    scalars["Cosmogenesis Crisis Level"] = cosmoLevel;
    sourceKeys.push("Cosmogenesis Crisis Level");
  }

  // Galactic Nemesis — AP implies at least level 1
  if (parsed.country.ascensionPerks.includes("ap_become_the_crisis")) {
    scalars["Galactic Nemesis Crisis Level"] = 1;
    sourceKeys.push("Galactic Nemesis Crisis Level");
  }

  // ── Summary ─────────────────────────────────────────────────────────

  log(
    "success",
    `Loaded empire: ${parsed.meta.name} (${parsed.meta.date})`,
  );

  return {
    state: {
      atomicFacts: facts,
      scalarValues: scalars,
      techResearched,
      expertiseCounts,
      councillorLevels,
      saveSourceKeys: sourceKeys,
    },
    log: _log,
  };
}
