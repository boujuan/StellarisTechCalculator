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

const AREA_FILTERS: { label: string; value: AreaFilter; color: string; title: string }[] = [
  { label: "All", value: "all", color: "text-text-primary", title: "Show all research areas" },
  { label: "Physics", value: "physics", color: "text-physics", title: "Physics: energy, computing, particles, field manipulation" },
  { label: "Society", value: "society", color: "text-society", title: "Society: biology, military theory, new worlds, statecraft" },
  { label: "Engineering", value: "engineering", color: "text-engineering", title: "Engineering: industry, materials, propulsion, voidcraft" },
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
    <header class="h-16 bg-bg-secondary border-b-2 border-border flex items-center px-6 gap-5 shrink-0">
      <h1 class="text-base font-semibold text-text-primary whitespace-nowrap">
        Stellaris Tech Calculator
      </h1>

      <SearchBar
        value={props.search}
        onInput={props.onSearchChange}
      />

      {/* Area filter buttons */}
      <div class="flex gap-1">
        <For each={AREA_FILTERS}>
          {(filter) => (
            <button
              class={`px-3 py-1.5 text-sm rounded transition-colors ${
                props.areaFilter === filter.value
                  ? "bg-bg-tertiary " + filter.color
                  : "text-text-muted hover:text-text-secondary"
              }`}
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
        class={`px-3 py-1.5 text-sm rounded border transition-colors ${
          props.availableOnly
            ? "bg-physics/20 text-physics border-physics/50 font-medium"
            : "text-text-muted border-border hover:text-text-secondary"
        }`}
        onClick={() => props.onAvailableOnlyChange(!props.availableOnly)}
        title="Show only techs available in the research pool (prerequisites met, not researched, weight > 0)"
      >
        Available Only
      </button>

      {/* Sort */}
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

      {/* Save/Load */}
      <button
        onClick={props.onSaveLoad}
        class="text-sm text-text-secondary hover:text-text-primary px-3 py-1.5 border border-border rounded"
        title="Save or load empire configurations"
      >
        Save/Load
      </button>

      {/* Reset */}
      <button
        onClick={handleReset}
        class="text-sm text-dangerous hover:text-dangerous/80 px-3 py-1.5 border border-dangerous/30 rounded font-medium"
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
            class="w-8 h-8 flex items-center justify-center bg-bg-tertiary hover:bg-border rounded-l border border-border text-text-primary text-lg font-bold transition-colors"
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
            class="w-8 h-8 flex items-center justify-center bg-bg-tertiary hover:bg-border rounded-r border border-border text-text-primary text-lg font-bold transition-colors"
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
