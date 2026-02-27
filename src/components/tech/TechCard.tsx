import { Show, type Component } from "solid-js";
import { techState } from "../../state/techState";
import { activeTechnologies } from "../../state/techState";
import { toggleResearched, toggleDrawnLast } from "../../state/techState";
import { runUpdateCascade } from "../../engine/updateCascade";
import { formatPercent, formatWeight, formatDelta } from "../../utils/formatters";

interface Props {
  techId: string;
}

const AREA_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  physics: { bg: "bg-physics-dark", border: "border-physics/60", text: "text-physics" },
  society: { bg: "bg-society-dark", border: "border-society/60", text: "text-society" },
  engineering: { bg: "bg-engineering-dark", border: "border-engineering/60", text: "text-engineering" },
};

const BORDER_MOD_COLORS: Record<string, string> = {
  rare: "border-rare/80",
  dangerous: "border-dangerous/80",
};

const TechCard: Component<Props> = (props) => {
  const tech = () => activeTechnologies[props.techId];
  const state = () => techState[props.techId];

  const areaStyle = () => AREA_COLORS[tech().area] ?? AREA_COLORS.physics;
  const borderStyle = () =>
    BORDER_MOD_COLORS[tech().bordermod] ?? areaStyle().border;

  const isResearched = () => state().researched === 1;
  const isPermanent = () => state().permanent === 1;
  const isAvailable = () =>
    state().prereqs_met === 1 && !isResearched() && !isPermanent();
  const isDrawnLast = () => state().drawn_last === 1;

  const handleClick = () => {
    if (isPermanent()) return;
    toggleResearched(props.techId);
    runUpdateCascade();
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    if (isResearched() || isPermanent()) return;
    toggleDrawnLast(props.techId);
    runUpdateCascade();
  };

  const base = import.meta.env.BASE_URL;
  const iconUrl = () => `${base}media/tech_icons/${tech().icon}.avif`;
  const categoryIconUrl = () =>
    `${base}media/category_icons/category_${tech().category}.avif`;

  return (
    <div
      class={`rounded-lg border-2 p-3 cursor-pointer transition-all select-none
        ${borderStyle()}
        ${isResearched() ? "opacity-40" : ""}
        ${isPermanent() ? "opacity-25" : ""}
        ${isDrawnLast() ? "ring-2 ring-dangerous/60" : ""}
        ${isAvailable() ? "hover:brightness-110" : ""}
        ${areaStyle().bg}
      `}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      title={`${tech().real_name}\nTier ${tech().tier} | Cost: ${tech().cost}\nRight-click to toggle "drawn last"`}
    >
      {/* Header row: icon + name */}
      <div class="flex items-center gap-2 mb-1">
        <img
          src={iconUrl()}
          alt=""
          class="w-8 h-8 shrink-0"
          loading="lazy"
        />
        <div class="min-w-0 flex-1">
          <div class="text-sm font-semibold text-text-primary truncate">
            {tech().real_name}
          </div>
          <div class="flex items-center gap-1">
            <img
              src={categoryIconUrl()}
              alt=""
              class="w-3.5 h-3.5"
              loading="lazy"
            />
            <span class={`text-[10px] ${areaStyle().text}`}>
              T{tech().tier}
            </span>
            <Show when={tech().is_rare}>
              <span class="text-[10px] text-rare">Rare</span>
            </Show>
            <Show when={tech().is_dangerous}>
              <span class="text-[10px] text-dangerous">!</span>
            </Show>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <Show when={isAvailable()}>
        <div class="flex justify-between text-xs mt-1 pt-1 border-t border-white/10">
          <span class="text-text-muted" title="Base weight — determines how likely this tech is to appear relative to others">
            W: <span class="text-text-primary">{formatWeight(state().current_weight)}</span>
          </span>
          <span class="text-text-muted" title="Hit chance — Monte Carlo probability (%) this tech appears in your next research offer">
            <span class="text-text-primary font-semibold">
              {formatPercent(state().hit_chance)}
            </span>
          </span>
          <Show when={state().delta_weight !== 0}>
            <span
              class={
                state().delta_weight > 0
                  ? "text-society"
                  : "text-dangerous"
              }
              title="Delta — net weight change if you research this tech first (positive = unlocks valuable techs)"
            >
              {formatDelta(state().delta_weight)}
            </span>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default TechCard;
