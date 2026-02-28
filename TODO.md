# TODO — Stellaris Tech Calculator

## Bug Fixes

- [x] Fix sidebar "Filter modifiers..." search (currently non-functional)
- [x] Fix Expand/Collapse all buttons in sidebar
- [x] Fix dimming animation on non-available techs — too aggressive visually, replays every time area tab is changed

## UI/UX Improvements

- [ ] Improve caching and performance across the app. Do not make it reload all textures and logic with every tab change or settings tweak.-> Needs profiling first
- [ ] Improve Reset confirmation dialog — better layout and descriptive text -> Needs custom dialog component design
- [ ] Add filter button to show only already-researched techs and "drawn last" techs -> Needs UI placement decisions
- [ ] Rethink the "drawn last" and prioritisation system for better usability
- [ ] Filters by tech subcategories (e.g., Particles, Field Manipulation, Biology, etc.)
- [ ] Zoom slider or toggles for card size
- [ ] Responsive/flex design adaptations for mobile
- [x] Change dim-out of unavailable techs to only dim the border
- [x] Improve the Expertise traits section in the sidebar to fit the width of it.
- [x] Modify sorting order so "drawn last" techs are prioritised abover other unavailable techs (not strictly alphabetical). Also available techs should be above unavailable one when sorting by weight or hit chance % always, even if it's 0. Techs with negative delta should be above unavailable techs when sorting by Delta too.
- [x] Add small x button to clear both search bars
- [x] Make the "RESEARCHED" text not be dimmed out

## Feature Ideas

- [ ] Tech tree integration — show which techs enable others, display prerequisites on hover/popup/sidebar. Consider a secondary page with full interactive tech tree (synced with calculator state). Reference: https://stellaris.angelrose.org/
- [ ] Load savegame feature — auto-detect savegame path by OS, parse compressed save, extract researched techs and empire parameters automatically
- [ ] Pin techs — always show pinned techs at the top regardless of filters/sorting
- [ ] Optimal research path calculator — compute statistical minimum number of techs to research to reach a target tech, display optimized route
- [ ] Redesign sidebar of empire selection to emulate in-game empire making, sourcing actual icons, etc
- [ ] Add Stellaris version tracking text on the lower left corner, with link to patch notes and changelog
- [ ] Add link with icon to Github repository
