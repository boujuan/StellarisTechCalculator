import { batch, For, type Component } from "solid-js";
import type { Area } from "../../types/tech";
import {
  researchAlternatives,
  setResearchAlternatives,
  resetEmpireState,
} from "../../state/empireState";
import { resetTechState } from "../../state/techState";
import { runUpdateCascade } from "../../engine/updateCascade";
import SearchBar from "../common/SearchBar";

type AreaFilter = "all" | Area;

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  areaFilter: AreaFilter;
  onAreaFilterChange: (area: AreaFilter) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onSaveLoad: () => void;
  availableOnly: boolean;
  onAvailableOnlyChange: (value: boolean) => void;
}

const AREA_FILTERS: { label: string; value: AreaFilter; color: string; glowVar: string; title: string }[] = [
  { label: "All", value: "all", color: "text-text-primary", glowVar: "", title: "Show all research areas" },
  { label: "Physics", value: "physics", color: "text-physics", glowVar: "var(--color-glow-physics)", title: "Physics: energy, computing, particles, field manipulation" },
  { label: "Society", value: "society", color: "text-society", glowVar: "var(--color-glow-society)", title: "Society: biology, military theory, new worlds, statecraft" },
  { label: "Engineering", value: "engineering", color: "text-engineering", glowVar: "var(--color-glow-engineering)", title: "Engineering: industry, materials, propulsion, voidcraft" },
];

const SORT_OPTIONS = [
  { label: "Name", value: "name", title: "Sort alphabetically by technology name" },
  { label: "Weight", value: "weight", title: "Sort by base weight (higher = more likely to appear)" },
  { label: "Hit %", value: "hit_chance", title: "Sort by hit chance — probability of being offered" },
  { label: "Tier", value: "tier", title: "Sort by technology tier (T0–T5)" },
  { label: "Delta", value: "delta", title: "Sort by opportunity value — weight of techs this unlocks" },
];

const Toolbar: Component<Props> = (props) => {
  const handleReset = () => {
    if (confirm("Reset all settings to defaults?")) {
      batch(() => {
        resetEmpireState();
        resetTechState();
      });
      runUpdateCascade();
    }
  };

  return (
    <header
      class="h-16 border-b-2 border-border flex items-center px-6 gap-5 shrink-0"
      style={{
        "background-color": "rgba(26, 29, 35, 0.8)",
        "backdrop-filter": "blur(10px)",
        "-webkit-backdrop-filter": "blur(10px)",
      }}
    >
      <h1
        class="text-base font-bold text-text-primary whitespace-nowrap font-display"
        style={{ "text-shadow": "0 0 12px rgba(59,130,246,0.4)" }}
      >
        Stellaris Tech Calculator
      </h1>

      <SearchBar
        value={props.search}
        onInput={props.onSearchChange}
      />

      {/* Area filter buttons */}
      <div class="flex gap-1 border-r border-border/40 pr-4">
        <For each={AREA_FILTERS}>
          {(filter) => (
            <button
              class={`px-3 py-1.5 text-sm rounded transition-all duration-200 ${
                props.areaFilter === filter.value
                  ? "bg-bg-tertiary " + filter.color + " font-medium"
                  : "text-text-muted hover:text-text-secondary"
              }`}
              style={
                props.areaFilter === filter.value && filter.glowVar
                  ? {
                      "box-shadow": `0 2px 8px ${filter.glowVar}`,
                      "border-bottom": "2px solid currentColor",
                    }
                  : {}
              }
              onClick={() => props.onAreaFilterChange(filter.value)}
              title={filter.title}
            >
              {filter.label}
            </button>
          )}
        </For>
      </div>

      {/* Available Only toggle */}
      <button
        class={`px-3 py-1.5 text-sm rounded border transition-all duration-200 ${
          props.availableOnly
            ? "bg-physics/20 text-physics border-physics/50 font-medium"
            : "text-text-muted border-border hover:text-text-secondary"
        }`}
        style={
          props.availableOnly
            ? { "box-shadow": "0 0 8px var(--color-glow-physics)" }
            : {}
        }
        onClick={() => props.onAvailableOnlyChange(!props.availableOnly)}
        title="Show only techs available in the research pool (prerequisites met, not researched, weight > 0)"
      >
        Available Only
      </button>

      {/* Sort */}
      <div class="border-r border-border/40 pr-4">
        <select
          value={props.sortBy}
          onChange={(e) => props.onSortChange(e.currentTarget.value)}
          class="bg-bg-primary border border-border rounded px-3 py-1.5 text-sm text-text-primary"
          title="Sort technologies by..."
        >
          <For each={SORT_OPTIONS}>
            {(opt) => <option value={opt.value} title={opt.title}>{opt.label}</option>}
          </For>
        </select>
      </div>

      {/* Save/Load */}
      <button
        onClick={props.onSaveLoad}
        class="text-sm text-text-secondary hover:text-text-primary px-3 py-1.5 border border-border rounded transition-colors"
        title="Save or load empire configurations"
      >
        Save/Load
      </button>

      {/* Reset */}
      <button
        onClick={handleReset}
        class="text-sm text-dangerous hover:text-dangerous/80 px-3 py-1.5 border border-dangerous/30 rounded font-medium transition-colors"
        title="Reset all empire settings and tech state to defaults"
      >
        Reset
      </button>

      {/* Research Alternatives */}
      <div
        class="flex items-center gap-3 ml-auto"
        title="Number of research alternatives offered each turn. Default is 3. Increased by certain techs, civics, and the Discovery tradition."
      >
        <span class="text-sm text-text-secondary font-medium whitespace-nowrap">Research Alternatives</span>
        <div class="flex items-center">
          <button
            class="w-8 h-8 flex items-center justify-center bg-bg-tertiary hover:bg-border rounded-l border border-border text-text-primary text-lg font-bold transition-all duration-150 hover:shadow-[0_0_6px_var(--color-glow-physics)]"
            onClick={() => {
              const v = Math.max(1, researchAlternatives() - 1);
              setResearchAlternatives(v);
              runUpdateCascade();
            }}
            title="Decrease research alternatives"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            max="10"
            value={researchAlternatives()}
            onInput={(e) => {
              const v = Math.max(1, Math.min(10, Number(e.currentTarget.value)));
              setResearchAlternatives(v);
              runUpdateCascade();
            }}
            class="w-12 h-8 bg-bg-primary border-y border-border text-center text-text-primary text-base font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            class="w-8 h-8 flex items-center justify-center bg-bg-tertiary hover:bg-border rounded-r border border-border text-text-primary text-lg font-bold transition-all duration-150 hover:shadow-[0_0_6px_var(--color-glow-physics)]"
            onClick={() => {
              const v = Math.min(10, researchAlternatives() + 1);
              setResearchAlternatives(v);
              runUpdateCascade();
            }}
            title="Increase research alternatives"
          >
            +
          </button>
        </div>
      </div>
    </header>
  );
};

export default Toolbar;
