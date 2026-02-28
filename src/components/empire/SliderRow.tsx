import type { Component } from "solid-js";
import type { ScalarMetadata } from "../../types/facts";
import { setScalarValue, scalarValues } from "../../state/empireState";
import { runUpdateCascade } from "../../engine/updateCascade";
import { debounce } from "../../utils/debounce";

interface Props {
  displayName: string;
  metadata: ScalarMetadata;
}

const debouncedCascade = debounce(() => runUpdateCascade(), 150);

const SliderRow: Component<Props> = (props) => {
  const value = () => scalarValues[props.displayName] ?? props.metadata.default;

  const handleChange = (newVal: number) => {
    // Snap to step
    const snapped =
      Math.round(newVal / props.metadata.step) * props.metadata.step;
    setScalarValue(props.displayName, snapped);
    debouncedCascade();
  };

  return (
    <div class="flex items-center gap-2 py-0.5">
      <span class="text-sm text-text-secondary flex-1 min-w-0 truncate">
        {props.displayName}
      </span>
      <input
        type="range"
        min={props.metadata.min}
        max={props.metadata.max}
        step={props.metadata.step}
        value={value()}
        onInput={(e) => handleChange(Number(e.currentTarget.value))}
        class="w-24 accent-physics"
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
        class="w-12 bg-transparent border-b border-border/50 text-right text-text-primary text-sm tabular-nums focus:border-physics focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
};

export default SliderRow;
