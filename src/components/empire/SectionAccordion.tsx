import { createSignal, type JSX, type Component } from "solid-js";

interface Props {
  title: string;
  fontSize?: string;
  defaultOpen?: boolean;
  children: JSX.Element;
}

const SectionAccordion: Component<Props> = (props) => {
  const [open, setOpen] = createSignal(props.defaultOpen ?? false);

  return (
    <div class="border-b border-border">
      <button
        class="w-full text-left px-3 py-2 hover:bg-bg-tertiary transition-colors flex items-center justify-between"
        onClick={() => setOpen(!open())}
      >
        <span
          class="font-semibold text-text-primary"
          style={{ "font-size": props.fontSize ?? "14px" }}
        >
          {props.title}
        </span>
        <span class="text-text-muted text-xs">{open() ? "▼" : "▶"}</span>
      </button>
      <div
        class="overflow-hidden transition-all"
        style={{ display: open() ? "block" : "none" }}
      >
        <div class="px-3 pb-2">{props.children}</div>
      </div>
    </div>
  );
};

export default SectionAccordion;
