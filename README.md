# Stellaris Tech Calculator

A browser-based technology research probability calculator for [Stellaris](https://store.steampowered.com/app/281990/Stellaris/). Configure your empire's modifiers, DLC, civics, and traditions to see exactly how they affect research weights, draw probabilities, and opportunity costs for all 663 technologies.

**[Live Demo →](https://boujuan.github.io/StellarisTechCalculator/)**

## Features

- **663 technologies** with accurate weight calculations matching the game's logic
- **Monte Carlo simulation** for draw probabilities, offloaded to Web Workers for a responsive UI
- **Full empire configuration** — DLC toggles, civics, traditions, ascension perks, ethics, origins, game year, and more (416 atomic facts + 17 scalar sliders)
- **Expertise & council** — per-category expertise levels and councillor position modifiers
- **Tech swaps** — 126 conditional technology replacements evaluated in real time
- **Delta weights** — see the opportunity cost of researching each tech
- **Tech View presets & filters** — 5 presets (Current, Current + Past, Potential, Not Possible, All) with 7 individual filters that can be toggled independently. Presets are shortcuts that set filter combinations; manual tweaks auto-deselect the preset
- **Search, filter & sort** — find techs by name, filter by area (Physics/Society/Engineering), sort by 8 criteria: hit chance, weight, name, tier, delta, base weight, category, or area
- **Zoom controls** — adjust tech card size (60%–140%), persisted across sessions
- **Save game import** — drag-and-drop a Stellaris `.sav` file to auto-configure the calculator. Extracts DLCs, ethics, civics, origin, traditions, ascension perks, researched techs, council leaders, starbases, deposits, districts, megastructures, species traits, enslaved pops, nebula presence, and more. A detailed import log shows exactly what was detected
- **Save/Load** — persist empire configurations to localStorage or export/import as JSON
- **Tutorial overlay** — built-in guide for new users, auto-shown on first visit
- **Self-contained** — all data and 800+ AVIF icons ship with the app. No Stellaris installation needed. Version tracking shows app + Stellaris version in the sidebar footer
- **~73 KB** gzipped JavaScript bundle (+ 4 KB CSS)

## Screenshots

<!-- TODO: Add screenshots -->

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Deployment

### GitHub Pages (automated)

Push to the `main` branch and the GitHub Actions workflow handles everything:

1. Go to **Settings → Pages → Source** and select **GitHub Actions**
2. Push to `main` — the workflow builds and deploys automatically

### GitHub Pages (manual)

```bash
npm run deploy
```

This runs `gh-pages -d dist` to push the built files to the `gh-pages` branch.

### Custom domain / other hosts

Override the base path for non-GitHub-Pages deployments:

```bash
VITE_BASE=/ npm run build
# or
npm run build:local
```

## Tech Stack

| Layer | Choice |
|---|---|
| UI Framework | [SolidJS](https://www.solidjs.com/) 1.9 — fine-grained reactivity, no VDOM |
| Language | TypeScript (strict) |
| Build Tool | [Vite](https://vite.dev/) 7 |
| Styling | [Tailwind CSS](https://tailwindcss.com/) v4 |
| Workers | Web Workers + [Comlink](https://github.com/GoogleChromeLabs/comlink) |
| Images | AVIF (800+ icons, 6.3 MB) |
| Deployment | Static files — GitHub Pages, any CDN, or `file://` |

## Project Structure

```
src/
├── data/                    # JSON game data (editable for Stellaris patches)
│   ├── technologies.json    # 663 techs
│   ├── atomic_facts.json    # 416 boolean flags
│   └── ...                  # 5 more data files
│
├── types/                   # TypeScript interfaces
├── state/                   # Reactive stores (SolidJS signals/stores)
│   ├── dataStore.ts         # Loads & indexes all JSON data
│   ├── empireState.ts       # Empire modifiers (facts, scalars, expertise)
│   └── techState.ts         # Per-tech runtime state (weight, hit%, etc.)
│
├── engine/                  # Calculation logic (pure functions)
│   ├── logicEvaluator.ts    # AND/OR/NOT/NOR boolean tree evaluator
│   ├── weightCalculator.ts  # Weight formula with modifier chain
│   ├── inlineScripts.ts     # Rare tech, archaeotech, cosmic storms
│   ├── techSwaps.ts         # Conditional tech swap evaluator
│   └── updateCascade.ts     # 8-step pipeline orchestrator
│
├── workers/                 # Web Worker (Monte Carlo simulation)
│   ├── monteCarloWorker.ts  # Prefix sums, binary search, convergence
│   └── workerApi.ts         # Comlink wrapper
│
├── components/
│   ├── layout/              # App shell (Sidebar, Toolbar)
│   ├── empire/              # Empire modifier controls
│   ├── tech/                # Tech cards, grid, summary
│   └── common/              # Save/load dialog, tutorial overlay
│
└── utils/                   # Debounce, number formatting
```

## Updating for a New Stellaris Patch

All game data lives in `src/data/*.json`. To update after a patch:

1. Edit the JSON files with new/changed tech data
2. Add any new AVIF icons to `public/media/tech_icons/`
3. Run `npm run build`

No source code changes needed unless Stellaris adds new inline script types.

## Calculation Engine

The calculator implements the same weight formula as the game:

```
weight = base_weight
         × Π(modifier factors)
         × inline_script_multipliers
         × (1 + expertise_bonus)
         × beeline_modifier
         × (drawn_last ? 0 : 1)
```

The **8-step update cascade** runs on every empire change:

1. Count researched techs per area/tier
2. Evaluate potential blocks for all techs
3. Update derived atomic facts
4. Check prerequisites (including tier thresholds)
5. Apply conditional tech swaps
6. Compute weights for all available techs
7. Compute delta weights (opportunity cost)
8. Dispatch Monte Carlo simulation to Web Worker

Steps 1–7 run synchronously (~5–15 ms). Step 8 runs asynchronously on a dedicated thread.

## License

MIT
