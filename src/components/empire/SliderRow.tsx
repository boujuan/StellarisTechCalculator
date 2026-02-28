import { createSignal, onMount, Show, type Component } from "solid-js";
import type { ScalarMetadata } from "../../types/facts";
import { setScalarValue, scalarValues } from "../../state/empireState";
import { runUpdateCascade } from "../../engine/updateCascade";
import { debounce } from "../../utils/debounce";
import { isFromSave } from "../../state/importState";

interface Props {
  displayName: string;
  metadata: ScalarMetadata;
}

const debouncedCascade = debounce(() => runUpdateCascade(), 150);

const SliderRow: Component<Props> = (props) => {
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

  const value = () => scalarValues[props.displayName] ?? props.metadata.default;

  const handleChange = (newVal: number) => {
    const snapped =
      Math.round(newVal / props.metadata.step) * props.metadata.step;
    setScalarValue(props.displayName, snapped);
    debouncedCascade();
  };

  return (
    <div
      class="py-0.5"
      title={props.displayName}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Label row — full width, scroll-on-hover */}
      <div class="flex items-center gap-1 mb-0.5">
        <div ref={containerRef} class="overflow-hidden whitespace-nowrap flex-1">
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
            {props.displayName}
          </span>
        </div>
        <Show when={isFromSave(props.displayName)}>
          <span
            class="w-1.5 h-1.5 rounded-full bg-rare shrink-0"
            title="Loaded from save file"
          />
        </Show>
      </div>
      {/* Slider + number row */}
      <div class="flex items-center gap-2">
        <input
          type="range"
          min={props.metadata.min}
          max={props.metadata.max}
          step={props.metadata.step}
          value={value()}
          onInput={(e) => handleChange(Number(e.currentTarget.value))}
          class="flex-1 min-w-0 accent-physics"
        />
        <input
          type="number"
          min={props.metadata.min}
          max={props.metadata.max}
          step={props.metadata.step}
          value={Math.round(value())}
          onInput={(e) => {
            const v = Math.max(props.metadata.min, Math.min(props.metadata.max, Number(e.currentTarget.value)));
            handleChange(v);
          }}
          class="w-14 shrink-0 bg-transparent border-b border-border/50 text-right text-text-primary text-sm tabular-nums focus:border-physics focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>
  );
};

export default SliderRow;
