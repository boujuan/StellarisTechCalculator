import { batch, createSignal, For, Show, onCleanup, type Component } from "solid-js";
import type { Area } from "../../types/tech";
import {
  researchAlternatives,
  setResearchAlternatives,
  resetEmpireState,
} from "../../state/empireState";
import { resetTechState } from "../../state/techState";
import { runUpdateCascade } from "../../engine/updateCascade";
import SearchBar from "../common/SearchBar";

type AreaFilter = "all" | Area;

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  areaFilter: AreaFilter;
  onAreaFilterChange: (area: AreaFilter) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onSaveLoad: () => void;
  techViewFilters: Set<string>;
  onTechViewChange: (filters: Set<string>) => void;
}

const AREA_FILTERS: { label: string; value: AreaFilter; color: string; hoverColor: string; glowVar: string; title: string }[] = [
  { label: "All", value: "all", color: "text-text-primary", hoverColor: "hover:text-text-primary", glowVar: "", title: "Show all research areas" },
  { label: "Physics", value: "physics", color: "text-physics", hoverColor: "hover:text-physics", glowVar: "var(--color-glow-physics)", title: "Physics: energy, computing, particles, field manipulation" },
  { label: "Society", value: "society", color: "text-society", hoverColor: "hover:text-society", glowVar: "var(--color-glow-society)", title: "Society: biology, military theory, new worlds, statecraft" },
  { label: "Engineering", value: "engineering", color: "text-engineering", hoverColor: "hover:text-engineering", glowVar: "var(--color-glow-engineering)", title: "Engineering: industry, materials, propulsion, voidcraft" },
];

const SORT_OPTIONS = [
  { label: "Name", value: "name", title: "Sort alphabetically by technology name" },
  { label: "Weight", value: "weight", title: "Sort by current computed weight (after modifiers)" },
  { label: "Hit %", value: "hit_chance", title: "Sort by hit chance — probability of being offered" },
  { label: "Tier", value: "tier", title: "Sort by technology tier (T0–T5)" },
  { label: "Delta", value: "delta", title: "Sort by opportunity value — weight of techs this unlocks" },
  { label: "Base Weight", value: "base_weight", title: "Sort by the tech's static base weight from game data (before modifiers)" },
  { label: "Category", value: "category", title: "Sort by tech subcategory (e.g., particles, biology, voidcraft)" },
  { label: "Area", value: "area", title: "Group by research area: physics, society, engineering" },
];

const TECH_VIEW_FILTERS: { key: string; label: string; desc: string; colorClass: string }[] = [
  { key: "current", label: "Current", desc: "Available pool + drawn last + permanent unresearched", colorClass: "text-physics" },
  { key: "potential", label: "Potential", desc: "All techs passing the potential check", colorClass: "text-society" },
  { key: "researched", label: "Researched", desc: "Already researched technologies", colorClass: "text-engineering" },
  { key: "previous", label: "Previous Options", desc: "Techs marked as drawn last", colorClass: "text-rare" },
  { key: "permanent", label: "Permanent Options", desc: "Always-available repeatable techs", colorClass: "text-text-secondary" },
  { key: "zero_weight", label: "Zero Weight", desc: "Techs with zero base weight", colorClass: "text-text-muted" },
  { key: "not_possible", label: "Not Possible", desc: "Techs failing the potential check", colorClass: "text-dangerous" },
  { key: "all", label: "All", desc: "Show every tech (overrides other filters)", colorClass: "text-text-primary" },
];

const base = import.meta.env.BASE_URL;
const cbNormal = `${base}media/sprites/checkbox_normal.avif`;
const cbHover = `${base}media/sprites/checkbox_hover.avif`;
const cbPressed = `${base}media/sprites/checkbox_pressed.avif`;

const Toolbar: Component<Props> = (props) => {
  const [sortOpen, setSortOpen] = createSignal(false);
  const [viewOpen, setViewOpen] = createSignal(false);
  let sortRef: HTMLDivElement | undefined;
  let viewRef: HTMLDivElement | undefined;

  // Close dropdowns on outside click
  const handleOutsideClick = (e: MouseEvent) => {
    if (sortOpen() && sortRef && !sortRef.contains(e.target as Node)) {
      setSortOpen(false);
    }
    if (viewOpen() && viewRef && !viewRef.contains(e.target as Node)) {
      setViewOpen(false);
    }
  };

  // Close on Escape
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setSortOpen(false);
      setViewOpen(false);
    }
  };

  if (typeof document !== "undefined") {
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    onCleanup(() => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    });
  }

  const handleReset = () => {
    if (confirm("Reset all settings to defaults?")) {
      batch(() => {
        resetEmpireState();
        resetTechState();
      });
      runUpdateCascade();
    }
  };

  const currentSortLabel = () =>
    SORT_OPTIONS.find((o) => o.value === props.sortBy)?.label ?? "Sort";

  const toggleFilter = (key: string) => {
    if (key === "all") {
      props.onTechViewChange(new Set(["all"]));
      return;
    }
    const next = new Set(props.techViewFilters);
    next.delete("all");
    // Mutual exclusivity
    if (key === "potential") next.delete("not_possible");
    if (key === "not_possible") next.delete("potential");
    // Toggle
    if (next.has(key)) next.delete(key);
    else next.add(key);
    // If empty, default to "all"
    if (next.size === 0) next.add("all");
    props.onTechViewChange(next);
  };

  const activeFilterCount = () => {
    if (props.techViewFilters.has("all")) return 0;
    return props.techViewFilters.size;
  };

  return (
    <header
      class="h-16 border-b-2 border-border flex items-center px-6 gap-5 shrink-0"
      style={{
        "background-color": "rgba(26, 29, 35, 0.8)",
        "backdrop-filter": "blur(10px)",
        "-webkit-backdrop-filter": "blur(10px)",
      }}
    >
      <h1
        class="text-lg font-bold text-text-primary whitespace-nowrap font-display tracking-wide border-b-2 border-physics/40 pb-0.5"
        style={{ "text-shadow": "0 0 16px rgba(59,130,246,0.5), 0 0 40px rgba(59,130,246,0.15)" }}
      >
        Stellaris Tech Calculator
      </h1>

      <SearchBar
        value={props.search}
        onInput={props.onSearchChange}
      />

      {/* Area filter buttons */}
      <div class="flex gap-1 border-r border-border/40 pr-4">
        <For each={AREA_FILTERS}>
          {(filter) => (
            <button
              class={`px-3 py-1.5 text-sm rounded transition-all duration-200 ${
                props.areaFilter === filter.value
                  ? "bg-bg-tertiary " + filter.color + " font-medium"
                  : "text-text-muted " + filter.hoverColor
              }`}
              style={
                props.areaFilter === filter.value && filter.glowVar
                  ? {
                      "box-shadow": `0 2px 8px ${filter.glowVar}`,
                      "border-bottom": "2px solid currentColor",
                    }
                  : {}
              }
              onClick={() => props.onAreaFilterChange(filter.value)}
              title={filter.title}
            >
              {filter.label}
            </button>
          )}
        </For>
      </div>

      {/* Sort dropdown — styled */}
      <div ref={sortRef} class="relative border-r border-border/40 pr-4">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-border bg-bg-primary text-text-primary hover:border-physics/50 hover:shadow-[0_0_6px_var(--color-glow-physics)] transition-all duration-200"
          onClick={() => { setSortOpen(!sortOpen()); setViewOpen(false); }}
          title="Sort technologies by..."
        >
          <span class="text-text-muted text-xs">Order:</span>
          <span class="font-medium">{currentSortLabel()}</span>
          <svg class={`w-3 h-3 text-text-muted transition-transform ${sortOpen() ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 4.5L6 7.5L9 4.5" />
          </svg>
        </button>
        <Show when={sortOpen()}>
          <div class="absolute top-full left-0 mt-1 z-50 min-w-48 bg-bg-secondary border border-border rounded-lg shadow-2xl overflow-hidden"
            style={{ "box-shadow": "0 4px 24px rgba(0,0,0,0.5), 0 0 8px var(--color-glow-physics)" }}
          >
            <For each={SORT_OPTIONS}>
              {(opt) => (
                <button
                  class={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    props.sortBy === opt.value
                      ? "bg-physics/15 text-physics font-medium"
                      : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                  }`}
                  onClick={() => { props.onSortChange(opt.value); setSortOpen(false); }}
                  title={opt.title}
                >
                  {opt.label}
                </button>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Tech View — multi-select filter dropdown */}
      <div ref={viewRef} class="relative">
        <button
          class={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border transition-all duration-200 ${
            activeFilterCount() > 0
              ? "border-engineering/50 bg-engineering/10 text-engineering hover:shadow-[0_0_8px_var(--color-glow-engineering)]"
              : "border-border bg-bg-primary text-text-primary hover:border-engineering/50 hover:shadow-[0_0_6px_var(--color-glow-engineering)]"
          }`}
          onClick={() => { setViewOpen(!viewOpen()); setSortOpen(false); }}
          title="Filter which technologies are visible"
        >
          <span class="text-text-muted text-xs">View:</span>
          <span class="font-medium">
            {props.techViewFilters.has("all")
              ? "All"
              : activeFilterCount() === 1
                ? TECH_VIEW_FILTERS.find((f) => props.techViewFilters.has(f.key))?.label ?? "Filter"
                : `${activeFilterCount()} active`}
          </span>
          <Show when={activeFilterCount() > 1}>
            <span class="ml-0.5 w-4 h-4 rounded-full bg-engineering/30 text-engineering text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount()}
            </span>
          </Show>
          <svg class={`w-3 h-3 text-text-muted transition-transform ${viewOpen() ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 4.5L6 7.5L9 4.5" />
          </svg>
        </button>
        <Show when={viewOpen()}>
          <div class="absolute top-full left-0 mt-1 z-50 min-w-64 bg-bg-secondary border border-border rounded-lg shadow-2xl overflow-hidden"
            style={{ "box-shadow": "0 4px 24px rgba(0,0,0,0.5), 0 0 8px var(--color-glow-engineering)" }}
          >
            <div class="px-3 py-1.5 border-b border-border/50">
              <span class="text-[10px] text-text-muted uppercase tracking-wider font-medium">Tech View Filters</span>
            </div>
            <For each={TECH_VIEW_FILTERS}>
              {(filter) => {
                const isChecked = () => props.techViewFilters.has(filter.key);
                const isDisabled = () => {
                  // Disable "Potential" when "Not Possible" is active and vice versa (shown as dimmed)
                  if (filter.key === "potential" && props.techViewFilters.has("not_possible")) return true;
                  if (filter.key === "not_possible" && props.techViewFilters.has("potential")) return true;
                  return false;
                };
                const checkboxImg = () => isChecked() ? cbPressed : cbNormal;

                return (
                  <button
                    class={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
                      isDisabled()
                        ? "opacity-30 cursor-not-allowed"
                        : isChecked()
                          ? "bg-bg-tertiary/50"
                          : "hover:bg-bg-tertiary"
                    }`}
                    onClick={() => { if (!isDisabled()) toggleFilter(filter.key); }}
                    title={filter.desc}
                  >
                    <span
                      class={`stellaris-check shrink-0 ${isChecked() ? "is-checked" : ""} ${isDisabled() ? "is-disabled" : ""}`}
                      style={{
                        "background-image": `url(${checkboxImg()})`,
                        width: "18px",
                        height: "18px",
                      }}
                      onMouseEnter={(e) => {
                        if (!isDisabled() && !isChecked()) {
                          e.currentTarget.style.backgroundImage = `url(${cbHover})`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundImage = `url(${checkboxImg()})`;
                      }}
                    />
                    <div class="flex flex-col min-w-0">
                      <span class={`text-sm font-medium ${isChecked() ? filter.colorClass : "text-text-secondary"}`}>
                        {filter.label}
                      </span>
                      <span class="text-[10px] text-text-muted leading-tight">{filter.desc}</span>
                    </div>
                  </button>
                );
              }}
            </For>
          </div>
        </Show>
      </div>

      {/* Save/Load */}
      <button
        onClick={props.onSaveLoad}
        class="text-sm text-text-secondary hover:text-text-primary px-3 py-1.5 border border-border rounded transition-colors"
        title="Save or load empire configurations"
      >
        Save/Load
      </button>

      {/* Reset */}
      <button
        onClick={handleReset}
        class="text-sm text-dangerous hover:text-dangerous/80 px-3 py-1.5 border border-dangerous/30 rounded font-medium transition-colors"
        title="Reset all empire settings and tech state to defaults"
      >
        Reset
      </button>

      {/* Research Alternatives */}
      <div
        class="flex items-center gap-3 ml-auto"
        title="Number of research alternatives offered each turn. Default is 3. Increased by certain techs, civics, and the Discovery tradition."
      >
        <span class="text-sm text-text-secondary font-medium whitespace-nowrap">Research Alternatives</span>
        <div class="flex items-center">
          <button
            class="w-8 h-8 flex items-center justify-center bg-bg-tertiary hover:bg-border rounded-l border border-border text-text-primary text-lg font-bold transition-all duration-150 hover:shadow-[0_0_6px_var(--color-glow-physics)]"
            onClick={() => {
              const v = Math.max(1, researchAlternatives() - 1);
              setResearchAlternatives(v);
              runUpdateCascade();
            }}
            title="Decrease research alternatives"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            max="10"
            value={researchAlternatives()}
            onInput={(e) => {
              const v = Math.max(1, Math.min(10, Number(e.currentTarget.value)));
              setResearchAlternatives(v);
              runUpdateCascade();
            }}
            class="w-12 h-8 bg-bg-primary border-y border-border text-center text-text-primary text-base font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            class="w-8 h-8 flex items-center justify-center bg-bg-tertiary hover:bg-border rounded-r border border-border text-text-primary text-lg font-bold transition-all duration-150 hover:shadow-[0_0_6px_var(--color-glow-physics)]"
            onClick={() => {
              const v = Math.min(10, researchAlternatives() + 1);
              setResearchAlternatives(v);
              runUpdateCascade();
            }}
            title="Increase research alternatives"
          >
            +
          </button>
        </div>
      </div>
    </header>
  );
};

export default Toolbar;
