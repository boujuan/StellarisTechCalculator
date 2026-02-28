import { For, createSignal, onMount, type Component } from "solid-js";
import {
  councilExpertise,
  setCouncilExpertiseTier,
  recomputeExpertiseBonus,
} from "../../state/empireState";
import { runUpdateCascade } from "../../engine/updateCascade";

// ── Expertise → area mapping + tooltip data ──────────────────────────

interface ExpertiseInfo {
  area: "physics" | "society" | "engineering";
  areaLabel: string;
  tierWeights: string; // human-readable per-councillor multipliers
}

const EXPERTISE_INFO: Record<string, ExpertiseInfo> = {
  "Computing":          { area: "physics",      areaLabel: "Physics",      tierWeights: "+25% / +35% / +75%" },
  "Field Manipulation": { area: "physics",      areaLabel: "Physics",      tierWeights: "+25% / +35% / +75%" },
  "Particles":          { area: "physics",      areaLabel: "Physics",      tierWeights: "+25% / +35% / +75%" },
  "Archaeostudies":     { area: "society",      areaLabel: "Society",      tierWeights: "+15% / +20% / +35%" },
  "Biology":            { area: "society",      areaLabel: "Society",      tierWeights: "+25% / +35% / +75%" },
  "Military Theory":    { area: "society",      areaLabel: "Society",      tierWeights: "+25% / +35% / +75%" },
  "New Worlds":         { area: "society",      areaLabel: "Society",      tierWeights: "+25% / +35% / +75%" },
  "Psionics":           { area: "society",      areaLabel: "Society",      tierWeights: "+50% / +100% / +200%" },
  "Statecraft":         { area: "society",      areaLabel: "Society",      tierWeights: "+25% / +35% / +75%" },
  "Industry":           { area: "engineering",  areaLabel: "Engineering",  tierWeights: "+25% / +35% / +75%" },
  "Materials":          { area: "engineering",  areaLabel: "Engineering",  tierWeights: "+25% / +35% / +75%" },
  "Propulsion":         { area: "engineering",  areaLabel: "Engineering",  tierWeights: "+25% / +35% / +75%" },
  "Voidcraft":          { area: "engineering",  areaLabel: "Engineering",  tierWeights: "+25% / +35% / +75%" },
};

const AREA_TEXT_CLASS: Record<string, string> = {
  physics: "text-physics",
  society: "text-society",
  engineering: "text-engineering",
};

function getExpertiseTooltip(name: string): string {
  const info = EXPERTISE_INFO[name];
  if (!info) return name;
  return (
    `Boosts ${info.areaLabel} → ${name} tech draw weight.\n` +
    `Weight per councillor at tier 1 / 2 / 3: ${info.tierWeights}`
  );
}

const TIER_TOOLTIPS: Record<number, string> = {
  1: "Tier 1 — number of councillors with basic expertise\nDefault: +25%, Psionics: +50%, Archaeostudies: +15%",
  2: "Tier 2 — number of councillors with intermediate expertise\nDefault: +35%, Psionics: +100%, Archaeostudies: +20%",
  3: "Tier 3 — number of councillors with advanced expertise\nDefault: +75%, Psionics: +200%, Archaeostudies: +35%",
};

// ── Scrolling name sub-component ─────────────────────────────────────

const ScrollName: Component<{ name: string; colorClass: string; tooltip: string }> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let textRef: HTMLSpanElement | undefined;
  const [scrollDist, setScrollDist] = createSignal(0);
  const [hovering, setHovering] = createSignal(false);

  onMount(() => {
    if (textRef && containerRef) {
      const overflow = textRef.scrollWidth - containerRef.clientWidth;
      if (overflow > 0) setScrollDist(overflow + 8);
    }
  });

  return (
    <td
      class={`py-0.5 pr-1 ${props.colorClass}`}
      title={props.tooltip}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div ref={containerRef} class="overflow-hidden whitespace-nowrap">
        <span
          ref={textRef}
          class="inline-block text-xs"
          style={{
            animation:
              hovering() && scrollDist() > 0
                ? "expertise-scroll 2s ease-in-out infinite"
                : "none",
            "--scroll-x": `-${scrollDist()}px`,
          }}
        >
          {props.name}
        </span>
      </div>
    </td>
  );
};

// ── Main grid ────────────────────────────────────────────────────────

interface Props {
  /** Map of display_name → [atomic_fact_id] */
  facts: Record<string, string[]>;
}

const ExpertiseGrid: Component<Props> = (props) => {
  const entries = () => Object.entries(props.facts);

  const handleChange = (atomicFact: string, tier: number, value: number) => {
    if (getValueForExpertise(atomicFact, tier) === value) return;
    setCouncilExpertiseTier(atomicFact, tier, value);
    recomputeExpertiseBonus();
    runUpdateCascade();
  };

  const getValueForExpertise = (atomicFact: string, tier: number): number => {
    const category = atomicFact.replace("TRAIT:leader_trait_expertise_", "");
    return (councilExpertise[category] as Record<number, number>)?.[tier] ?? 0;
  };

  return (
    <div>
      <table class="w-full text-sm table-fixed">
        <thead>
          <tr class="text-text-muted">
            <th
              class="text-left font-normal py-1"
              title="Number of councillors with each expertise trait. Boosts draw weight of techs in the matching category."
            >
              Expertise
            </th>
            <For each={[1, 2, 3]}>
              {(level) => (
                <th
                  class="text-center font-normal py-1 w-12"
                  title={TIER_TOOLTIPS[level]}
                >
                  {level}
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={entries()}>
            {([displayName, factList]) => {
              const atomicFact = factList[0];
              const info = EXPERTISE_INFO[displayName];
              const colorClass = AREA_TEXT_CLASS[info?.area ?? ""] ?? "text-text-secondary";

              return (
                <tr class="hover:bg-bg-tertiary">
                  <ScrollName
                    name={displayName}
                    colorClass={colorClass}
                    tooltip={getExpertiseTooltip(displayName)}
                  />
                  <For each={[1, 2, 3]}>
                    {(tier) => {
                      const val = () => getValueForExpertise(atomicFact, tier);
                      return (
                        <td class="text-center py-0.5 px-0">
                          <div class="flex items-center justify-center">
                            <button
                              class="w-4 h-4 flex items-center justify-center bg-bg-tertiary hover:bg-border rounded-l border border-border text-text-primary text-[10px] font-bold leading-none transition-all duration-150 hover:shadow-[0_0_4px_var(--color-glow-physics)]"
                              onClick={() => handleChange(atomicFact, tier, Math.max(0, val() - 1))}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={6}
                              value={val()}
                              onInput={(e) => {
                                const v = Math.max(0, Math.min(6, Number(e.currentTarget.value)));
                                handleChange(atomicFact, tier, v);
                              }}
                              class="w-4 h-4 bg-bg-primary border-y border-border text-center text-text-primary text-[10px] font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              class="w-4 h-4 flex items-center justify-center bg-bg-tertiary hover:bg-border rounded-r border border-border text-text-primary text-[10px] font-bold leading-none transition-all duration-150 hover:shadow-[0_0_4px_var(--color-glow-physics)]"
                              onClick={() => handleChange(atomicFact, tier, Math.min(6, val() + 1))}
                            >
                              +
                            </button>
                          </div>
                        </td>
                      );
                    }}
                  </For>
                </tr>
              );
            }}
          </For>
        </tbody>
      </table>
    </div>
  );
};

export default ExpertiseGrid;
