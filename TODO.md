# TODO — Stellaris Tech Calculator

## Bug Fixes

- [ ] Fix sidebar "Filter modifiers..." search (currently non-functional)
- [ ] Fix Expand/Collapse all buttons in sidebar
- [ ] Fix dimming animation on non-available techs — too aggressive visually, replays every time area tab is changed

## UI/UX Improvements

- [ ] Improve caching and performance across the app
- [ ] Improve Reset confirmation dialog — better layout and descriptive text
- [ ] Add filter button to show only already-researched techs and "drawn last" techs
- [ ] Rethink the "drawn last" and prioritisation system for better usability
- [ ] Filters by tech subcategories (e.g., Particles, Field Manipulation, Biology, etc.)
- [ ] Zoom slider or toggles for card size
- [ ] Responsive/flex design adaptations for mobile
- [ ] Change dim-out of unavailable techs to only dim the border

## Feature Ideas

- [ ] Tech tree integration — show which techs enable others, display prerequisites on hover/popup/sidebar. Consider a secondary page with full interactive tech tree (synced with calculator state). Reference: https://stellaris.angelrose.org/
- [ ] Load savegame feature — auto-detect savegame path by OS, parse compressed save, extract researched techs and empire parameters automatically
- [ ] Pin techs — always show pinned techs at the top regardless of filters/sorting
- [ ] Optimal research path calculator — compute statistical minimum number of techs to research to reach a target tech, display optimized route
