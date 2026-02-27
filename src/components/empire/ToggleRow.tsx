import type { Component } from "solid-js";
import { atomicFacts, setAtomicValue } from "../../state/empireState";
import { runUpdateCascade } from "../../engine/updateCascade";

interface Props {
  displayName: string;
  facts: string[];
  disabled?: boolean;
  onBeforeToggle?: (newValue: boolean) => void;
}

const ToggleRow: Component<Props> = (props) => {
  const isChecked = () => {
    for (const fact of props.facts) {
      if (atomicFacts[fact]) return true;
    }
    return false;
  };

  const toggle = () => {
    const checked = isChecked();
    // When disabled, only allow toggling OFF (unchecking)
    if (props.disabled && !checked) return;

    const newValue = !checked;
    props.onBeforeToggle?.(newValue);
    for (const fact of props.facts) {
      setAtomicValue(fact, newValue);
    }
    runUpdateCascade();
  };

  const isDisabledForOn = () => props.disabled && !isChecked();

  return (
    <label
      class={`flex items-center gap-2 py-0.5 rounded px-1 -mx-1 ${
        isDisabledForOn()
          ? "opacity-40 cursor-not-allowed"
          : "cursor-pointer hover:bg-bg-tertiary"
      }`}
      title={props.displayName}
    >
      <input
        type="checkbox"
        checked={isChecked()}
        onChange={toggle}
        disabled={isDisabledForOn()}
        class={`w-4 h-4 accent-physics shrink-0 ${
          isDisabledForOn() ? "cursor-not-allowed" : ""
        }`}
      />
      <span class="text-sm text-text-secondary select-none">
        {props.displayName}
      </span>
    </label>
  );
};

export default ToggleRow;
