import type { Component } from "solid-js";

const STORAGE_KEY = "stellaris_tc_tutorial_dismissed";

interface Props {
  onClose: () => void;
}

const TutorialOverlay: Component<Props> = (props) => {
  const handleDismiss = () => {
    props.onClose();
    localStorage.setItem(STORAGE_KEY, "true");
  };

  return (
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
            <strong class="text-text-primary">Order:</strong>{" "}
            Use the Order dropdown to sort by name, weight, hit %, tier, delta,
            base weight, category, or area.
          </p>
          <p>
            <strong class="text-text-primary">Tech View:</strong>{" "}
            Use the Tech View dropdown to filter visible technologies.
            Choose a preset (Current, Potential, Not Possible, All) or
            toggle individual filters (Researched, Previous, Permanent, Zero Weight).
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
  );
};

export default TutorialOverlay;
