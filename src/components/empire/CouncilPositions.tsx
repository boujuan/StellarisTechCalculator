import { For, type Component } from "solid-js";
import {
  councillorLevels,
  setCouncillorLevel,
  recomputeExpertiseBonus,
} from "../../state/empireState";
import { runUpdateCascade } from "../../engine/updateCascade";
import type { CouncillorLevels } from "../../types/facts";

const COUNCILLOR_MAP: { displayName: string; id: keyof CouncillorLevels }[] = [
  { displayName: "Shroudwalker Teacher Councillor Skill Level", id: "shroudwalker_teacher" },
  { displayName: "Storm Caller Councillor Skill Level", id: "storm_caller" },
];

const CouncilPositions: Component = () => {
  const handleChange = (id: keyof CouncillorLevels, value: number) => {
    setCouncillorLevel(id, value);
    recomputeExpertiseBonus();
    runUpdateCascade();
  };

  return (
    <div class="space-y-1">
      <For each={COUNCILLOR_MAP}>
        {(entry) => (
          <div class="flex items-center gap-2 py-0.5">
            <span class="text-sm text-text-secondary flex-1">
              {entry.displayName}
            </span>
            <input
              type="number"
              min="0"
              max="20"
              value={councillorLevels[entry.id]}
              onInput={(e) =>
                handleChange(entry.id, Number(e.currentTarget.value))
              }
              class="w-16 bg-bg-primary border border-border rounded px-2 py-0.5 text-center text-text-primary text-sm"
            />
          </div>
        )}
      </For>
    </div>
  );
};

export default CouncilPositions;
