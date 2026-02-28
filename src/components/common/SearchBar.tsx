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
        class="bg-bg-primary border border-border rounded px-3 py-2 pr-7 text-sm text-text-primary placeholder-text-muted w-full focus:outline-none focus:border-physics"
      />
      <Show when={props.value}>
        <button
          onClick={() => props.onInput("")}
          class="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-sm leading-none"
          title="Clear search"
        >
          ×
        </button>
      </Show>
    </div>
  );
};

export default SearchBar;
