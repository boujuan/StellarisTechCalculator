import type { Component } from "solid-js";

interface Props {
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
}

const SearchBar: Component<Props> = (props) => {
  return (
    <input
      type="text"
      value={props.value}
      onInput={(e) => props.onInput(e.currentTarget.value)}
      placeholder={props.placeholder ?? "Search technologies..."}
      class="bg-bg-primary border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted w-64 focus:outline-none focus:border-physics"
    />
  );
};

export default SearchBar;
