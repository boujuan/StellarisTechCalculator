/**
 * Sidebar — empire modifiers panel.
 * Assembles sections from atomic_facts_metadata.json structure.
 * Includes: DLC select-all, origins exclusivity, ethics constraints, civics max-3,
 * expand/collapse all, scroll-to-top.
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

  return (
    <aside class="w-80 bg-bg-secondary border-r border-border overflow-hidden shrink-0 flex flex-col relative">
      {/* Header with expand/collapse buttons */}
      <div class="p-3 border-b border-border">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-text-primary">
            Empire Modifiers
          </h2>
          <div class="flex gap-1">
            <button
              onClick={expandAll}
              class="text-xs text-text-muted hover:text-text-primary px-1.5 py-0.5 border border-border rounded transition-colors"
              title="Expand all sections"
            >
              Expand
            </button>
            <button
              onClick={collapseAll}
              class="text-xs text-text-muted hover:text-text-primary px-1.5 py-0.5 border border-border rounded transition-colors"
              title="Collapse all sections"
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <AccordionProvider value={accordionCmd}>
        <div
          class="flex-1 overflow-y-auto"
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

      {/* Scroll to top button */}
      <Show when={showScrollTop()}>
        <button
          onClick={() => scrollRef?.scrollTo({ top: 0, behavior: "smooth" })}
          class="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-bg-tertiary border border-border text-text-muted hover:text-text-primary flex items-center justify-center shadow-lg transition-colors z-10"
          title="Scroll to top"
        >
          ↑
        </button>
      </Show>
    </aside>
  );
};

// ── DefaultSection ────────────────────────────────────────────────────

interface DefaultSectionProps {
  sectionData: Record<string, unknown>;
  sectionName: string;
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

            // Build section title with constraint info
            const title = () => {
              if (key === "Civics") return `${key} (${props.activeCivicCount()}/3)`;
              if (key === "Ethics") return `${key} (${props.ethicsPoints()}/3)`;
              return key;
            };

            return (
              <SectionAccordion title={title()} fontSize="13px">
                <div class="space-y-0.5">
                  <For each={Object.entries(subsection.facts)}>
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
            );
          }

          // Flat fact entry
          return (
            <FactRow displayName={key} facts={value as string[]} />
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
const CouncilSection: Component<{ sectionData: unknown }> = (props) => {
  const subsections = () =>
    Object.entries(props.sectionData as Record<string, unknown>);

  return (
    <div class="space-y-1">
      <For each={subsections()}>
        {([name, data]) => {
          const sectionFacts = data as SectionFacts;
          return (
            <SectionAccordion title={name} fontSize="13px">
              <Show
                when={name === "Expertise Traits"}
                fallback={
                  <Show
                    when={name === "Council Positions"}
                    fallback={
                      <div class="space-y-0.5">
                        <For each={Object.entries(sectionFacts.facts ?? {})}>
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
          );
        }}
      </For>
    </div>
  );
};

export default Sidebar;
