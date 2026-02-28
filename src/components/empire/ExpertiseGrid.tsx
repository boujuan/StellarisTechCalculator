import { For, type Component } from "solid-js";
import {
  councilExpertise,
  setCouncilExpertiseTier,
  recomputeExpertiseBonus,
} from "../../state/empireState";
import { runUpdateCascade } from "../../engine/updateCascade";

interface Props {
  /** Map of display_name → [atomic_fact_id] */
  facts: Record<string, string[]>;
}

const ExpertiseGrid: Component<Props> = (props) => {
  const entries = () => Object.entries(props.facts);

  const handleChange = (atomicFact: string, tier: number, value: number) => {
    setCouncilExpertiseTier(atomicFact, tier, value);
    recomputeExpertiseBonus();
    runUpdateCascade();
  };

  const getValueForExpertise = (atomicFact: string, tier: number): number => {
    const category = atomicFact.replace("TRAIT:leader_trait_expertise_", "");
    return (councilExpertise[category] as Record<number, number>)?.[tier] ?? 0;
  };

  return (
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-text-muted">
            <th class="text-left font-normal py-1">Expertise</th>
            <For each={[1, 2, 3]}>
              {(level) => (
                <th class="text-center font-normal py-1 w-12">{level}</th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={entries()}>
            {([displayName, factList]) => {
              const atomicFact = factList[0];
              return (
                <tr class="hover:bg-bg-tertiary">
                  <td class="text-text-secondary py-0.5 pr-2 truncate max-w-28" title={displayName}>{displayName}</td>
                  <For each={[1, 2, 3]}>
                    {(tier) => {
                      const val = () => getValueForExpertise(atomicFact, tier);
                      return (
                        <td class="text-center py-0.5">
                          <div class="flex items-center justify-center">
                            <button
                              class="w-5 h-5 flex items-center justify-center bg-bg-tertiary hover:bg-border rounded-l border border-border text-text-primary text-xs font-bold transition-all duration-150 hover:shadow-[0_0_4px_var(--color-glow-physics)]"
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
                              class="w-5 h-5 bg-bg-primary border-y border-border text-center text-text-primary text-xs font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              class="w-5 h-5 flex items-center justify-center bg-bg-tertiary hover:bg-border rounded-r border border-border text-text-primary text-xs font-bold transition-all duration-150 hover:shadow-[0_0_4px_var(--color-glow-physics)]"
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
