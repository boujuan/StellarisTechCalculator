import { createSignal, createEffect, type JSX, type Component } from "solid-js";
import { useAccordionCommand } from "./AccordionContext";

interface Props {
  title: string;
  fontSize?: string;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  children: JSX.Element;
}

const SectionAccordion: Component<Props> = (props) => {
  const [open, setOpen] = createSignal(props.defaultOpen ?? false);
  const command = useAccordionCommand();

  // Effective open state: forceOpen overrides manual toggle
  const effectiveOpen = () => props.forceOpen || open();

  // React to expand/collapse all commands.
  // Track last-seen counts so that late-mounting instances (e.g. after
  // search-filter changes) inherit the current expanded/collapsed state.
  let prevExpand = 0;
  let prevCollapse = 0;

  createEffect(() => {
    const { expandCount, collapseCount } = command();

    if (expandCount > prevExpand) {
      prevExpand = expandCount;
      setOpen(true);
    }

    if (collapseCount > prevCollapse) {
      prevCollapse = collapseCount;
      setOpen(false);
    }
  });

  return (
    <div class="border-b border-border">
      <button
        class="w-full text-left px-3 py-2 hover:bg-bg-tertiary transition-colors flex items-center justify-between group"
        onClick={() => setOpen(!open())}
      >
        <span
          class="font-semibold text-text-primary"
          style={{ "font-size": props.fontSize ?? "14px" }}
        >
          {props.title}
        </span>
        <span
          class="text-text-muted text-xs transition-transform duration-200"
          style={{ transform: effectiveOpen() ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▶
        </span>
      </button>
      {/* Smooth height animation via CSS grid trick */}
      <div
        style={{
          display: "grid",
          "grid-template-rows": effectiveOpen() ? "1fr" : "0fr",
          transition: "grid-template-rows 0.25s ease-out",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div class="px-3 pb-2">{props.children}</div>
        </div>
      </div>
    </div>
  );
};

export default SectionAccordion;
