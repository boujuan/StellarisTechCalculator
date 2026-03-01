/**
 * Save game parser — targeted extraction from PDX Clausewitz text format.
 *
 * Strategy: decompress ZIP → decode to string → indexOf to locate sections →
 * regex on small slices for key-value extraction.
 *
 * Phase 1: country 0 subsections (~2MB of ~65MB file)
 * Phase 2: top-level sections (leaders, starbases, planets, deposits,
 *          districts, megastructures, nebula, species_db) + cross-referencing
 */
import { unzipSync } from "fflate";
import type {
  ParsedMeta,
  ParsedCountry,
  ParsedSaveData,
  ParsedLeader,
  ParsedSpecies,
  ParsedStarbase,
  ParsedPlanetData,
  ImportLogEntry,
  LogLevel,
} from "../types/saveGame";

// ── Internal log accumulator ─────────────────────────────────────────────

let _log: ImportLogEntry[] = [];

function log(level: LogLevel, message: string): void {
  _log.push({ level, message, timestamp: Date.now() });
}

// ── Utility: find matching closing brace ─────────────────────────────────

function findMatchingBrace(text: string, openPos: number): number {
  let depth = 1;
  let inQuote = false;
  for (let i = openPos + 1; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') inQuote = !inQuote;
    if (inQuote) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// ── Extract a section slice by name within a parent slice ────────────────

function extractSection(
  text: string,
  sectionName: string,
  searchPrefix: string = "\t\t",
): string | null {
  const needle = searchPrefix + sectionName + "=";
  const idx = text.indexOf(needle);
  if (idx === -1) return null;

  const braceStart = text.indexOf("{", idx + needle.length);
  if (braceStart === -1) return null;

  const braceEnd = findMatchingBrace(text, braceStart);
  if (braceEnd === -1) return null;

  return text.slice(braceStart + 1, braceEnd);
}

// ── Extract all quoted strings from a block ──────────────────────────────

function extractQuotedStrings(text: string): string[] {
  const results: string[] = [];
  const re = /"([^"]+)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    results.push(m[1]);
  }
  return results;
}

// ── Extract all integers from a block ────────────────────────────────────

function extractIntegers(text: string): number[] {
  const results: number[] = [];
  const re = /\b(\d+)\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    results.push(parseInt(m[1], 10));
  }
  return results;
}

// ── Find a top-level section by name in gamestate ────────────────────────

function findTopLevelSection(gamestate: string, sectionName: string): string | null {
  const needle = "\n" + sectionName + "=";
  const idx = gamestate.indexOf(needle);
  if (idx === -1) return null;

  const braceStart = gamestate.indexOf("{", idx + needle.length);
  if (braceStart === -1) return null;

  const braceEnd = findMatchingBrace(gamestate, braceStart);
  if (braceEnd === -1) return null;

  return gamestate.slice(braceStart + 1, braceEnd);
}

// ── Find a numbered entry (e.g., "193={...}") within a section ───────────

function findNumberedEntry(text: string, id: number, prefix: string = "\t"): string | null {
  const needle = prefix + id + "=";
  let searchFrom = 0;
  while (true) {
    const idx = text.indexOf(needle, searchFrom);
    if (idx === -1) return null;

    // Make sure the character before the prefix (if any) is a newline or start
    if (idx > 0 && text[idx - 1] !== "\n") {
      searchFrom = idx + needle.length;
      continue;
    }

    const braceStart = text.indexOf("{", idx + needle.length);
    if (braceStart === -1) return null;

    // Ensure the brace is on the same or next line (not a distant match)
    const gap = text.slice(idx + needle.length, braceStart);
    if (gap.includes("}")) {
      searchFrom = idx + needle.length;
      continue;
    }

    const braceEnd = findMatchingBrace(text, braceStart);
    if (braceEnd === -1) return null;

    return text.slice(braceStart + 1, braceEnd);
  }
}

// ── Parse meta file ──────────────────────────────────────────────────────

function parseMeta(metaText: string): ParsedMeta {
  const version =
    metaText.match(/^version="([^"]+)"/m)?.[1] ?? "unknown";
  const date = metaText.match(/^date="([^"]+)"/m)?.[1] ?? "2200.01.01";
  const name = metaText.match(/^name="([^"]+)"/m)?.[1] ?? "Unknown Empire";

  // Extract year from date "YYYY.MM.DD"
  const year = parseInt(date.split(".")[0], 10) || 2200;

  // Extract DLCs from required_dlcs block
  const dlcBlock = extractSection(metaText, "required_dlcs", "");
  const dlcs = dlcBlock ? extractQuotedStrings(dlcBlock) : [];

  log("success", `Parsed meta: ${name} (${date}), v${version.split("v").pop()}`);
  log("info", `Found ${dlcs.length} DLCs`);

  return { version, date, year, name, dlcs };
}

// ── Find player country (country 0) slice ────────────────────────────────

function findPlayerCountry(gamestate: string): string | null {
  // Find the top-level country= section
  const countryIdx = gamestate.indexOf("country=\n{");
  if (countryIdx === -1) {
    log("error", "Could not find country= section in gamestate");
    return null;
  }

  // Find country 0 within it
  const c0Idx = gamestate.indexOf("\t0=\n\t{", countryIdx);
  if (c0Idx === -1) {
    log("error", "Could not find player country (id=0)");
    return null;
  }

  const braceStart = gamestate.indexOf("{", c0Idx + 3);
  if (braceStart === -1) return null;

  const braceEnd = findMatchingBrace(gamestate, braceStart);
  if (braceEnd === -1) {
    log("error", "Could not find end of player country block");
    return null;
  }

  const slice = gamestate.slice(braceStart, braceEnd + 1);
  log(
    "info",
    `Found player country (${(slice.length / 1024 / 1024).toFixed(1)} MB)`,
  );
  return slice;
}

// ── Phase 1 parsers (country subsections) ────────────────────────────────

function parseEthics(countrySlice: string): string[] {
  const ethosBlock = extractSection(countrySlice, "ethos");
  if (!ethosBlock) {
    log("warning", "Could not find ethos section");
    return [];
  }
  const ethics: string[] = [];
  const re = /ethic="([^"]+)"/g;
  let m;
  while ((m = re.exec(ethosBlock)) !== null) {
    ethics.push(m[1]);
  }
  log("info", `Found ${ethics.length} ethic(s): ${ethics.join(", ")}`);
  return ethics;
}

function parseGovernment(countrySlice: string): {
  authority: string;
  civics: string[];
  origin: string;
} {
  const govBlock = extractSection(countrySlice, "government");
  if (!govBlock) {
    log("warning", "Could not find government section");
    return { authority: "", civics: [], origin: "" };
  }

  const authority =
    govBlock.match(/authority="([^"]+)"/)?.[1] ?? "";
  const origin = govBlock.match(/origin="([^"]+)"/)?.[1] ?? "";

  // Civics are in a sub-block
  const civicsBlock = extractSection(govBlock, "civics", "\t\t\t");
  const civics = civicsBlock ? extractQuotedStrings(civicsBlock) : [];

  log(
    "info",
    `Government: ${authority}, ${civics.length} civics, origin: ${origin}`,
  );
  return { authority, civics, origin };
}

function parseTechStatus(countrySlice: string): string[] {
  const techBlock = extractSection(countrySlice, "tech_status");
  if (!techBlock) {
    log("warning", "Could not find tech_status section");
    return [];
  }
  const techs: string[] = [];
  const re = /technology="([^"]+)"/g;
  let m;
  while ((m = re.exec(techBlock)) !== null) {
    techs.push(m[1]);
  }
  log("success", `Found ${techs.length} researched technologies`);
  return techs;
}

function parseTraditions(countrySlice: string): string[] {
  const tradBlock = extractSection(countrySlice, "traditions");
  if (!tradBlock) {
    log("warning", "Could not find traditions section");
    return [];
  }
  const traditions = extractQuotedStrings(tradBlock);
  log("info", `Found ${traditions.length} traditions`);
  return traditions;
}

function parseAscensionPerks(countrySlice: string): string[] {
  const apBlock = extractSection(countrySlice, "ascension_perks");
  if (!apBlock) {
    log("info", "No ascension perks found");
    return [];
  }
  const perks = extractQuotedStrings(apBlock);
  log("info", `Found ${perks.length} ascension perks`);
  return perks;
}

function parseCountryFlags(countrySlice: string): string[] {
  const flagsBlock = extractSection(countrySlice, "flags");
  if (!flagsBlock) {
    log("info", "No country flags found");
    return [];
  }
  // Flags can be key=timestamp OR key={ flag_date=... } blocks
  const flags: string[] = [];
  const re = /^\t*(\w+)=/gm;
  let m;
  while ((m = re.exec(flagsBlock)) !== null) {
    // Skip internal fields of timed flags
    if (m[1] === "flag_date" || m[1] === "flag_days") continue;
    flags.push(m[1]);
  }
  log("info", `Found ${flags.length} country flags`);
  return flags;
}

function parseOwnedPlanetIds(countrySlice: string): number[] {
  const planetsBlock = extractSection(countrySlice, "owned_planets");
  if (!planetsBlock) {
    log("info", "No owned planets found");
    return [];
  }
  return extractIntegers(planetsBlock);
}

function parsePolicies(countrySlice: string): Record<string, string> {
  const policiesBlock = extractSection(countrySlice, "active_policies");
  if (!policiesBlock) {
    log("info", "No active policies found");
    return {};
  }
  const policies: Record<string, string> = {};
  // Each policy is a sub-block with policy="name" and selected="value"
  const re = /policy="([^"]+)"\s+selected="([^"]+)"/g;
  let m;
  while ((m = re.exec(policiesBlock)) !== null) {
    policies[m[1]] = m[2];
  }
  log("info", `Found ${Object.keys(policies).length} active policies`);
  return policies;
}

// ── Phase 2 parsers ──────────────────────────────────────────────────────

function parsePolicyFlags(countrySlice: string): string[] {
  const block = extractSection(countrySlice, "policy_flags");
  if (!block) return [];
  const flags = extractQuotedStrings(block);
  log("info", `Found ${flags.length} policy flags`);
  return flags;
}

function parseCountryScalars(countrySlice: string): {
  cosmicStorms: number;
  specimenCount: number;
  faunaContacted: boolean;
} {
  const cosmicStorms = parseInt(
    countrySlice.match(/num_cosmic_storms_encountered=(\d+)/)?.[1] ?? "0",
    10,
  );

  // Variables sub-block
  const variablesBlock = extractSection(countrySlice, "variables");
  let specimenCount = 0;
  let faunaContacted = false;
  if (variablesBlock) {
    const specimenMatch = variablesBlock.match(/acquired_specimen_count=(\d+)/);
    if (specimenMatch) specimenCount = parseInt(specimenMatch[1], 10);

    const faunaMatch = variablesBlock.match(/space_fauna_contacted=(\d+)/);
    if (faunaMatch) faunaContacted = parseInt(faunaMatch[1], 10) > 0;
  }

  if (cosmicStorms > 0) log("info", `Cosmic storms encountered: ${cosmicStorms}`);
  if (specimenCount > 0) log("info", `Acquired specimens: ${specimenCount}`);
  if (faunaContacted) log("info", "Space fauna contacted");

  return { cosmicStorms, specimenCount, faunaContacted };
}

function parseResources(countrySlice: string): Record<string, number> {
  const modulesBlock = extractSection(countrySlice, "modules");
  if (!modulesBlock) return {};

  const ecoBlock = extractSection(modulesBlock, "standard_economy_module", "\t\t\t");
  if (!ecoBlock) return {};

  const resourcesBlock = extractSection(ecoBlock, "resources", "");
  if (!resourcesBlock) return {};

  const resources: Record<string, number> = {};
  const re = /(\w+)=([0-9.]+)/g;
  let m;
  while ((m = re.exec(resourcesBlock)) !== null) {
    resources[m[1]] = parseFloat(m[2]);
  }
  log("info", `Found ${Object.keys(resources).length} resource types`);
  return resources;
}

function parseCommunications(countrySlice: string): number {
  const relBlock = extractSection(countrySlice, "relations_manager");
  if (!relBlock) return 0;

  // Count relation blocks that have communications=yes
  const re = /communications=yes/g;
  let count = 0;
  while (re.exec(relBlock) !== null) count++;

  if (count > 0) log("info", `Found ${count} communications`);
  return count;
}

function parseCouncilLeaders(
  gamestateText: string,
  countrySlice: string,
): ParsedLeader[] {
  // Step 1: Get council position IDs from country 0's government block
  const govBlock = extractSection(countrySlice, "government");
  if (!govBlock) return [];

  const positionsBlock = extractSection(govBlock, "council_positions", "\t\t\t");
  if (!positionsBlock) return [];

  const positionIds = extractIntegers(positionsBlock);
  if (positionIds.length === 0) return [];

  // Step 2: Find top-level council_positions section → map position ID to leader ID + type
  // Structure: council_positions={ council_positions={ <id>={ country=N leader=M type="..." } } }
  const councilOuter = findTopLevelSection(gamestateText, "council_positions");
  if (!councilOuter) {
    log("warning", "Could not find council_positions section");
    return [];
  }
  // Navigate into the inner council_positions sub-section
  const councilInner = extractSection(councilOuter, "council_positions", "\t") ?? councilOuter;

  const positionToLeader: Map<number, { leaderId: number; type: string }> = new Map();
  for (const posId of positionIds) {
    const posEntry = findNumberedEntry(councilInner, posId, "\t\t");
    if (!posEntry) continue;

    // Only get positions belonging to country 0
    const countryMatch = posEntry.match(/country=(\d+)/);
    if (!countryMatch || countryMatch[1] !== "0") continue;

    const leaderMatch = posEntry.match(/leader=(\d+)/);
    const typeMatch = posEntry.match(/type="([^"]+)"/);
    if (leaderMatch && typeMatch) {
      positionToLeader.set(posId, {
        leaderId: parseInt(leaderMatch[1], 10),
        type: typeMatch[1],
      });
    }
  }

  if (positionToLeader.size === 0) {
    log("info", "No council leaders found for player country");
    return [];
  }

  // Step 3: Find top-level leaders section → extract traits + level for each leader
  const leadersSection = findTopLevelSection(gamestateText, "leaders");
  if (!leadersSection) {
    log("warning", "Could not find leaders section");
    return [];
  }

  const result: ParsedLeader[] = [];
  for (const [, { leaderId, type }] of positionToLeader) {
    const leaderEntry = findNumberedEntry(leadersSection, leaderId);
    if (!leaderEntry) continue;

    const level = parseInt(leaderEntry.match(/level=(\d+)/)?.[1] ?? "1", 10);

    // Traits are repeated keys: traits="leader_trait_*"
    const traits: string[] = [];
    const traitRe = /traits="([^"]+)"/g;
    let tm;
    while ((tm = traitRe.exec(leaderEntry)) !== null) {
      traits.push(tm[1]);
    }

    result.push({ id: leaderId, traits, level, councilType: type });
  }

  log("success", `Found ${result.length} council leaders`);
  for (const leader of result) {
    log("info", `  ${leader.councilType}: level ${leader.level}, ${leader.traits.length} traits`);
  }

  return result;
}

function parseOwnedSystemIds(
  gamestateText: string,
  countrySlice: string,
): Set<number> {
  const systemIds = new Set<number>();

  // Get sector IDs from country 0: sectors={ owned={ 0 1 2 } }
  const sectorsBlock = extractSection(countrySlice, "sectors");
  if (!sectorsBlock) return systemIds;

  const ownedBlock = extractSection(sectorsBlock, "owned", "");
  if (!ownedBlock) return systemIds;

  const sectorIds = extractIntegers(ownedBlock);
  if (sectorIds.length === 0) return systemIds;

  // Find top-level sectors section
  const sectorsSection = findTopLevelSection(gamestateText, "sectors");
  if (!sectorsSection) return systemIds;

  // For each sector, extract its systems list
  for (const sectorId of sectorIds) {
    const sectorEntry = findNumberedEntry(sectorsSection, sectorId);
    if (!sectorEntry) continue;

    const systemsBlock = extractSection(sectorEntry, "systems", "");
    if (!systemsBlock) continue;

    for (const sysId of extractIntegers(systemsBlock)) {
      systemIds.add(sysId);
    }
  }

  return systemIds;
}

function buildOwnedStarbaseIds(
  gamestateText: string,
  ownedSystemIds: Set<number>,
): Set<number> {
  if (ownedSystemIds.size === 0) return new Set();

  // Each galactic_object (system) has starbases={ <sb_id> }
  // Look up each owned system to get its starbase ID
  const galacticObjects = findTopLevelSection(gamestateText, "galactic_object");
  if (!galacticObjects) return new Set();

  const sbIds = new Set<number>();
  for (const sysId of ownedSystemIds) {
    const entry = findNumberedEntry(galacticObjects, sysId);
    if (!entry) continue;
    const sbBlock = extractSection(entry, "starbases", "");
    if (!sbBlock) continue;
    for (const id of extractIntegers(sbBlock)) {
      // 4294967295 is the sentinel for "no starbase"
      if (id !== 4294967295) sbIds.add(id);
    }
  }

  return sbIds;
}

function parseStarbases(
  gamestateText: string,
  ownedStarbaseIds: Set<number>,
): ParsedStarbase[] {
  if (ownedStarbaseIds.size === 0) return [];

  const starbaseMgr = findTopLevelSection(gamestateText, "starbase_mgr");
  if (!starbaseMgr) {
    log("info", "No starbase_mgr section found");
    return [];
  }

  // Extract the starbases sub-section within starbase_mgr
  const starbasesBlock = extractSection(starbaseMgr, "starbases", "\t");
  if (!starbasesBlock) return [];

  const result: ParsedStarbase[] = [];
  // Look up each owned starbase by its ID
  for (const sbId of ownedStarbaseIds) {
    const entry = findNumberedEntry(starbasesBlock, sbId, "\t\t");
    if (!entry) continue;

    const levelMatch = entry.match(/level="([^"]+)"/);
    if (levelMatch) {
      result.push({ level: levelMatch[1] });
    }
  }

  if (result.length > 0) {
    const counts: Record<string, number> = {};
    for (const sb of result) {
      counts[sb.level] = (counts[sb.level] ?? 0) + 1;
    }
    const summary = Object.entries(counts)
      .map(([k, v]) => `${v} ${k.replace("starbase_level_", "")}`)
      .join(", ");
    log("success", `Found ${result.length} starbases: ${summary}`);
  }

  return result;
}

function parsePlanetDetails(
  gamestateText: string,
  planetIds: number[],
): ParsedPlanetData {
  if (planetIds.length === 0) {
    return { deposits: [], districts: [], planetClasses: [] };
  }

  // Build deposit ID → type lookup from top-level deposit= section
  // Entries are multi-line with nested blocks, so use entry iteration
  const depositSection = findTopLevelSection(gamestateText, "deposit");
  const depositTypeMap = new Map<number, string>();
  if (depositSection) {
    const entryRe = /\n\t(\d+)=\n/g;
    let m;
    while ((m = entryRe.exec(depositSection)) !== null) {
      const id = parseInt(m[1], 10);
      const braceStart = depositSection.indexOf("{", m.index + m[0].length);
      if (braceStart === -1) continue;
      const braceEnd = findMatchingBrace(depositSection, braceStart);
      if (braceEnd === -1) continue;
      const entry = depositSection.slice(braceStart + 1, braceEnd);
      const typeMatch = entry.match(/type="([^"]+)"/);
      if (typeMatch) depositTypeMap.set(id, typeMatch[1]);
    }
  }

  // Build district ID → type lookup from top-level districts= section
  const districtSection = findTopLevelSection(gamestateText, "districts");
  const districtTypeMap = new Map<number, string>();
  if (districtSection) {
    const entryRe = /\n\t(\d+)=\n/g;
    let m;
    while ((m = entryRe.exec(districtSection)) !== null) {
      const id = parseInt(m[1], 10);
      const braceStart = districtSection.indexOf("{", m.index + m[0].length);
      if (braceStart === -1) continue;
      const braceEnd = findMatchingBrace(districtSection, braceStart);
      if (braceEnd === -1) continue;
      const entry = districtSection.slice(braceStart + 1, braceEnd);
      const typeMatch = entry.match(/type="([^"]+)"/);
      if (typeMatch) districtTypeMap.set(id, typeMatch[1]);
    }
  }

  // Find top-level planets section
  const planetsSection = findTopLevelSection(gamestateText, "planets");
  if (!planetsSection) {
    log("warning", "Could not find planets section");
    return { deposits: [], districts: [], planetClasses: [] };
  }

  // Extract the planet sub-section (planets={ planet={ 0={...} 1={...} } })
  const planetDb = extractSection(planetsSection, "planet", "\t");
  if (!planetDb) {
    log("warning", "Could not find planet sub-section");
    return { deposits: [], districts: [], planetClasses: [] };
  }

  const allDeposits = new Set<string>();
  const allDistricts = new Set<string>();
  const allClasses = new Set<string>();

  for (const planetId of planetIds) {
    const planetEntry = findNumberedEntry(planetDb, planetId, "\t\t");
    if (!planetEntry) continue;

    // Planet class
    const classMatch = planetEntry.match(/planet_class="([^"]+)"/);
    if (classMatch) allClasses.add(classMatch[1]);

    // Deposits
    const depositsBlock = extractSection(planetEntry, "deposits", "");
    if (depositsBlock) {
      for (const depId of extractIntegers(depositsBlock)) {
        const depType = depositTypeMap.get(depId);
        if (depType) allDeposits.add(depType);
      }
    }

    // Districts
    const districtsBlock = extractSection(planetEntry, "districts", "");
    if (districtsBlock) {
      for (const distId of extractIntegers(districtsBlock)) {
        const distType = districtTypeMap.get(distId);
        if (distType) allDistricts.add(distType);
      }
    }
  }

  log("info", `Planet scan: ${allDeposits.size} deposit types, ${allDistricts.size} district types, ${allClasses.size} planet classes`);

  return {
    deposits: [...allDeposits],
    districts: [...allDistricts],
    planetClasses: [...allClasses],
  };
}

function parseFounderSpecies(
  gamestateText: string,
  countrySlice: string,
): ParsedSpecies {
  const emptySpecies: ParsedSpecies = { class: "", traits: [] };

  // Get founder species ref from country 0
  const refMatch = countrySlice.match(/founder_species_ref=(\d+)/);
  if (!refMatch) {
    log("info", "No founder_species_ref found");
    return emptySpecies;
  }
  const speciesRef = parseInt(refMatch[1], 10);

  // Find species_db top-level section
  const speciesDb = findTopLevelSection(gamestateText, "species_db");
  if (!speciesDb) {
    log("warning", "Could not find species_db section");
    return emptySpecies;
  }

  // Find the species entry by its ID
  const speciesEntry = findNumberedEntry(speciesDb, speciesRef);
  if (!speciesEntry) {
    log("warning", `Could not find species ref ${speciesRef} in species_db`);
    return emptySpecies;
  }

  const speciesClass = speciesEntry.match(/class="([^"]+)"/)?.[1] ?? "";

  // Traits are repeated keys: trait="trait_*"
  const traits: string[] = [];
  const traitBlock = extractSection(speciesEntry, "traits", "");
  if (traitBlock) {
    const re = /trait="([^"]+)"/g;
    let m;
    while ((m = re.exec(traitBlock)) !== null) {
      traits.push(m[1]);
    }
  }

  log("info", `Founder species: class=${speciesClass}, traits: ${traits.join(", ") || "none"}`);

  return { class: speciesClass, traits };
}

function parseMegastructures(gamestateText: string): string[] {
  const megaSection = findTopLevelSection(gamestateText, "megastructures");
  if (!megaSection) return [];

  const types: string[] = [];
  // Match entries with owner=0 and extract type
  const entryRe = /\t\d+=\n\t\{/g;
  let em;
  while ((em = entryRe.exec(megaSection)) !== null) {
    const braceStart = megaSection.indexOf("{", em.index);
    if (braceStart === -1) continue;
    const braceEnd = findMatchingBrace(megaSection, braceStart);
    if (braceEnd === -1) continue;

    const entry = megaSection.slice(braceStart + 1, braceEnd);
    // Check owner=0
    const ownerMatch = entry.match(/owner=(\d+)/);
    if (!ownerMatch || ownerMatch[1] !== "0") continue;

    const typeMatch = entry.match(/type="([^"]+)"/);
    if (typeMatch) types.push(typeMatch[1]);
  }

  if (types.length > 0) {
    log("info", `Found ${types.length} megastructures owned by player`);
  }

  return types;
}

function parseNebulaPresence(
  gamestateText: string,
  ownedSystemIds: Set<number>,
): boolean {
  if (ownedSystemIds.size === 0) return false;

  // Nebulae are repeated top-level blocks: nebula={ ... galactic_object=N ... }
  // Each block lists multiple galactic_object IDs for systems inside the nebula.
  const needle = "\nnebula=\n";
  let searchFrom = 0;
  while (true) {
    const idx = gamestateText.indexOf(needle, searchFrom);
    if (idx === -1) break;

    const braceStart = gamestateText.indexOf("{", idx + needle.length);
    if (braceStart === -1) break;

    const braceEnd = findMatchingBrace(gamestateText, braceStart);
    if (braceEnd === -1) break;

    const block = gamestateText.slice(braceStart + 1, braceEnd);
    // Each nebula block has multiple galactic_object=<id> entries
    const goRe = /galactic_object=(\d+)/g;
    let m;
    while ((m = goRe.exec(block)) !== null) {
      if (ownedSystemIds.has(parseInt(m[1], 10))) {
        log("info", "Player system detected inside nebula");
        return true;
      }
    }

    searchFrom = braceEnd;
  }

  return false;
}

function parseResearchAlternatives(countrySlice: string): number | null {
  // The save stores `alternatives={ physics={ "tech1" "tech2" ... } ... }`
  // and repeated `always_available_tech="tech_id"` entries.
  // Research alternatives = max across areas of (total - always_available).
  const altBlock = extractSection(countrySlice, "alternatives");
  if (!altBlock) return null;

  // Collect always-available tech IDs
  const alwaysAvailable = new Set<string>();
  const aaRe = /always_available_tech="([^"]+)"/g;
  let aaMatch;
  while ((aaMatch = aaRe.exec(countrySlice)) !== null) {
    alwaysAvailable.add(aaMatch[1]);
  }

  // Count normal (non-always-available) techs per area
  let maxNormal = 0;
  for (const area of ["physics", "society", "engineering"]) {
    const areaBlock = extractSection(altBlock, area, "");
    if (!areaBlock) continue;
    const techs = extractQuotedStrings(areaBlock);
    const normalCount = techs.filter(t => !alwaysAvailable.has(t)).length;
    if (normalCount > maxNormal) maxNormal = normalCount;
  }

  if (maxNormal > 0) {
    log("info", `Research alternatives: ${maxNormal} (derived from alternatives block, ${alwaysAvailable.size} always-available excluded)`);
  }

  return maxNormal > 0 ? maxNormal : null;
}

function parseResearchQueues(countrySlice: string): string[] {
  const inProgress: string[] = [];

  for (const area of ["physics_queue", "society_queue", "engineering_queue"]) {
    // Direct indexOf — queue names are unique within the country slice,
    // so no prefix needed (avoids subtle whitespace matching issues).
    const needle = area + "=";
    const idx = countrySlice.indexOf(needle);
    if (idx === -1) continue;

    const braceStart = countrySlice.indexOf("{", idx + needle.length);
    if (braceStart === -1) continue;

    const braceEnd = findMatchingBrace(countrySlice, braceStart);
    if (braceEnd === -1) continue;

    const block = countrySlice.slice(braceStart + 1, braceEnd);
    const re = /technology="([^"]+)"/g;
    let m;
    while ((m = re.exec(block)) !== null) {
      inProgress.push(m[1]);
    }
  }

  if (inProgress.length > 0) {
    log("info", `Research in progress: ${inProgress.join(", ")}`);
  }
  return inProgress;
}

function parseEnslavedPops(
  gamestateText: string,
  ownedPlanetIds: number[],
): number {
  if (ownedPlanetIds.length === 0) return 0;

  const popGroups = findTopLevelSection(gamestateText, "pop_groups");
  if (!popGroups) return 0;

  const ownedSet = new Set(ownedPlanetIds);
  let totalEnslaved = 0;

  // Iterate numbered entries within pop_groups
  const entryRe = /\n\t(\d+)=\n/g;
  let m;
  while ((m = entryRe.exec(popGroups)) !== null) {
    const braceStart = popGroups.indexOf("{", m.index + m[0].length);
    if (braceStart === -1) continue;
    const braceEnd = findMatchingBrace(popGroups, braceStart);
    if (braceEnd === -1) continue;

    const entry = popGroups.slice(braceStart + 1, braceEnd);

    // Check category="slave"
    const catMatch = entry.match(/category="([^"]+)"/);
    if (!catMatch || catMatch[1] !== "slave") continue;

    // Check planet is owned
    const planetMatch = entry.match(/planet=(\d+)/);
    if (!planetMatch || !ownedSet.has(parseInt(planetMatch[1], 10))) continue;

    // Sum size
    const sizeMatch = entry.match(/size=(\d+)/);
    if (sizeMatch) totalEnslaved += parseInt(sizeMatch[1], 10);
  }

  if (totalEnslaved > 0) {
    log("info", `Found ${totalEnslaved} enslaved pops across owned planets`);
  }

  return totalEnslaved;
}

// ── Main parse function ──────────────────────────────────────────────────

export function parseSaveFile(buffer: ArrayBuffer): ParsedSaveData {
  _log = [];

  log("info", "Decompressing save file...");

  // Decompress ZIP
  let metaBytes: Uint8Array;
  let gamestateBytes: Uint8Array;

  try {
    const zip = unzipSync(new Uint8Array(buffer));

    if (!zip["meta"]) {
      log("error", "Save file does not contain 'meta' entry");
      return { meta: { version: "", date: "", year: 2200, name: "", dlcs: [] }, country: emptyCountry(), log: _log };
    }
    if (!zip["gamestate"]) {
      log("error", "Save file does not contain 'gamestate' entry");
      return { meta: { version: "", date: "", year: 2200, name: "", dlcs: [] }, country: emptyCountry(), log: _log };
    }

    metaBytes = zip["meta"];
    gamestateBytes = zip["gamestate"];
  } catch (e) {
    log(
      "error",
      `Failed to decompress: ${e instanceof Error ? e.message : "Unknown error"}`,
    );
    return {
      meta: { version: "", date: "", year: 2200, name: "", dlcs: [] },
      country: emptyCountry(),
      log: _log,
    };
  }

  const compressedSize = (buffer.byteLength / 1024 / 1024).toFixed(1);
  const uncompressedSize = (gamestateBytes.byteLength / 1024 / 1024).toFixed(1);
  log(
    "success",
    `Decompressed save (${compressedSize} MB → ${uncompressedSize} MB)`,
  );

  // Decode to strings
  const decoder = new TextDecoder("utf-8");
  const metaText = decoder.decode(metaBytes);
  const gamestateText = decoder.decode(gamestateBytes);

  // Parse meta
  const meta = parseMeta(metaText);

  // Find player country
  const countrySlice = findPlayerCountry(gamestateText);
  if (!countrySlice) {
    return { meta, country: emptyCountry(), log: _log };
  }

  // ── Phase 1 parsing ───────────────────────────────────────────────────
  const ethics = parseEthics(countrySlice);
  const { authority, civics, origin } = parseGovernment(countrySlice);
  const technologies = parseTechStatus(countrySlice);
  const traditions = parseTraditions(countrySlice);
  const ascensionPerks = parseAscensionPerks(countrySlice);
  const countryFlags = parseCountryFlags(countrySlice);
  const ownedPlanetIds = parseOwnedPlanetIds(countrySlice);
  const policies = parsePolicies(countrySlice);

  log("info", `Found ${ownedPlanetIds.length} owned planets`);

  // ── Phase 2 parsing ───────────────────────────────────────────────────
  const policyFlags = parsePolicyFlags(countrySlice);
  const countryScalars = parseCountryScalars(countrySlice);
  const resources = parseResources(countrySlice);
  const communications = parseCommunications(countrySlice);
  const councilLeaders = parseCouncilLeaders(gamestateText, countrySlice);
  const founderSpecies = parseFounderSpecies(gamestateText, countrySlice);

  // Build owned system IDs for starbases + nebula
  const ownedSystemIds = parseOwnedSystemIds(gamestateText, countrySlice);
  log("info", `Found ${ownedSystemIds.size} owned systems (from sectors)`);

  // Map owned systems → starbase IDs via galactic_object entries
  const ownedStarbaseIds = buildOwnedStarbaseIds(gamestateText, ownedSystemIds);
  const starbases = parseStarbases(gamestateText, ownedStarbaseIds);
  const megastructureTypes = parseMegastructures(gamestateText);
  const planetData = parsePlanetDetails(gamestateText, ownedPlanetIds);
  const isInsideNebula = parseNebulaPresence(gamestateText, ownedSystemIds);
  const numPopsEnslaved = parseEnslavedPops(gamestateText, ownedPlanetIds);
  const researchAlternatives = parseResearchAlternatives(countrySlice);
  const techInProgress = parseResearchQueues(countrySlice);

  log("success", "Parsing complete");

  return {
    meta,
    country: {
      // Phase 1
      ethics,
      authority,
      civics,
      origin,
      technologies,
      traditions,
      ascensionPerks,
      countryFlags,
      ownedPlanetsCount: ownedPlanetIds.length || 1,
      policies,
      // Phase 2
      policyFlags,
      numCosmicStorms: countryScalars.cosmicStorms,
      acquiredSpecimenCount: countryScalars.specimenCount,
      faunaContacted: countryScalars.faunaContacted,
      communications,
      councilLeaders,
      founderSpecies,
      resources,
      ownedPlanetIds,
      starbases,
      megastructureTypes,
      planetData,
      isInsideNebula,
      numPopsEnslaved,
      researchAlternatives,
      techInProgress,
    },
    log: _log,
  };
}

function emptyCountry(): ParsedCountry {
  return {
    // Phase 1
    ethics: [],
    authority: "",
    civics: [],
    origin: "",
    technologies: [],
    traditions: [],
    ascensionPerks: [],
    countryFlags: [],
    ownedPlanetsCount: 1,
    policies: {},
    // Phase 2
    policyFlags: [],
    numCosmicStorms: 0,
    acquiredSpecimenCount: 0,
    faunaContacted: false,
    communications: 0,
    councilLeaders: [],
    founderSpecies: { class: "", traits: [] },
    resources: {},
    ownedPlanetIds: [],
    starbases: [],
    megastructureTypes: [],
    planetData: { deposits: [], districts: [], planetClasses: [] },
    isInsideNebula: false,
    numPopsEnslaved: 0,
    researchAlternatives: null,
    techInProgress: [],
  };
}
