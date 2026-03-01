import { createSignal, onMount, Show, type Component } from "solid-js";
import { atomicFacts, setAtomicValue } from "../../state/empireState";
import { runUpdateCascade } from "../../engine/updateCascade";
import { isFromSave, unmarkFromSave } from "../../state/importState";

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
      unmarkFromSave(fact);
      setAtomicValue(fact, newValue);
    }
    runUpdateCascade();
  };

  const isDisabledForOn = () => props.disabled && !isChecked();

  const checkboxImg = () => isChecked() ? cbPressed : cbNormal;

  return (
    <label
      class={`flex items-center gap-1.5 py-0.5 rounded px-1 -mx-1 group ${
        isDisabledForOn()
          ? "opacity-40 cursor-not-allowed"
          : "cursor-pointer hover:bg-bg-tertiary"
      }`}
      title={props.displayName}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
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
        class={`stellaris-check shrink-0 ${isChecked() ? "is-checked" : ""} ${isDisabledForOn() ? "is-disabled" : ""}`}
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
      <div ref={containerRef} class="overflow-hidden whitespace-nowrap min-w-0 flex-1">
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
      <Show when={props.facts.some(f => isFromSave(f))}>
        <span
          class="w-1.5 h-1.5 rounded-full bg-rare shrink-0"
          title="Loaded from save file"
        />
      </Show>
    </label>
  );
};

export default ToggleRow;
