import { For, type Component } from "solid-js";
import { researchedCountByArea, researchedCountGlobal } from "../../state/techState";

const AREAS = [
  { key: "physics", label: "Physics", color: "bg-physics" },
  { key: "society", label: "Society", color: "bg-society" },
  { key: "engineering", label: "Engineering", color: "bg-engineering" },
] as const;

const ResearchSummary: Component = () => {
  const totalResearched = () => {
    let total = 0;
    for (let tier = 0; tier < 6; tier++) {
      total += researchedCountGlobal[tier] ?? 0;
    }
    return total;
  };

  return (
    <div class="flex items-center gap-4 text-xs bg-linear-to-r from-bg-secondary/60 to-transparent rounded px-2 py-0.5">
      <span class="text-text-muted">
        Researched: <span class="text-text-primary font-medium">{totalResearched()}</span>
      </span>
      <For each={AREAS}>
        {(area) => {
          const count = () => {
            let total = 0;
            const areaData = researchedCountByArea[area.key];
            if (areaData) {
              for (let tier = 0; tier < 6; tier++) {
                total += areaData[tier] ?? 0;
              }
            }
            return total;
          };
          return (
            <span class="flex items-center gap-1">
              <span class={`w-2 h-2 rounded-full ${area.color}`} />
              <span class="text-text-muted">{area.label}:</span>
              <span class="text-text-secondary">{count()}</span>
            </span>
          );
        }}
      </For>
    </div>
  );
};

export default ResearchSummary;
