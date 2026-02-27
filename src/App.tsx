import { createSignal, onMount, Show, type Component } from "solid-js";
import type { Area } from "./types/tech";
import Sidebar from "./components/layout/Sidebar";
import Toolbar from "./components/layout/Toolbar";
import TechGrid from "./components/tech/TechGrid";
import ResearchSummary from "./components/tech/ResearchSummary";
import SaveLoadDialog from "./components/common/SaveLoadDialog";
import TutorialOverlay from "./components/common/TutorialOverlay";
import { initMonteCarloWorker, dispatchHitChances } from "./workers/workerApi";
import { setHitChanceDispatcher, runUpdateCascade } from "./engine/updateCascade";

type AreaFilter = "all" | Area;

const App: Component = () => {
  const [search, setSearch] = createSignal("");
  const [areaFilter, setAreaFilter] = createSignal<AreaFilter>("all");
  const [sortBy, setSortBy] = createSignal("hit_chance");
  const [showSaveLoad, setShowSaveLoad] = createSignal(false);
  const [availableOnly, setAvailableOnly] = createSignal(false);

  onMount(() => {
    // Initialize Web Worker
    initMonteCarloWorker();

    // Register the hit chance dispatcher with the update cascade
    setHitChanceDispatcher((weightMap, draws) => {
      dispatchHitChances(weightMap, draws);
    });

    // Run initial update cascade
    runUpdateCascade();
  });

  return (
    <div class="flex h-screen overflow-hidden">
      <Sidebar />

      <main class="flex-1 flex flex-col overflow-hidden">
        <Toolbar
          search={search()}
          onSearchChange={setSearch}
          areaFilter={areaFilter()}
          onAreaFilterChange={setAreaFilter}
          sortBy={sortBy()}
          onSortChange={setSortBy}
          onSaveLoad={() => setShowSaveLoad(true)}
          availableOnly={availableOnly()}
          onAvailableOnlyChange={setAvailableOnly}
        />

        {/* Summary bar */}
        <div class="px-4 py-2 bg-bg-secondary/50 border-b border-border">
          <ResearchSummary />
        </div>

        {/* Tech grid */}
        <div class="flex-1 overflow-y-auto p-4">
          <TechGrid
            search={search()}
            areaFilter={areaFilter()}
            sortBy={sortBy()}
            availableOnly={availableOnly()}
          />
        </div>
      </main>

      {/* Save/Load modal */}
      <Show when={showSaveLoad()}>
        <SaveLoadDialog onClose={() => setShowSaveLoad(false)} />
      </Show>

      {/* Tutorial overlay */}
      <TutorialOverlay />
    </div>
  );
};

export default App;
