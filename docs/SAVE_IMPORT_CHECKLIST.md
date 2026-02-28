# Save Import — Parameter Extraction Checklist

Tracks which Stellaris save parameters can be extracted and mapped to calculator state.

**Legend:** Checked = implemented & tested, Unchecked = planned but not yet done

---

## Phase 1: Core Import (Complete)

### DLC Detection (from `meta` file)
- [x] Utopia → `has_utopia:yes`, `host_has_dlc:Utopia`
- [x] Apocalypse → `host_has_dlc:Apocalypse`
- [x] Distant Stars Story Pack → `host_has_dlc:Distant Stars Story Pack`
- [x] Megacorp → `host_has_dlc:Megacorp`
- [x] Ancient Relics Story Pack → `has_ancrel:yes`
- [x] Federations → `host_has_dlc:Federations`
- [x] Nemesis → `has_nemesis:yes`
- [x] Overlord → `has_overlord_dlc:yes`
- [x] First Contact Story Pack → `has_first_contact_dlc:yes`
- [x] Galactic Paragons → `has_paragon_dlc:yes`
- [x] Astral Planes → `has_astral_planes_dlc:yes`
- [x] The Machine Age → `has_machine_age_dlc:yes`
- [x] Cosmic Storms → `has_cosmic_storms_dlc:yes`
- [x] Grand Archive → `has_grand_archive_dlc:yes`
- [x] BioGenesis → `has_biogenesis_dlc:yes`
- [x] Shadows of the Shroud → `has_shroud_dlc:yes`
- [x] Infernals Species Pack → `has_infernals:yes`

### Game Date (from `meta` file)
- [x] Game year → `setScalarValue("Current Game Year", year)` → triggers 19 `years_passed:N` facts

### Ethics (from `country.ethos`)
- [x] All 17 ethics mapped: `ethic_X` → `has_ethic:ethic_X`
- [x] Special: `ethic_fanatic_pacifist` → `is_fanatic_pacifist:yes`

### Authority (from `country.government.authority`)
- [x] `auth_hive_mind` → `is_hive_empire:yes`, `is_gestalt:yes`
- [x] `auth_machine_intelligence` → `is_machine_empire:yes`, `is_gestalt:yes`
- [x] `auth_corporate` → `is_megacorp:yes`, `is_regular_empire:yes`
- [x] `auth_cloning` → `is_cloning_authority:yes`, `is_regular_empire:yes`
- [x] `auth_democratic/oligarchic/dictatorial/imperial` → `is_regular_empire:yes`

### Civics (from `country.government.civics`)
- [x] Direct mapping: `civic_X` → `has_civic:civic_X`
- [x] Valid civic mapping: `civic_X` → `has_valid_civic:civic_X`
- [x] 30+ special civic derivations (anglers, catalytic, memorialist, void dwellers, etc.)

### Origin (from `country.government.origin`)
- [x] Direct mapping: `origin_X` → `has_origin:origin_X` (14 known origins)

### Traditions (from `country.traditions`)
- [x] Direct mapping: `tr_X` → `has_tradition:tr_X` (12 known tradition facts)

### Ascension Perks (from `country.ascension_perks`)
- [x] Direct mapping: `ap_X` → `has_ascension_perk:ap_X` (21 known ascension perk facts)

### Researched Technologies (from `country.tech_status`)
- [x] All `technology="tech_X"` entries → mark as researched in techState

### Country Flags (from `country.flags`)
- [x] 19 known `has_country_flag:X` facts mapped

### Active Policies (from `country.active_policies`)
- [x] Structured policy → selected value → `has_policy_flag:X` mapping

### Owned Planets (from `country.owned_planets`)
- [x] Count → `setScalarValue("Number of Colonised Planets", count)`

### UI Features
- [x] Drag-and-drop .sav file support
- [x] OS-detected save path hints (Windows, macOS, Linux)
- [x] Floating import log panel with expandable/minimizable state
- [x] Save-source indicator dots on sidebar facts
- [x] Web Worker decompression (fflate + Comlink)

---

## Phase 2: Extended Extraction (Complete)

### Council Leaders (cross-referencing government → council_positions → leaders)
- [x] Council positions → leader IDs → traits → `TRAIT:leader_trait_*` facts
- [x] Expertise traits → expertise grid (`leader_trait_expertise_*` → tier 1/2/3 counting)
- [x] Leader skill levels → `setScalarValue("Highest Councillor Base Skill", max)`
- [x] Shroudwalker teacher detection → `setCouncillorLevel("shroudwalker_teacher", level)`
- [x] Storm caller detection → `setCouncillorLevel("storm_caller", level)`

### Starbases (sectors → galactic_objects → starbase_mgr)
- [x] Owned system discovery from `sectors.owned` → top-level sectors → systems
- [x] Starbase ID mapping from `galactic_object` entries
- [x] Cumulative tier counting → 4 scalar values:
  - [x] `Number of Starbases Starport Tier or Higher`
  - [x] `Number of Starbases Starhold Tier or Higher`
  - [x] `Number of Starbases Starfortress Tier or Higher`
  - [x] `Number of Starbases Citadel Tier or Higher`

### Planet Deposits (planet IDs → deposit IDs → deposit types)
- [x] Build deposit ID → type lookup map from top-level `deposit=` section
- [x] Scan owned planets for deposits → `has_deposit:X` facts (37 possible)

### Districts (planet IDs → district IDs → district types)
- [x] Build district ID → type lookup map from top-level `districts=` section
- [x] Scan owned planets for districts → `district_X:1` facts (8 possible)
- [x] Derived zone facts: `district_generator` → `has_any_generator_zone:yes`, etc.
- [x] Farming districts → `has_any_agriculture_zone:yes`, `has_any_capped_planet_farming_district:yes`

### Planet Classes
- [x] Scan owned planets for planet_class → `is_planet_class:X` facts

### Species & Traits (founder_species_ref → species_db)
- [x] Founder species class → `is_organic_species:yes`, `has_any_dna:yes`, `country_uses_food:yes`
- [x] Lithoid detection → `is_lithoid_empire:yes`
- [x] Mechanical/machine detection → `is_mechanical_empire:yes`
- [x] `trait_psionic` → `is_psionic_species:yes`, `has_psionic_species_trait:yes`, `has_psionic_ascension:yes`
- [x] `trait_latent_psionic` → `is_latent_psionic_species:yes`
- [x] `trait_aquatic` → `has_trait:trait_aquatic`
- [x] `trait_necrophage` → `has_trait:trait_necrophage`
- [x] Non-gestalt → `country_uses_consumer_goods:yes`

### Resources (modules.standard_economy_module.resources)
- [x] `sr_dark_matter` > 0 → `sr_dark_matter:1`
- [x] `nanites` > 0 → `nanites:1`
- [x] `minor_artifacts` > 0 → `minor_artifacts:1`
- [x] `astral_threads` > 0 → `astral_threads:1`

### Country Scalars & Flags
- [x] `num_cosmic_storms_encountered` → "Number of Cosmic Storms Encountered" scalar
- [x] Specimen detection (flag `first_specimen_acquired_event_occured` OR variable) → `acquired_specimen_count:1`
- [x] Fauna detection (flags `amoeba_encountered`, `triggered_flightless_fauna` OR variable) → `has_encountered_any_fauna:yes`
- [x] Policy flags flat list → `allows_slavery:yes` and other policy flag facts

### Diplomacy (relations_manager)
- [x] Count `communications=yes` in relations → "Number of Communications" scalar

### Megastructures (top-level megastructures section, filtered by owner=0)
- [x] `has_megastructure:X` facts for each owned megastructure type
- [x] `has_any_megastructure_in_empire:yes` if any megastructures owned
- [x] Hyper relay → `has_seen_any_bypass:relay_bypass`

### Nebula (top-level nebula blocks)
- [x] Check if any owned system is inside a nebula → `is_inside_nebula:yes`

### Ascension Perk Slots (derived from AP count)

- [x] AP count ≥ 6 → `num_ascension_perk_slots:6`

### Enslaved Pops (top-level pop_groups section)

- [x] Sum `size` of pop groups with `category="slave"` on owned planets → "Number of Pops Enslaved" scalar

### Crisis Levels (derived from ascension perks + country flags)
- [x] Galactic Hyperthermia → AP + `Hyperthermia_Lv*_unlocked` flags
- [x] Cosmogenesis → AP + `cosmogenesis_level_*` flags
- [x] Galactic Nemesis → AP `ap_become_the_crisis`

---

## Not Extractable (Manual Only)

These require manual configuration since they can't be determined from a save file:

- Space Weather Exploitation Resolution Level (galactic community resolutions not in country data)
- Number of Pops in Synaptic Lathe (requires pop-level iteration)
- Neighbor/federation/relation technologies (requires scanning other countries)
- Federation status and perks (requires scanning federations section)
- Bypasses owned (gateway, wormhole, lgate — requires top-level bypass section scanning)
- Space deposits on uninhabited bodies (parser only scans colonized planets, not moons/asteroids in owned systems)

### Internal Facts (Always True)
- `is_same_value:prev` — internal comparator, always true
- `days_passed:0` — always true (days always > 0 in a save)
- `is_ai:no` — always true (player is not AI)
- Backend facts (`True: *`) — always true

---

## Testing

| Save File | Empire Type | Key Parameters | Status |
|-----------|-------------|----------------|--------|
| x.sav | Infernal / Psionic / Volcanic | 4 council leaders, 6 upgraded starbases, 5 planets, 18 comms, 4 storms, hyper relays, psionic species | All 23 items pass |
| q2.sav | Hive Mind / Devouring Swarm | 100+ techs, 7 traditions, 7 perks, 44 planets, year 2340 | Phase 1 verified |
