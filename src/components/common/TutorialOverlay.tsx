import { createSignal, Show, type Component } from "solid-js";

const STORAGE_KEY = "stellaris_tc_tutorial_dismissed";

const TutorialOverlay: Component = () => {
  const wasDismissed = localStorage.getItem(STORAGE_KEY) === "true";
  const [showPanel, setShowPanel] = createSignal(!wasDismissed);

  const handleDismiss = () => {
    setShowPanel(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  return (
    <>
      {/* Full overlay panel */}
      <Show when={showPanel()}>
        <div
          class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
          onClick={handleDismiss}
        >
          <div
            class="bg-bg-secondary border-2 border-border rounded-lg p-6 max-w-lg mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg font-bold text-text-primary">
                How to Use the Stellaris Tech Calculator
              </h2>
              <button
                onClick={handleDismiss}
                class="text-text-muted hover:text-text-primary text-2xl leading-none px-1"
              >
                &times;
              </button>
            </div>

            <div class="space-y-3 text-sm text-text-secondary leading-relaxed">
              <p>
                <strong class="text-text-primary">Sidebar (left):</strong>{" "}
                Configure your empire — DLC, origins, ethics, civics, traditions, and
                other modifiers that affect tech weights.
              </p>
              <p>
                <strong class="text-text-primary">Tech Cards:</strong>{" "}
                Each card shows a technology with its weight, hit chance (%), and delta
                value. Cards are color-coded by area: blue for Physics, green for
                Society, orange for Engineering.
              </p>
              <p>
                <strong class="text-text-primary">Click a tech:</strong>{" "}
                Marks it as researched (dims it). Click again to undo.
              </p>
              <p>
                <strong class="text-text-primary">Right-click a tech:</strong>{" "}
                Toggles "drawn last" — penalizes techs that appeared but weren't
                picked, setting their weight to 0.
              </p>
              <p>
                <strong class="text-text-primary">Sorting:</strong>{" "}
                Use the dropdown to sort by name, weight, hit %, tier, or delta
                (opportunity value of researching this tech).
              </p>
              <p>
                <strong class="text-text-primary">Available Only:</strong>{" "}
                Toggle to show only techs currently in your research pool
                (prerequisites met, not researched, positive weight).
              </p>
              <p>
                <strong class="text-text-primary">Research Alternatives:</strong>{" "}
                Set your empire's number of research alternatives (default 3). More
                alternatives means higher hit chances for each individual tech.
              </p>
            </div>

            <button
              onClick={handleDismiss}
              class="mt-5 w-full py-2.5 bg-physics/20 text-physics rounded text-sm font-semibold hover:bg-physics/30 transition-colors border border-physics/30"
            >
              I Understand
            </button>
          </div>
        </div>
      </Show>

      {/* Persistent "?" help button */}
      <Show when={!showPanel()}>
        <button
          onClick={() => setShowPanel(true)}
          class="fixed bottom-4 left-4 z-40 w-10 h-10 rounded-full bg-bg-secondary border-2 border-physics/50 text-physics font-bold text-lg
                 hover:bg-physics/20 hover:border-physics transition-all shadow-lg flex items-center justify-center"
          title="Show tutorial / help"
        >
          ?
        </button>
      </Show>
    </>
  );
};

export default TutorialOverlay;
