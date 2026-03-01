import { createEffect, For, Show, type Component } from "solid-js";
import {
  logEntries,
  panelState,
  setPanelState,
  clearLog,
  clearSaveSource,
  inProgressTechs,
  countInProgress,
  setCountInProgress,
  applyInProgressToggle,
} from "../../state/importState";

const LEVEL_STYLES: Record<string, { icon: string; color: string }> = {
  info: { icon: "\u2139", color: "text-physics" },
  success: { icon: "\u2713", color: "text-society" },
  warning: { icon: "\u26A0", color: "text-engineering" },
  error: { icon: "\u2717", color: "text-dangerous" },
};

const ImportLogPanel: Component = () => {
  let scrollRef: HTMLDivElement | undefined;

  // Auto-scroll to bottom when new entries are added
  createEffect(() => {
    // Access length to track this reactive dependency
    if (logEntries.length > 0 && scrollRef && panelState() === "expanded") {
      requestAnimationFrame(() => {
        scrollRef!.scrollTop = scrollRef!.scrollHeight;
      });
    }
  });

  const warningCount = () =>
    logEntries.filter(
      (e) => e.level === "warning" || e.level === "error",
    ).length;

  const handleClose = () => {
    setPanelState("hidden");
    clearLog();
    clearSaveSource();
  };

  return (
    <Show when={panelState() !== "hidden"}>
      {/* Minimized badge */}
      <Show when={panelState() === "minimized"}>
        <button
          class="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:border-physics/50 transition-all shadow-lg"
          onClick={() => setPanelState("expanded")}
        >
          <span class="font-display text-[10px] tracking-wider">
            Import Log
          </span>
          <Show when={warningCount() > 0}>
            <span class="bg-engineering/20 text-engineering px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
              {warningCount()}
            </span>
          </Show>
        </button>
      </Show>

      {/* Expanded panel */}
      <Show when={panelState() === "expanded"}>
        <div class="fixed bottom-4 right-4 z-40 w-80 max-h-96 bg-bg-secondary border border-border rounded-lg shadow-xl flex flex-col overflow-hidden"
          style={{ animation: "fade-in-up 0.2s ease-out" }}
        >
          {/* Header */}
          <div class="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-tertiary/50">
            <span
              class="font-display text-xs tracking-wider text-text-primary"
              style={{ "text-shadow": "0 0 8px rgba(59,130,246,0.3)" }}
            >
              Import Log
            </span>
            <div class="flex items-center gap-1">
              <button
                class="text-text-muted hover:text-text-secondary text-xs px-1"
                onClick={() => setPanelState("minimized")}
                title="Minimize"
              >
                _
              </button>
              <button
                class="text-text-muted hover:text-text-primary text-sm px-1"
                onClick={handleClose}
                title="Close"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Log entries */}
          <div
            ref={scrollRef}
            class="flex-1 overflow-y-auto px-3 py-2 space-y-1"
          >
            <For each={logEntries}>
              {(entry) => {
                const style = LEVEL_STYLES[entry.level] ?? LEVEL_STYLES.info;
                return (
                  <div class="flex items-start gap-1.5 text-xs leading-relaxed">
                    <span class={`${style.color} shrink-0 w-3 text-center`}>
                      {style.icon}
                    </span>
                    <span class="text-text-secondary">{entry.message}</span>
                  </div>
                );
              }}
            </For>
            <Show when={logEntries.length === 0}>
              <span class="text-xs text-text-muted">
                Waiting for import...
              </span>
            </Show>
          </div>

          {/* In-progress toggle */}
          <Show when={inProgressTechs().length > 0}>
            <div class="px-3 py-1.5 border-t border-border">
              <label class="flex items-center gap-1.5 text-[10px] text-text-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={countInProgress()}
                  onChange={(e) => {
                    setCountInProgress(e.currentTarget.checked);
                    applyInProgressToggle(e.currentTarget.checked);
                  }}
                  class="w-3 h-3 accent-rare"
                />
                Count in-progress research as completed
              </label>
            </div>
          </Show>

          {/* Footer */}
          <div class="flex items-center justify-between px-3 py-1.5 border-t border-border">
            <span class="text-[10px] text-text-muted">
              {logEntries.length} entries
            </span>
            <button
              class="text-[10px] text-text-muted hover:text-text-secondary"
              onClick={handleClose}
            >
              Clear & Close
            </button>
          </div>
        </div>
      </Show>
    </Show>
  );
};

export default ImportLogPanel;
