import { createMemo, For, type Component } from "solid-js";
import { allTechIds } from "../../state/dataStore";
import { techState, activeTechnologies } from "../../state/techState";
import type { Area } from "../../types/tech";
import TechCard from "./TechCard";

type AreaFilter = "all" | Area;

interface Props {
  search: string;
  areaFilter: AreaFilter;
  sortBy: string;
  techViewFilters: Set<string>;
  zoom: number;
}

const TechGrid: Component<Props> = (props) => {
  const filteredAndSorted = createMemo(() => {
    const searchLower = props.search.toLowerCase();
    const area = props.areaFilter;
    const filters = props.techViewFilters;

    // Filter
    let ids = allTechIds.filter((id) => {
      const tech = activeTechnologies[id];
      const ts = techState[id];

      // Area filter
      if (area !== "all" && tech.area !== area) return false;

      // Search filter
      if (searchLower && !tech.real_name.toLowerCase().includes(searchLower)) {
        return false;
      }

      // Tech View filters (inclusive OR)
      {
        let passes = false;
        if (filters.has("available") && ts.prereqs_met === 1 && ts.researched === 0 && ts.current_weight > 0) passes = true;
        if (filters.has("potential") && ts.potential === 1 && ts.researched === 0) passes = true;
        if (filters.has("researched") && ts.researched === 1) passes = true;
        if (filters.has("previous") && ts.drawn_last === 1) passes = true;
        if (filters.has("permanent") && ts.permanent === 1 && ts.researched === 0) passes = true;
        if (filters.has("zero_weight") && tech.weight === 0) passes = true;
        if (filters.has("not_possible") && ts.potential === 0) passes = true;
        if (!passes) return false;
      }

      return true;
    });

    // Sort priority: available (0) > drawn-last (1) > unavailable (2)
    const sortPriority = (id: string): number => {
      const ts = techState[id];
      if (ts.prereqs_met === 1 && ts.researched === 0) return 0;
      if (ts.drawn_last === 1) return 1;
      return 2;
    };

    // Sort — priority group first, then by selected metric within each group
    ids = [...ids].sort((a, b) => {
      const p = sortPriority(a) - sortPriority(b);
      if (p !== 0) return p;
      switch (props.sortBy) {
        case "weight":
          return techState[b].current_weight - techState[a].current_weight;
        case "hit_chance":
          return techState[b].hit_chance - techState[a].hit_chance;
        case "tier":
          return activeTechnologies[a].tier - activeTechnologies[b].tier ||
            activeTechnologies[a].real_name.localeCompare(activeTechnologies[b].real_name);
        case "delta":
          return techState[b].delta_weight - techState[a].delta_weight;
        case "base_weight":
          return (activeTechnologies[b].weight ?? 0) - (activeTechnologies[a].weight ?? 0);
        case "category":
          return (activeTechnologies[a].category ?? "").localeCompare(
            activeTechnologies[b].category ?? "",
          ) || activeTechnologies[a].real_name.localeCompare(activeTechnologies[b].real_name);
        case "area": {
          const areaOrder: Record<string, number> = { physics: 0, society: 1, engineering: 2 };
          return (areaOrder[activeTechnologies[a].area] ?? 0) -
            (areaOrder[activeTechnologies[b].area] ?? 0) ||
            activeTechnologies[a].real_name.localeCompare(activeTechnologies[b].real_name);
        }
        case "name":
        default:
          return activeTechnologies[a].real_name.localeCompare(
            activeTechnologies[b].real_name,
          );
      }
    });

    return ids;
  });

  return (
    <div
      class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 items-start origin-top-left"
      style={{ zoom: props.zoom }}
    >
      <For each={filteredAndSorted()}>
        {(techId, i) => <TechCard techId={techId} index={i()} />}
      </For>
    </div>
  );
};

export default TechGrid;
