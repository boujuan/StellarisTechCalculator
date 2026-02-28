import { createSignal, createEffect, on, type JSX, type Component } from "solid-js";
import { useAccordionCommand } from "./AccordionContext";

interface Props {
  title: string;
  fontSize?: string;
  defaultOpen?: boolean;
  children: JSX.Element;
}

const SectionAccordion: Component<Props> = (props) => {
  const [open, setOpen] = createSignal(props.defaultOpen ?? false);
  const command = useAccordionCommand();

  // React to expand/collapse all commands
  createEffect(
    on(
      () => command().expandCount,
      () => { if (command().expandCount > 0) setOpen(true); },
    )
  );
  createEffect(
    on(
      () => command().collapseCount,
      () => { if (command().collapseCount > 0) setOpen(false); },
    )
  );

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
          style={{ transform: open() ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▶
        </span>
      </button>
      {/* Smooth height animation via CSS grid trick */}
      <div
        style={{
          display: "grid",
          "grid-template-rows": open() ? "1fr" : "0fr",
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
