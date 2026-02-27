import { For, type Component } from "solid-js";
import type { Area } from "../../types/tech";
import {
  researchAlternatives,
  setResearchAlternatives,
} from "../../state/empireState";
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
}

const AREA_FILTERS: { label: string; value: AreaFilter; color: string }[] = [
  { label: "All", value: "all", color: "text-text-primary" },
  { label: "Physics", value: "physics", color: "text-physics" },
  { label: "Society", value: "society", color: "text-society" },
  { label: "Engineering", value: "engineering", color: "text-engineering" },
];

const SORT_OPTIONS = [
  { label: "Name", value: "name" },
  { label: "Weight", value: "weight" },
  { label: "Hit %", value: "hit_chance" },
  { label: "Tier", value: "tier" },
  { label: "Delta", value: "delta" },
];

const Toolbar: Component<Props> = (props) => {
  return (
    <header class="h-12 bg-bg-secondary border-b border-border flex items-center px-4 gap-4 shrink-0">
      <h1 class="text-sm font-semibold text-text-primary whitespace-nowrap">
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
              class={`px-2 py-1 text-xs rounded transition-colors ${
                props.areaFilter === filter.value
                  ? "bg-bg-tertiary " + filter.color
                  : "text-text-muted hover:text-text-secondary"
              }`}
              onClick={() => props.onAreaFilterChange(filter.value)}
            >
              {filter.label}
            </button>
          )}
        </For>
      </div>

      {/* Sort */}
      <select
        value={props.sortBy}
        onChange={(e) => props.onSortChange(e.currentTarget.value)}
        class="bg-bg-primary border border-border rounded px-2 py-1 text-xs text-text-primary"
      >
        <For each={SORT_OPTIONS}>
          {(opt) => <option value={opt.value}>{opt.label}</option>}
        </For>
      </select>

      {/* Save/Load */}
      <button
        onClick={props.onSaveLoad}
        class="text-xs text-text-secondary hover:text-text-primary px-2 py-1 border border-border rounded"
      >
        Save/Load
      </button>

      {/* Research Alternatives */}
      <div class="flex items-center gap-2 ml-auto">
        <span class="text-xs text-text-muted">RAs:</span>
        <input
          type="number"
          min="1"
          max="10"
          value={researchAlternatives()}
          onInput={(e) => {
            setResearchAlternatives(Number(e.currentTarget.value));
            runUpdateCascade();
          }}
          class="w-12 bg-bg-primary border border-border rounded px-2 py-0.5 text-center text-text-primary text-sm"
        />
      </div>
    </header>
  );
};

export default Toolbar;
