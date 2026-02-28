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
            <span class="text-sm text-text-secondary flex-1 min-w-0">
              {entry.displayName}
            </span>
            <div class="flex items-center shrink-0">
              <button
                class="w-7 h-7 flex items-center justify-center bg-bg-tertiary hover:bg-border rounded-l border border-border text-text-primary text-sm font-bold transition-all duration-150 hover:shadow-[0_0_4px_var(--color-glow-physics)]"
                onClick={() => handleChange(entry.id, Math.max(0, councillorLevels[entry.id] - 1))}
              >
                −
              </button>
              <input
                type="number"
                min={0}
                max={20}
                value={councillorLevels[entry.id]}
                onInput={(e) => {
                  const v = Math.max(0, Math.min(20, Number(e.currentTarget.value)));
                  handleChange(entry.id, v);
                }}
                class="w-10 h-7 bg-bg-primary border-y border-border text-center text-text-primary text-sm font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                class="w-7 h-7 flex items-center justify-center bg-bg-tertiary hover:bg-border rounded-r border border-border text-text-primary text-sm font-bold transition-all duration-150 hover:shadow-[0_0_4px_var(--color-glow-physics)]"
                onClick={() => handleChange(entry.id, Math.min(20, councillorLevels[entry.id] + 1))}
              >
                +
              </button>
            </div>
          </div>
        )}
      </For>
    </div>
  );
};

export default CouncilPositions;
