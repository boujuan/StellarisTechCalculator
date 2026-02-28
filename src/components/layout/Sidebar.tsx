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

// ── Helpers for subsection constraint logic ────────────────────────────

function getSubsectionFacts(topSection: string, subSection: string): Record<string, string[]> {
  const top = metadata[topSection] as Record<string, unknown> | undefined;
  if (!top) return {};
  const sub = top[subSection] as SectionFacts | undefined;
  return (sub?.facts ?? {}) as Record<string, string[]>;
}

/** Check if a display name matches a search filter */
function matchesFilter(name: string, filter: string): boolean {
  return !filter || name.toLowerCase().includes(filter);
}

// ── Sidebar component ──────────────────────────────────────────────────

const Sidebar: Component = () => {
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
      class="w-80 border-r border-border overflow-hidden shrink-0 flex flex-col relative"
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
          <input
            type="text"
            placeholder="Filter modifiers..."
            value={sidebarSearch()}
            onInput={(e) => setSidebarSearch(e.currentTarget.value)}
            class="w-full bg-bg-primary/50 border border-border rounded text-xs px-2 py-1.5 text-text-primary placeholder:text-text-muted/60 focus:border-physics/50 focus:outline-none transition-colors"
          />
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
                <SectionAccordion title={sectionName}>
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
              );
            }}
          </For>
        </div>
      </AccordionProvider>

      {/* Scroll to top button — always rendered, visibility toggled via opacity */}
      <button
        onClick={() => scrollRef?.scrollTo({ top: 0, behavior: "smooth" })}
        class="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-bg-tertiary border border-border text-text-muted hover:text-physics flex items-center justify-center shadow-lg transition-all duration-300 z-20 hover:shadow-[0_0_8px_var(--color-glow-physics)]"
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
                {/* Build section title with constraint info */}
                <SectionAccordion
                  title={
                    key === "Civics" ? `${key} (${props.activeCivicCount()}/3)` :
                    key === "Ethics" ? `${key} (${props.ethicsPoints()}/3)` :
                    key
                  }
                  fontSize="13px"
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

          // For special subsections (Expertise Traits, Council Positions),
          // show them if the subsection name matches OR any child matches
          const shouldShow = () => {
            const filter = props.searchFilter;
            if (!filter) return true;
            if (matchesFilter(name, filter)) return true;
            return filteredEntries().length > 0;
          };

          return (
            <Show when={shouldShow()}>
              <SectionAccordion title={name} fontSize="13px">
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
