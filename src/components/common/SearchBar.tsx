import { Show, type Component } from "solid-js";

interface Props {
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
}

const SearchBar: Component<Props> = (props) => {
  return (
    <div class="relative w-64">
      <input
        type="text"
        value={props.value}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        placeholder={props.placeholder ?? "Search technologies..."}
        class="bg-bg-primary border border-border rounded px-3 py-2 pr-8 text-sm text-text-primary placeholder-text-muted w-full focus:outline-none focus:border-physics"
      />
      <Show when={props.value}>
        <button
          onClick={() => props.onInput("")}
          class="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-border bg-bg-tertiary flex items-center justify-center text-text-muted transition-all duration-150 hover:text-engineering hover:border-engineering/50 hover:bg-engineering/10 hover:shadow-[0_0_6px_var(--color-glow-engineering)]"
          title="Clear search"
        >
          <svg viewBox="0 0 12 12" class="w-2.5 h-2.5 fill-current"><path d="M2.22 2.22a.75.75 0 011.06 0L6 4.94l2.72-2.72a.75.75 0 111.06 1.06L7.06 6l2.72 2.72a.75.75 0 11-1.06 1.06L6 7.06 3.28 9.78a.75.75 0 01-1.06-1.06L4.94 6 2.22 3.28a.75.75 0 010-1.06z"/></svg>
        </button>
      </Show>
    </div>
  );
};

export default SearchBar;
