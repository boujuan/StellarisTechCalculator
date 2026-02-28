import { For, type Component } from "solid-js";
import { researchedCountByArea, researchedCountGlobal } from "../../state/techState";
import { allTechIds, techsByArea, techsByTier } from "../../state/dataStore";

const AREAS = [
  { key: "physics", label: "Physics", color: "bg-physics", textColor: "text-physics" },
  { key: "society", label: "Society", color: "bg-society", textColor: "text-society" },
  { key: "engineering", label: "Engineering", color: "bg-engineering", textColor: "text-engineering" },
] as const;

const TIERS = [0, 1, 2, 3, 4, 5] as const;

const ResearchSummary: Component = () => {
  const totalResearched = () => {
    let total = 0;
    for (let tier = 0; tier < 6; tier++) {
      total += researchedCountGlobal[tier] ?? 0;
    }
    return total;
  };

  const tierResearched = (tier: number) => researchedCountGlobal[tier] ?? 0;
  const tierTotal = (tier: number) => techsByTier[tier]?.length ?? 0;

  return (
    <div class="bg-linear-to-r from-bg-secondary/60 to-transparent rounded px-2 py-1 space-y-0.5">
      {/* Row 1: Global + per-area */}
      <div class="flex items-center gap-4 text-xs">
        <span class="text-text-muted">
          Researched: <span class="text-text-primary font-medium">{totalResearched()}</span>
          <span class="text-text-muted">/{allTechIds.length}</span>
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
            const areaTotal = techsByArea[area.key as keyof typeof techsByArea]?.length ?? 0;
            return (
              <span class="flex items-center gap-1">
                <span class={`w-2 h-2 rounded-full ${area.color}`} />
                <span class="text-text-muted">{area.label}:</span>
                <span class="text-text-secondary">{count()}<span class="text-text-muted">/{areaTotal}</span></span>
              </span>
            );
          }}
        </For>
      </div>
      {/* Row 2: Per-tier breakdown */}
      <div class="flex items-center gap-3 text-[10px]">
        <For each={[...TIERS]}>
          {(tier) => (
            <span class="flex items-center gap-0.5">
              <span class="text-physics font-medium">T{tier}:</span>
              <span class="text-text-muted">{tierResearched(tier)}<span class="text-text-muted/60">/{tierTotal(tier)}</span></span>
            </span>
          )}
        </For>
      </div>
    </div>
  );
};

export default ResearchSummary;
