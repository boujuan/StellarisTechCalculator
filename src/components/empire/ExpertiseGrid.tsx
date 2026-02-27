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
                <th class="text-center font-normal py-1 w-16">Lv {level}</th>
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
                  <td class="text-text-secondary py-0.5 pr-2">{displayName}</td>
                  <For each={[1, 2, 3]}>
                    {(tier) => (
                      <td class="text-center py-0.5">
                        <input
                          type="number"
                          min="0"
                          max="6"
                          value={getValueForExpertise(atomicFact, tier)}
                          onInput={(e) =>
                            handleChange(
                              atomicFact,
                              tier,
                              Number(e.currentTarget.value),
                            )
                          }
                          class="w-12 bg-bg-primary border border-border rounded px-1 py-0.5 text-center text-text-primary text-sm"
                        />
                      </td>
                    )}
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
