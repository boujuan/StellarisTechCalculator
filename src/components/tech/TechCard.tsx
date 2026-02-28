import { Show, createSignal, onMount, type Component } from "solid-js";
import { techState } from "../../state/techState";
import { activeTechnologies } from "../../state/techState";
import { toggleResearched, toggleDrawnLast } from "../../state/techState";
import { runUpdateCascade } from "../../engine/updateCascade";
import { formatPercent, formatWeight, formatDelta } from "../../utils/formatters";

interface Props {
  techId: string;
  index: number;
}

const base = import.meta.env.BASE_URL;

const AREA_BORDER: Record<string, string> = {
  physics: "border-physics/60",
  society: "border-society/60",
  engineering: "border-engineering/60",
};

const AREA_TEXT: Record<string, string> = {
  physics: "text-physics",
  society: "text-society",
  engineering: "text-engineering",
};

const AREA_GLOW: Record<string, string> = {
  physics: "0 0 15px 3px var(--color-glow-physics)",
  society: "0 0 15px 3px var(--color-glow-society)",
  engineering: "0 0 15px 3px var(--color-glow-engineering)",
};

const AREA_BAR_COLOR: Record<string, string> = {
  physics: "var(--color-physics)",
  society: "var(--color-society)",
  engineering: "var(--color-engineering)",
};

const BORDER_MOD: Record<string, string> = {
  rare: "border-rare/80",
  dangerous: "border-dangerous/80",
};

const GLOW_MOD: Record<string, string> = {
  rare: "0 0 15px 3px var(--color-glow-rare)",
  dangerous: "0 0 15px 3px var(--color-glow-dangerous)",
};

// Subtle persistent glow for available techs (dimmer than hover glow)
const AREA_SUBTLE_GLOW: Record<string, string> = {
  physics: "0 0 8px 1px var(--color-glow-physics)",
  society: "0 0 8px 1px var(--color-glow-society)",
  engineering: "0 0 8px 1px var(--color-glow-engineering)",
};

const TechCard: Component<Props> = (props) => {
  const tech = () => activeTechnologies[props.techId];
  const state = () => techState[props.techId];

  const area = () => tech().area;
  const bordermod = () => tech().bordermod;

  const borderClass = () => BORDER_MOD[bordermod()] ?? AREA_BORDER[area()] ?? AREA_BORDER.physics;
  const textClass = () => AREA_TEXT[area()] ?? AREA_TEXT.physics;
  const hoverGlow = () => GLOW_MOD[bordermod()] ?? AREA_GLOW[area()] ?? AREA_GLOW.physics;
  const subtleGlow = () => AREA_SUBTLE_GLOW[area()] ?? AREA_SUBTLE_GLOW.physics;
  const barColor = () => AREA_BAR_COLOR[area()] ?? AREA_BAR_COLOR.physics;

  // Background: rare/dangerous override the area background
  const bgArea = () => {
    if (bordermod() === "rare") return "rare";
    if (bordermod() === "dangerous") return "dangerous";
    return area();
  };
  const bgUrl = () => `${base}media/backgrounds/tech_bg_${bgArea()}.avif`;

  const isResearched = () => state().researched === 1;
  const isPermanent = () => state().permanent === 1;
  const isAvailable = () =>
    state().prereqs_met === 1 && !isResearched() && !isPermanent();
  const isDrawnLast = () => state().drawn_last === 1;

  const hitChance = () => state().hit_chance;

  // Track entrance animation — only plays once on mount, never re-triggers
  const [hasEntered, setHasEntered] = createSignal(false);
  const delay = () => Math.min(props.index, 20) * 20;

  onMount(() => {
    setTimeout(() => setHasEntered(true), delay() + 350);
  });

  // Animation: entrance once → drawn-last pulse → none
  const animationStyle = () => {
    if (isDrawnLast()) return "subtle-pulse 2s ease-in-out infinite";
    if (!hasEntered()) return `fade-in-up 0.3s ease-out ${delay()}ms both`;
    return "none";
  };

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

  const iconUrl = () => `${base}media/tech_icons/${tech().icon}.avif`;
  const categoryIconUrl = () =>
    `${base}media/category_icons/category_${tech().category}.avif`;

  return (
    <div
      class={`relative overflow-hidden rounded-lg border-2 cursor-pointer select-none transition-all duration-200
        ${borderClass()}
        ${isPermanent() ? "opacity-25" : ""}
      `}
      style={{
        "background-image": `url(${bgUrl()})`,
        "background-size": "cover",
        "background-position": "center",
        "animation": animationStyle(),
        // Researched: desaturate + dim smoothly
        "filter": isResearched() ? "grayscale(0.6) brightness(0.5)" : "none",
        // Available: full opacity + subtle glow. Unavailable (not researched): dimmed
        "opacity": isResearched() ? "0.55" : (!isAvailable() && !isPermanent()) ? "0.6" : undefined,
        "box-shadow": isAvailable() ? subtleGlow() : undefined,
      }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={(e) => {
        if (isAvailable()) {
          e.currentTarget.style.boxShadow = hoverGlow();
        }
      }}
      onMouseLeave={(e) => {
        if (isAvailable()) {
          e.currentTarget.style.boxShadow = subtleGlow();
        } else {
          e.currentTarget.style.boxShadow = "";
        }
      }}
      title={`${tech().real_name}\nTier ${tech().tier} | Cost: ${tech().cost}\nRight-click to toggle "drawn last"`}
    >
      {/* Dark overlay for text readability */}
      <div class="absolute inset-0 bg-black/45" />

      {/* Researched overlay badge */}
      <Show when={isResearched()}>
        <div class="absolute inset-0 z-20 flex items-center justify-center">
          <span class="text-[11px] font-bold font-display tracking-wider text-dangerous bg-black/60 px-2 py-0.5 rounded-full border border-dangerous/30 uppercase">
            Researched
          </span>
        </div>
      </Show>

      {/* Card content */}
      <div class="relative z-10 p-3">
        {/* Header row: icon + name */}
        <div class="flex items-center gap-2 mb-1">
          <img
            src={iconUrl()}
            alt=""
            class="w-10 h-10 shrink-0 drop-shadow-lg"
            loading="lazy"
          />
          <div class="min-w-0 flex-1">
            <div class="text-[15px] font-semibold text-text-primary truncate font-display">
              {tech().real_name}
            </div>
            <div class="flex items-center gap-1.5">
              <img
                src={categoryIconUrl()}
                alt=""
                class="w-5 h-5"
                loading="lazy"
              />
              {/* Tier pill badge */}
              <span class={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-black/30 ${textClass()}`}>
                T{tech().tier}
              </span>
              <Show when={tech().is_rare}>
                <span class="text-[11px] font-semibold text-rare">Rare</span>
              </Show>
              <Show when={tech().is_dangerous}>
                <span class="text-[11px] font-bold text-dangerous">!</span>
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

      {/* Hit chance bar at bottom */}
      <Show when={isAvailable() && hitChance() > 0}>
        <div
          class="absolute bottom-0 left-0 h-[3px] transition-all duration-500 ease-out"
          style={{
            width: `${Math.min(hitChance(), 100)}%`,
            "background-color": barColor(),
            "box-shadow": `0 0 6px ${barColor()}`,
          }}
        />
      </Show>
    </div>
  );
};

export default TechCard;
