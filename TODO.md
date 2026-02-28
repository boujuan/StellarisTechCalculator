# TODO — Stellaris Tech Calculator

## Bug Fixes

- [x] Fix sidebar "Filter modifiers..." search (currently non-functional)
- [x] Fix Expand/Collapse all buttons in sidebar
- [x] Fix dimming animation on non-available techs — too aggressive visually, replays every time area tab is changed
- [x] Expertise traits seems to change to levels <0, not visually but affecting the calculations of draw % of the technologies
- [x] Cannot manually change their level number. field not interactable.
- [x] Make elements fit comfortably in the sidebar.
- [x] Expand and collapse buttons on sidebar dont properly work. Expand should expand all categories and subcategories.

## UI/UX Improvements

- [ ] Improve caching and performance across the app. Do not make it reload all textures and logic with every tab change or settings tweak.-> Needs profiling first
- [ ] Improve Reset confirmation dialog — better layout and descriptive text -> Needs custom dialog component design
- [x] Add filter button to show only already-researched techs and "drawn last" techs. Inclusive when "Available only" is enabled, allows to see what was already researched -> Needs UI placement decisions
- [ ] Rethink the "drawn last" and prioritisation system for better usability
- [ ] Filters by tech subcategories (e.g., Particles, Field Manipulation, Biology, etc.)
- [x] Zoom slider or toggles for card size
- [ ] Responsive/flex design adaptations for mobile
- [x] Change dim-out of unavailable techs to only dim the border
- [x] Improve the Expertise traits section in the sidebar to fit the width of it.
- [x] Modify sorting order so "drawn last" techs are prioritised abover other unavailable techs (not strictly alphabetical). Also available techs should be above unavailable one when sorting by weight or hit chance % always, even if it's 0. Techs with negative delta should be above unavailable techs when sorting by Delta too.
- [x] Add small x button to clear both search bars
- [x] Make the "RESEARCHED" text not be dimmed out
- [x] Improve "expertise traits" section, make not fitting names to scroll with animation relatively quickly on hover to show it all.
- [x] Make sidebar elements be cohesive visually between each other, including number selectors
- [x] Increase size of 'x' reset buttons on search bars. Make them more clear and styled to the rest of Stellaris style with glow orange circle style.
- [x] Make scrollbars match style of Stellaris, thicker and glow color
- [ ] Add instructions and descriptions what it does and how to use for each section on hover. eg: expertise traits show what increasing each number does (number of leaders in council having such trait?)
- [x] Make all DLCs checked the default

## Feature Ideas

- [ ] Tech tree integration — show which techs enable others, display prerequisites on hover/popup/sidebar. Consider a secondary page with full interactive tech tree (synced with calculator state). Reference: https://stellaris.angelrose.org/
- [x] Load savegame feature — auto-detect savegame path by OS, parse compressed save, extract researched techs and empire parameters automatically
- [ ] Pin techs — always show pinned techs at the top regardless of filters/sorting
- [ ] Optimal research path calculator — compute statistical minimum number of techs to research to reach a target tech, display optimized route
- [ ] Redesign sidebar of empire selection to emulate in-game empire making, sourcing actual icons, etc
- [x] Add Stellaris version tracking text on the lower left corner, with link to patch notes and changelog
- [x] Add link with icon to Github repository
- [x] Add further sorting rules (lookup other app)
- [ ] Settings page for Monte Carlo engine — tweak max iterations, convergence threshold, epsilon. Consider alternative probability engines (exact combinatorial for small pools, importance sampling) for faster/more precise results
- [ ] Add localization in different languages. Pull it from the game files
- [x] Version number should include the Stellaris version it is compatible with (now 4.3.x)

## Save Game Import — Phase 2 (Extended Extraction)

Phase 1 (core import) is complete: DLCs, ethics, authority, civics, origin, traditions, ascension perks, technologies, country flags, policies, owned planets count, drag-and-drop .sav zone, OS-detected save path hints, floating import log panel, save-source indicator dots.

Phase 2 extends the parser to cover ~200 additional atomic facts and ~14 scalars. All items below were identified by testing with real save files.

### Council & Leaders
- [x] Parse council leader traits from save (leader_trait_maniacal, leader_trait_spark_of_genius_2, leader_trait_expertise_*, leader_trait_psionic, etc.) — requires cross-referencing `council_positions=` → `leaders=` top-level sections
- [x] Map council leader expertise traits to the expertise grid (tier detection from trait suffix: `_2` = tier 2, `_3` = tier 3)
- [x] Set "Highest Councillor Base Skill" scalar from max council leader `level` field
- [x] Detect shroudwalker teacher / storm caller council positions and set councillor level scalars

### Starbases (4 scalars)
- [x] Parse starbase tiers from `starbase_mgr=` section, cross-reference with player-owned systems via `galactic_object` mapping
- [x] Implement cumulative "or higher" counting: citadels count toward starfortress, starhold, starport totals

### Planets, Deposits, Districts
- [x] Parse owned planet IDs (not just count) from country 0
- [x] Resolve planet classes from top-level `planets=` → `planet=` sub-section — detect volcanic worlds (`pc_volcanic`), etc.
- [x] Build deposit ID → type lookup from top-level `deposit=` section, cross-ref with owned planets → 37 `has_deposit:*` facts (deep_sinkhole, quicksand_basin, noxious_swamp, massive_glacier, crystalline_caverns, etc.)
- [x] Build district ID → type lookup from top-level `districts=` section, cross-ref with owned planets → 8 `district_*:1` facts (mining, generator, geothermal, melting, etc.)

### Species & Traits
- [x] Parse founder species from `species_db=` — detect organic/mechanical via species class
- [x] Map founder species traits: `trait_psionic`, `trait_latent_psionic`, `trait_aquatic`, `trait_necrophage`, etc.
- [x] Derive `country_uses_food:yes` (organic), `country_uses_consumer_goods:yes` (non-gestalt), `is_lithoid_empire:yes`, `is_organic_species:yes`, `has_any_dna:yes`

### Resources
- [x] Parse country resources from `modules.standard_economy_module.resources` — detect minor_artifacts, sr_dark_matter, nanites, astral_threads (> 0 = fact true)

### Country Scalars & Flags
- [x] Parse `num_cosmic_storms_encountered=N` → "Number of Cosmic Storms Encountered" scalar
- [x] Detect specimens from country flags (`first_specimen_acquired_event_occured`) or variables → `acquired_specimen_count:1` fact
- [x] Detect fauna from country flags (`amoeba_encountered`, `triggered_flightless_fauna`) or variables → `has_encountered_any_fauna:yes` fact
- [x] Parse `policy_flags={}` flat list → `allows_slavery:yes` and other policy flag facts
- [x] Derive crisis level scalars from ascension perks + country flags (Hyperthermia_Lv*_unlocked, cosmogenesis_level_*, etc.)

### Diplomacy & Relations
- [x] Parse `relations_manager` → count relations with `communications=yes` → "Number of Communications" scalar

### Megastructures & Bypasses
- [x] Parse `megastructures=` section filtered by `owner=0` → `has_megastructure:*` facts + `has_any_megastructure_in_empire:yes`
- [x] Detect hyper relays → `has_megastructure:hyper_relay` + `has_seen_any_bypass:relay_bypass`

### Nebula
- [x] Detect if any player-owned system is inside a nebula → `is_inside_nebula:yes`

### Not Extractable (Manual Only)
- Ascension perk slots used (the `ascension_perks` array length is the number of active perks, not a separate "used" count — this is working correctly)
- Space Weather Exploitation Resolution Level (galactic community resolutions not in country data)
- Number of Pops in Synaptic Lathe (requires pop-level iteration)
- Number of Pops Enslaved (requires pop-level iteration)
- Neighbor/federation/relation technologies (requires scanning other countries)
