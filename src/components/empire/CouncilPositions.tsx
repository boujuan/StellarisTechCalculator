import { For, Show, createSignal, onMount, type Component } from "solid-js";
import {
  councillorLevels,
  setCouncillorLevel,
  recomputeExpertiseBonus,
} from "../../state/empireState";
import { runUpdateCascade } from "../../engine/updateCascade";
import type { CouncillorLevels } from "../../types/facts";
import { isFromSave } from "../../state/importState";

const COUNCILLOR_MAP: { displayName: string; id: keyof CouncillorLevels }[] = [
  { displayName: "Shroudwalker Teacher Councillor Skill Level", id: "shroudwalker_teacher" },
  { displayName: "Storm Caller Councillor Skill Level", id: "storm_caller" },
];

/** Scrolling label — same pattern as ExpertiseGrid ScrollName but using div */
const ScrollLabel: Component<{ name: string; saveKey?: string }> = (props) => {
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
    <div
      class="flex items-center gap-1 mb-0.5"
      title={props.name}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        ref={containerRef}
        class="overflow-hidden whitespace-nowrap flex-1"
      >
        <span
          ref={textRef}
          class="inline-block text-xs text-text-secondary select-none"
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
      <Show when={props.saveKey && isFromSave(props.saveKey!)}>
        <span
          class="w-1.5 h-1.5 rounded-full bg-rare shrink-0"
          title="Loaded from save file"
        />
      </Show>
    </div>
  );
};

const CouncilPositions: Component = () => {
  const handleChange = (id: keyof CouncillorLevels, value: number) => {
    if (councillorLevels[id] === value) return;
    setCouncillorLevel(id, value);
    recomputeExpertiseBonus();
    runUpdateCascade();
  };

  return (
    <div class="space-y-1">
      <For each={COUNCILLOR_MAP}>
        {(entry) => (
          <div class="py-0.5">
            {/* Label row — full width, scroll-on-hover */}
            <ScrollLabel name={entry.displayName} saveKey={entry.displayName} />
            {/* Controls row — right-aligned */}
            <div class="flex justify-end">
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
          </div>
        )}
      </For>
    </div>
  );
};

export default CouncilPositions;
