import type { Component } from "solid-js";
import { atomicFacts, setAtomicValue } from "../../state/empireState";
import { runUpdateCascade } from "../../engine/updateCascade";

interface Props {
  displayName: string;
  facts: string[];
}

const ToggleRow: Component<Props> = (props) => {
  const isChecked = () => {
    for (const fact of props.facts) {
      if (atomicFacts[fact]) return true;
    }
    return false;
  };

  const toggle = () => {
    const newValue = !isChecked();
    for (const fact of props.facts) {
      setAtomicValue(fact, newValue);
    }
    runUpdateCascade();
  };

  return (
    <label class="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-bg-tertiary rounded px-1 -mx-1">
      <input
        type="checkbox"
        checked={isChecked()}
        onChange={toggle}
        class="w-4 h-4 accent-physics shrink-0"
      />
      <span class="text-sm text-text-secondary select-none">
        {props.displayName}
      </span>
    </label>
  );
};

export default ToggleRow;
