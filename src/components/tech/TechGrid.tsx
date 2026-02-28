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
  availableOnly: boolean;
}

const TechGrid: Component<Props> = (props) => {
  const filteredAndSorted = createMemo(() => {
    const searchLower = props.search.toLowerCase();
    const area = props.areaFilter;

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

      // Hide permanent techs by default (they're never in the pool)
      if (ts.permanent === 1) return false;

      // Available-only filter: only show techs that can appear in research pool
      if (props.availableOnly) {
        if (!(ts.prereqs_met === 1 && ts.researched === 0 && ts.current_weight > 0)) {
          return false;
        }
      }

      return true;
    });

    // Sort
    ids = [...ids].sort((a, b) => {
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
    <div class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 items-start">
      <For each={filteredAndSorted()}>
        {(techId, i) => <TechCard techId={techId} index={i()} />}
      </For>
    </div>
  );
};

export default TechGrid;
