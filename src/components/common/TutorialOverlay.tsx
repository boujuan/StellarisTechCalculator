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
              <h2 class="text-lg font-bold text-text-primary font-display" style={{ "text-shadow": "0 0 10px rgba(59,130,246,0.3)" }}>
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
              <p>
                <strong class="text-text-primary">Precision:</strong>{" "}
                Hit chances are estimated via Monte Carlo simulation (up to 20,000
                iterations). Values may fluctuate by approximately ±1% between
                recalculations — this is expected statistical variance, not a bug.
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

      {/* Persistent bottom-left bar: ? button + GitHub + version */}
      <Show when={!showPanel()}>
        <div class="fixed bottom-4 left-4 z-40 flex items-center gap-2">
          <button
            onClick={() => setShowPanel(true)}
            class="w-10 h-10 rounded-full bg-bg-secondary border-2 border-physics/50 text-physics font-bold text-lg
                   hover:bg-physics/20 hover:border-physics transition-all shadow-lg flex items-center justify-center"
            title="Show tutorial / help"
          >
            ?
          </button>
          <a
            href="https://github.com/boujuan/StellarisTechCalculator"
            target="_blank"
            rel="noopener noreferrer"
            class="w-10 h-10 rounded-full bg-bg-secondary border-2 border-text-muted/30 text-text-muted
                   hover:bg-text-muted/10 hover:border-text-secondary hover:text-text-secondary transition-all shadow-lg flex items-center justify-center"
            title="View source on GitHub"
          >
            <svg viewBox="0 0 16 16" class="w-5 h-5 fill-current" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
          <span class="text-[10px] text-text-muted/60 leading-tight select-none">
            v{__APP_VERSION__}<br />
            <span class="text-text-muted/40">boujuan</span>
          </span>
        </div>
      </Show>
    </>
  );
};

export default TutorialOverlay;
