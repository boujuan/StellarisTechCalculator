import type { Component } from "solid-js";
import { atomicFacts, setAtomicValue } from "../../state/empireState";
import { runUpdateCascade } from "../../engine/updateCascade";

interface Props {
  displayName: string;
  facts: string[];
  disabled?: boolean;
  onBeforeToggle?: (newValue: boolean) => void;
}

const base = import.meta.env.BASE_URL;
const cbNormal = `${base}media/sprites/checkbox_normal.avif`;
const cbHover = `${base}media/sprites/checkbox_hover.avif`;
const cbPressed = `${base}media/sprites/checkbox_pressed.avif`;

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

  const checkboxImg = () => isChecked() ? cbPressed : cbNormal;

  return (
    <label
      class={`flex items-center gap-2 py-0.5 rounded px-1 -mx-1 group ${
        isDisabledForOn()
          ? "opacity-40 cursor-not-allowed"
          : "cursor-pointer hover:bg-bg-tertiary"
      }`}
      title={props.displayName}
    >
      {/* Hidden native checkbox for accessibility */}
      <input
        type="checkbox"
        checked={isChecked()}
        onChange={toggle}
        disabled={isDisabledForOn()}
        class="sr-only"
      />
      {/* Stellaris sprite checkbox */}
      <span
        class={`stellaris-check ${isChecked() ? "is-checked" : ""} ${isDisabledForOn() ? "is-disabled" : ""}`}
        style={{ "background-image": `url(${checkboxImg()})` }}
        onMouseEnter={(e) => {
          if (!isDisabledForOn() && !isChecked()) {
            e.currentTarget.style.backgroundImage = `url(${cbHover})`;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundImage = `url(${checkboxImg()})`;
        }}
      />
      <span class="text-sm text-text-secondary select-none">
        {props.displayName}
      </span>
    </label>
  );
};

export default ToggleRow;
