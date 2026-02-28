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
          class="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-border bg-bg-tertiary flex items-center justify-center text-text-muted text-xs leading-none transition-all duration-150 hover:text-engineering hover:border-engineering/50 hover:bg-engineering/10 hover:shadow-[0_0_6px_var(--color-glow-engineering)]"
          title="Clear search"
        >
          ×
        </button>
      </Show>
    </div>
  );
};

export default SearchBar;
