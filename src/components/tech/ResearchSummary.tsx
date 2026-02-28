import { For, type Component } from "solid-js";
import { researchedCountByArea, researchedCountGlobal } from "../../state/techState";
import { allTechIds, techsByArea, techsByTier } from "../../state/dataStore";

const AREAS = [
  { key: "physics", label: "Physics", color: "bg-physics", textColor: "text-physics" },
  { key: "society", label: "Society", color: "bg-society", textColor: "text-society" },
  { key: "engineering", label: "Engineering", color: "bg-engineering", textColor: "text-engineering" },
] as const;

const TIERS = [0, 1, 2, 3, 4, 5] as const;

interface Props {
  zoom: number;
  onZoomChange: (delta: number) => void;
}

const ResearchSummary: Component<Props> = (props) => {
  const totalResearched = () => {
    let total = 0;
    for (let tier = 0; tier < 6; tier++) {
      total += researchedCountGlobal[tier] ?? 0;
    }
    return total;
  };

  const tierResearched = (tier: number) => researchedCountGlobal[tier] ?? 0;
  const tierTotal = (tier: number) => techsByTier[tier]?.length ?? 0;

  const zoomPct = () => Math.round(props.zoom * 100);

  return (
    <div class="bg-linear-to-r from-bg-secondary/60 to-transparent rounded px-2 py-1 space-y-0.5">
      {/* Row 1: Global + per-area + zoom controls */}
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

        {/* Zoom controls — pushed right */}
        <div class="ml-auto flex items-center gap-0">
          <button
            onClick={() => props.onZoomChange(-0.1)}
            disabled={props.zoom <= 0.6}
            class="w-5 h-5 flex items-center justify-center bg-bg-tertiary hover:bg-border rounded-l border border-border text-text-primary text-xs font-bold leading-none transition-all duration-150 hover:shadow-[0_0_4px_var(--color-glow-physics)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-bg-tertiary"
            title="Zoom out"
          >
            −
          </button>
          <span class="h-5 px-1.5 border-y border-border bg-bg-primary text-[10px] text-text-secondary font-semibold tabular-nums flex items-center justify-center min-w-9">
            {zoomPct()}%
          </span>
          <button
            onClick={() => props.onZoomChange(0.1)}
            disabled={props.zoom >= 1.4}
            class="w-5 h-5 flex items-center justify-center bg-bg-tertiary hover:bg-border rounded-r border border-border text-text-primary text-xs font-bold leading-none transition-all duration-150 hover:shadow-[0_0_4px_var(--color-glow-physics)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-bg-tertiary"
            title="Zoom in"
          >
            +
          </button>
        </div>
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
