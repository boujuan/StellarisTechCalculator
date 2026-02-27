/**
 * Sidebar — empire modifiers panel.
 * Assembles sections from atomic_facts_metadata.json structure.
 * Ported from EmpireModifiersPanel.gd build_sections()
 */
import { For, Show, type Component } from "solid-js";
import { metadata, scalarMetadata } from "../../state/dataStore";
import SectionAccordion from "../empire/SectionAccordion";
import ToggleRow from "../empire/ToggleRow";
import SliderRow from "../empire/SliderRow";
import ExpertiseGrid from "../empire/ExpertiseGrid";
import CouncilPositions from "../empire/CouncilPositions";
import type { SectionFacts } from "../../types/facts";

const Sidebar: Component = () => {
  const sectionNames = () => Object.keys(metadata);

  return (
    <aside class="w-80 bg-bg-secondary border-r border-border overflow-y-auto shrink-0 flex flex-col">
      <div class="p-3 border-b border-border">
        <h2 class="text-base font-semibold text-text-primary">
          Empire Modifiers
        </h2>
      </div>
      <div class="flex-1 overflow-y-auto">
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
                    />
                  }
                >
                  <CouncilSection
                    sectionData={
                      (section as { facts?: unknown }).facts ?? section
                    }
                  />
                </Show>
              </SectionAccordion>
            );
          }}
        </For>
      </div>
    </aside>
  );
};

/** Render a standard section with flat facts or subsections */
const DefaultSection: Component<{
  sectionData: Record<string, unknown>;
}> = (props) => {
  // Section can have "facts" key (flat) or nested subsections
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
            return (
              <SectionAccordion title={key} fontSize="13px">
                <div class="space-y-0.5">
                  <For each={Object.entries(subsection.facts)}>
                    {([name, facts]) => (
                      <FactRow displayName={name} facts={facts as string[]} />
                    )}
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
