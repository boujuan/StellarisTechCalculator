/**
 * Sidebar — empire modifiers panel.
 * Assembles sections from atomic_facts_metadata.json structure.
 * Includes: DLC select-all, origins exclusivity, ethics constraints, civics max-3,
 * expand/collapse all, scroll-to-top, modifier search filter.
 */
import { For, Show, batch, createMemo, createSignal, type Component } from "solid-js";
import { metadata, scalarMetadata } from "../../state/dataStore";
import { atomicFacts, setAtomicValue } from "../../state/empireState";
import { runUpdateCascade } from "../../engine/updateCascade";
import { enforceEthicsConstraints, currentEthicsPoints } from "../../utils/ethicsConstraints";
import SectionAccordion from "../empire/SectionAccordion";
import ToggleRow from "../empire/ToggleRow";
import SliderRow from "../empire/SliderRow";
import ExpertiseGrid from "../empire/ExpertiseGrid";
import CouncilPositions from "../empire/CouncilPositions";
import { AccordionProvider, type AccordionCommand } from "../empire/AccordionContext";
import type { SectionFacts } from "../../types/facts";

// ── Helpers ───────────────────────────────────────────────────────────

function getSubsectionFacts(topSection: string, subSection: string): Record<string, string[]> {
  const top = metadata[topSection] as Record<string, unknown> | undefined;
  if (!top) return {};
  const sub = top[subSection] as SectionFacts | undefined;
  return (sub?.facts ?? {}) as Record<string, string[]>;
}

/** Check if a display name matches a search filter (empty filter = always match) */
function matchesFilter(name: string, filter: string): boolean {
  return !filter || name.toLowerCase().includes(filter);
}

/** Recursively collect all fact display names from a metadata section object.
 *  Display names are keys whose values are arrays (fact ID lists). */
function collectDisplayNames(obj: unknown): string[] {
  const names: string[] = [];
  if (!obj || typeof obj !== "object") return names;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      names.push(key);
    } else if (value && typeof value === "object") {
      names.push(...collectDisplayNames(value));
    }
  }
  return names;
}

/** Check if ANY display name in a top-level section matches the filter */
function sectionHasMatch(sectionName: string, filter: string): boolean {
  if (!filter) return true;
  const section = metadata[sectionName];
  return collectDisplayNames(section).some((name) => matchesFilter(name, filter));
}

// ── Sidebar component ──────────────────────────────────────────────────

interface SidebarProps {
  onShowTutorial: () => void;
}

const Sidebar: Component<SidebarProps> = (props) => {
  const sectionNames = () => Object.keys(metadata);

  // Expand/Collapse all
  const [accordionCmd, setAccordionCmd] = createSignal<AccordionCommand>({
    expandCount: 0,
    collapseCount: 0,
  });

  const expandAll = () =>
    setAccordionCmd((prev) => ({ ...prev, expandCount: prev.expandCount + 1 }));
  const collapseAll = () =>
    setAccordionCmd((prev) => ({ ...prev, collapseCount: prev.collapseCount + 1 }));

  // Scroll to top
  let scrollRef: HTMLDivElement | undefined;
  const [showScrollTop, setShowScrollTop] = createSignal(false);

  // ── Sidebar search filter ───────────────────────────────────────────

  const [sidebarSearch, setSidebarSearch] = createSignal("");
  const searchFilter = () => sidebarSearch().toLowerCase().trim();
  const isSearching = () => !!searchFilter();

  // ── DLC select-all logic ──────────────────────────────────────────

  const dlcFacts = createMemo(() => {
    const section = metadata["DLC"] as SectionFacts | undefined;
    if (!section?.facts) return [];
    const all: string[] = [];
    for (const facts of Object.values(section.facts)) {
      all.push(...(facts as string[]));
    }
    return all;
  });

  const allDlcSelected = createMemo(() => {
    const facts = dlcFacts();
    return facts.length > 0 && facts.every((f) => atomicFacts[f]);
  });

  const toggleAllDlc = () => {
    const selectAll = !allDlcSelected();
    batch(() => {
      for (const fact of dlcFacts()) {
        setAtomicValue(fact, selectAll);
      }
    });
    runUpdateCascade();
  };

  // ── Origins mutual exclusivity ────────────────────────────────────

  const originFacts = () => getSubsectionFacts("Empire Setup", "Origins");

  const clearOtherOrigins = (currentName: string) => {
    batch(() => {
      for (const [name, facts] of Object.entries(originFacts())) {
        if (name !== currentName) {
          for (const fact of facts) {
            setAtomicValue(fact, false);
          }
        }
      }
    });
  };

  // ── Civics max-3 ──────────────────────────────────────────────────

  const civicFacts = () => getSubsectionFacts("Empire Setup", "Civics");

  const activeCivicCount = createMemo(() => {
    let count = 0;
    for (const facts of Object.values(civicFacts())) {
      if ((facts as string[]).some((f) => atomicFacts[f])) count++;
    }
    return count;
  });

  const civicsAtMax = () => activeCivicCount() >= 3;

  // ── Ethics points display ─────────────────────────────────────────

  const ethicsPoints = createMemo(() => currentEthicsPoints());

  const bgUrl = `${import.meta.env.BASE_URL}media/ui/extradimensional_blue_room.avif`;

  return (
    <aside
      class="w-64 border-r border-border overflow-hidden shrink-0 flex flex-col relative"
      style={{
        "background-color": "var(--color-bg-secondary)",
        "background-image": `url(${bgUrl})`,
        "background-size": "cover",
        "background-position": "center top",
        "background-blend-mode": "overlay",
        "background-repeat": "no-repeat",
      }}
    >
      {/* Semi-transparent overlay to dim the background */}
      <div class="absolute inset-0 bg-bg-secondary/92 z-0" />

      {/* Header with expand/collapse buttons + search */}
      <div class="border-b border-border relative z-10">
        <div class="p-3 pb-2">
          <div class="flex items-center justify-between">
            <h2
              class="text-base font-bold text-text-primary font-display tracking-wide border-b border-physics/30 pb-1"
              style={{ "text-shadow": "0 0 14px rgba(59,130,246,0.4), 0 0 35px rgba(59,130,246,0.12)" }}
            >
              Empire Modifiers
            </h2>
            <div class="flex gap-1">
              <button
                onClick={expandAll}
                class="text-xs text-text-muted hover:text-physics px-1.5 py-0.5 border border-border rounded transition-all duration-150 hover:border-physics/40 hover:shadow-[0_0_4px_var(--color-glow-physics)]"
                title="Expand all sections"
              >
                Expand
              </button>
              <button
                onClick={collapseAll}
                class="text-xs text-text-muted hover:text-physics px-1.5 py-0.5 border border-border rounded transition-all duration-150 hover:border-physics/40 hover:shadow-[0_0_4px_var(--color-glow-physics)]"
                title="Collapse all sections"
              >
                Collapse
              </button>
            </div>
          </div>
        </div>
        {/* Search input */}
        <div class="px-3 pb-2">
          <div class="relative">
            <input
              type="text"
              placeholder="Filter modifiers..."
              value={sidebarSearch()}
              onInput={(e) => setSidebarSearch(e.currentTarget.value)}
              class="w-full bg-bg-primary/50 border border-border rounded text-xs px-2 py-1.5 pr-7 text-text-primary placeholder:text-text-muted/60 focus:border-physics/50 focus:outline-none transition-colors"
            />
            <Show when={sidebarSearch()}>
              <button
                onClick={() => setSidebarSearch("")}
                class="absolute right-1 top-1/2 -translate-y-1/2 w-4.5 h-4.5 rounded-full border border-border bg-bg-tertiary flex items-center justify-center text-text-muted transition-all duration-150 hover:text-engineering hover:border-engineering/50 hover:bg-engineering/10 hover:shadow-[0_0_6px_var(--color-glow-engineering)]"
                title="Clear filter"
              >
                <svg viewBox="0 0 12 12" class="w-2 h-2 fill-current"><path d="M2.22 2.22a.75.75 0 011.06 0L6 4.94l2.72-2.72a.75.75 0 111.06 1.06L7.06 6l2.72 2.72a.75.75 0 11-1.06 1.06L6 7.06 3.28 9.78a.75.75 0 01-1.06-1.06L4.94 6 2.22 3.28a.75.75 0 010-1.06z"/></svg>
              </button>
            </Show>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <AccordionProvider value={accordionCmd}>
        <div
          class="flex-1 overflow-y-auto relative z-10"
          ref={scrollRef}
          onScroll={(e) => setShowScrollTop(e.currentTarget.scrollTop > 200)}
        >
          <For each={sectionNames()}>
            {(sectionName) => {
              const section = metadata[sectionName];
              return (
                <Show when={sectionHasMatch(sectionName, searchFilter())}>
                  <SectionAccordion title={sectionName} forceOpen={isSearching()}>
                    <Show
                      when={sectionName === "Council"}
                      fallback={
                        <DefaultSection
                          sectionData={section as Record<string, unknown>}
                          sectionName={sectionName}
                          searchFilter={searchFilter()}
                          originFacts={originFacts}
                          clearOtherOrigins={clearOtherOrigins}
                          civicsAtMax={civicsAtMax}
                          activeCivicCount={activeCivicCount}
                          ethicsPoints={ethicsPoints}
                        />
                      }
                    >
                      <CouncilSection
                        sectionData={
                          (section as { facts?: unknown }).facts ?? section
                        }
                        searchFilter={searchFilter()}
                      />
                    </Show>

                    {/* DLC Select All button */}
                    <Show when={sectionName === "DLC"}>
                      <div class="px-1 pt-1 pb-0.5">
                        <button
                          onClick={toggleAllDlc}
                          class="text-xs text-physics hover:text-physics/80 px-2 py-1 border border-physics/30 rounded w-full transition-colors"
                        >
                          {allDlcSelected() ? "Deselect All DLC" : "Select All DLC"}
                        </button>
                      </div>
                    </Show>
                  </SectionAccordion>
                </Show>
              );
            }}
          </For>
        </div>
      </AccordionProvider>

      {/* Persistent footer — ? button, GitHub, version */}
      <div class="border-t border-border bg-bg-secondary/95 px-3 py-2 relative z-10 shrink-0">
        <div class="flex items-center gap-2">
          <button
            onClick={props.onShowTutorial}
            class="w-8 h-8 rounded-full bg-bg-tertiary border-2 border-physics/50 text-physics font-bold text-sm
                   hover:bg-physics/20 hover:border-physics transition-all flex items-center justify-center"
            title="Show tutorial / help"
          >
            ?
          </button>
          <a
            href="https://github.com/boujuan/StellarisTechCalculator"
            target="_blank"
            rel="noopener noreferrer"
            class="w-8 h-8 rounded-full bg-bg-tertiary border-2 border-text-muted/30 text-text-muted
                   hover:bg-text-muted/10 hover:border-text-secondary hover:text-text-secondary transition-all flex items-center justify-center"
            title="View source on GitHub"
          >
            <svg viewBox="0 0 16 16" class="w-4 h-4 fill-current" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
          <span class="text-[10px] text-text-muted/60 leading-tight select-none">
            <a
              href="https://github.com/boujuan/StellarisTechCalculator/releases"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-physics transition-colors"
              title="View changelog on GitHub"
            >
              v{__APP_VERSION__}
            </a>
            {" | "}
            <a
              href="https://stellaris.paradoxwikis.com/Patch_4.3.X"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-physics transition-colors"
              title="View Stellaris patch notes"
            >
              Stellaris {__STELLARIS_VERSION__}
            </a>
            <br />
            <span class="text-text-muted/40">boujuan</span>
          </span>
        </div>
      </div>

      {/* Scroll to top button — always rendered, visibility toggled via opacity */}
      <button
        onClick={() => scrollRef?.scrollTo({ top: 0, behavior: "smooth" })}
        class="absolute bottom-14 right-3 w-9 h-9 rounded-full bg-bg-tertiary border border-border text-text-muted hover:text-physics flex items-center justify-center shadow-lg transition-all duration-300 z-20 hover:shadow-[0_0_8px_var(--color-glow-physics)]"
        style={{
          opacity: showScrollTop() ? "1" : "0",
          transform: showScrollTop() ? "translateY(0)" : "translateY(8px)",
          "pointer-events": showScrollTop() ? "auto" : "none",
        }}
        title="Scroll to top"
      >
        ↑
      </button>
    </aside>
  );
};

// ── DefaultSection ────────────────────────────────────────────────────

interface DefaultSectionProps {
  sectionData: Record<string, unknown>;
  sectionName: string;
  searchFilter: string;
  originFacts: () => Record<string, string[]>;
  clearOtherOrigins: (name: string) => void;
  civicsAtMax: () => boolean;
  activeCivicCount: () => number;
  ethicsPoints: () => number;
}

/** Render a standard section with flat facts or subsections */
const DefaultSection: Component<DefaultSectionProps> = (props) => {
  const data = () => {
    const sd = props.sectionData;
    if (sd && typeof sd === "object" && "facts" in sd) {
      return (sd as unknown as SectionFacts).facts;
    }
    return sd;
  };

  return (
    <div class="space-y-0.5">
      <For each={Object.entries(data())}>
        {([key, value]) => {
          // Check if this is a subsection (has "facts" property)
          if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            "facts" in (value as Record<string, unknown>)
          ) {
            const subsection = value as SectionFacts;

            // Filter subsection entries by search
            const filteredEntries = () => {
              const filter = props.searchFilter;
              if (!filter) return Object.entries(subsection.facts);
              return Object.entries(subsection.facts).filter(([name]) =>
                matchesFilter(name, filter)
              );
            };

            // Hide subsection if no entries match
            return (
              <Show when={filteredEntries().length > 0}>
                <SectionAccordion
                  title={
                    key === "Civics" ? `${key} (${props.activeCivicCount()}/3)` :
                    key === "Ethics" ? `${key} (${props.ethicsPoints()}/3)` :
                    key
                  }
                  fontSize="11px"
                  forceOpen={!!props.searchFilter}
                >
                  <div class="space-y-0.5">
                    <For each={filteredEntries()}>
                      {([name, facts]) => {
                        // Origins: mutual exclusivity
                        if (key === "Origins") {
                          return (
                            <ToggleRow
                              displayName={name}
                              facts={facts as string[]}
                              onBeforeToggle={(newVal) => {
                                if (newVal) props.clearOtherOrigins(name);
                              }}
                            />
                          );
                        }

                        // Ethics: constraint enforcement
                        if (key === "Ethics") {
                          return (
                            <ToggleRow
                              displayName={name}
                              facts={facts as string[]}
                              onBeforeToggle={(newVal) => {
                                if (newVal) enforceEthicsConstraints(name);
                              }}
                            />
                          );
                        }

                        // Civics: max 3
                        if (key === "Civics") {
                          return (
                            <ToggleRow
                              displayName={name}
                              facts={facts as string[]}
                              disabled={props.civicsAtMax()}
                            />
                          );
                        }

                        // Default subsection row
                        return (
                          <FactRow displayName={name} facts={facts as string[]} />
                        );
                      }}
                    </For>
                  </div>
                </SectionAccordion>
              </Show>
            );
          }

          // Flat fact entry — filter by search
          return (
            <Show when={matchesFilter(key, props.searchFilter)}>
              <FactRow displayName={key} facts={value as string[]} />
            </Show>
          );
        }}
      </For>
    </div>
  );
};

/** Render a single fact row — either slider or toggle based on scalar metadata */
const FactRow: Component<{ displayName: string; facts: string[] }> = (
  props,
) => {
  const scalar = () => scalarMetadata[props.displayName];

  return (
    <Show
      when={scalar()}
      fallback={
        <ToggleRow displayName={props.displayName} facts={props.facts} />
      }
    >
      {(meta) => <SliderRow displayName={props.displayName} metadata={meta()} />}
    </Show>
  );
};

/** Render the Council section with its special subsections */
const CouncilSection: Component<{ sectionData: unknown; searchFilter: string }> = (props) => {
  const subsections = () =>
    Object.entries(props.sectionData as Record<string, unknown>);

  return (
    <div class="space-y-1">
      <For each={subsections()}>
        {([name, data]) => {
          const sectionFacts = data as SectionFacts;

          // Filter entries in this subsection
          const filteredEntries = () => {
            const filter = props.searchFilter;
            if (!filter) return Object.entries(sectionFacts.facts ?? {});
            return Object.entries(sectionFacts.facts ?? {}).filter(([displayName]) =>
              matchesFilter(displayName, filter)
            );
          };

          // Show if subsection name matches OR any child matches
          const shouldShow = () => {
            const filter = props.searchFilter;
            if (!filter) return true;
            if (matchesFilter(name, filter)) return true;
            return filteredEntries().length > 0;
          };

          return (
            <Show when={shouldShow()}>
              <SectionAccordion title={name} fontSize="11px" forceOpen={!!props.searchFilter}>
                <Show
                  when={name === "Expertise Traits"}
                  fallback={
                    <Show
                      when={name === "Council Positions"}
                      fallback={
                        <div class="space-y-0.5">
                          <For each={filteredEntries()}>
                            {([displayName, facts]) => (
                              <FactRow
                                displayName={displayName}
                                facts={facts as string[]}
                              />
                            )}
                          </For>
                        </div>
                      }
                    >
                      <CouncilPositions />
                    </Show>
                  }
                >
                  <ExpertiseGrid facts={sectionFacts.facts as Record<string, string[]>} />
                </Show>
              </SectionAccordion>
            </Show>
          );
        }}
      </For>
    </div>
  );
};

export default Sidebar;
