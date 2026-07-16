export interface RollIconSvg {
  id: string;
  name: string;
  svgHtml: string;
}

function createSvg(id: string, inner: string): string {
  return `<svg viewBox="0 0 64 64" width="1.25em" height="1.25em" data-vtt-icon="${id}" style="vertical-align:-0.25em; display:inline-block; filter:drop-shadow(0 1px 3px rgba(0,0,0,0.85));">${inner}</svg>`;
}

export const ROLL_ICONS: RollIconSvg[] = [
  {
    id: "d20_dice",
    name: "d20 Die",
    svgHtml: createSvg(
      "d20_dice",
      `<polygon points="32,4 60,22 48,58 16,58 4,22" fill="#1e293b" stroke="#38bdf8" stroke-width="2" stroke-linejoin="round"/>
       <polygon points="32,4 48,58 16,58" fill="none" stroke="#38bdf8" stroke-width="1.2" opacity="0.6"/>
       <line x1="32" y1="4" x2="16" y2="58" stroke="#38bdf8" stroke-width="1.2" opacity="0.6"/>
       <line x1="32" y1="4" x2="48" y2="58" stroke="#38bdf8" stroke-width="1.2" opacity="0.6"/>
       <line x1="4" y1="22" x2="60" y2="22" stroke="#38bdf8" stroke-width="1.2" opacity="0.6"/>
       <text x="32" y="41" text-anchor="middle" fill="#e0f2fe" font-family="'JetBrains Mono', monospace" font-size="20" font-weight="800">20</text>`
    )
  },
  {
    id: "coin_flip",
    name: "Dragon Coin",
    svgHtml: createSvg(
      "coin_flip",
      `<circle cx="32" cy="32" r="24" fill="#b45309" stroke="#78350f" stroke-width="2"/>
       <circle cx="32" cy="32" r="20" fill="#f59e0b" stroke="#fef08a" stroke-width="1.5" stroke-dasharray="4 2"/>
       <polygon points="32,18 38,38 26,38" fill="#78350f"/>
       <circle cx="32" cy="32" r="4" fill="#fef08a"/>`
    )
  }
];

export const ALL_ROLL_ICONS: string[] = ROLL_ICONS.filter(i => i.id !== "coin_flip").map(i => i.svgHtml);
export let COIN_ICON_SVG: string = ROLL_ICONS.find(i => i.id === "coin_flip")?.svgHtml || ALL_ROLL_ICONS[0];

export function registerCustomRollIcon(id: string, name: string, svgHtml: string): void {
  const existingIndex = ROLL_ICONS.findIndex(icon => icon.id === id);
  if (existingIndex !== -1) {
    const oldSvgHtml = ROLL_ICONS[existingIndex].svgHtml;
    ROLL_ICONS[existingIndex] = { id, name, svgHtml };
    if (id === "coin_flip") {
      COIN_ICON_SVG = svgHtml;
    } else if (id !== "d20_dice") {
      const idx = ALL_ROLL_ICONS.indexOf(oldSvgHtml);
      if (idx !== -1) {
        ALL_ROLL_ICONS[idx] = svgHtml;
      } else if (!ALL_ROLL_ICONS.includes(svgHtml)) {
        ALL_ROLL_ICONS.push(svgHtml);
      }
    }
  } else {
    ROLL_ICONS.push({ id, name, svgHtml });
    if (id === "coin_flip") {
      COIN_ICON_SVG = svgHtml;
    } else if (id !== "d20_dice" && !ALL_ROLL_ICONS.includes(svgHtml)) {
      ALL_ROLL_ICONS.push(svgHtml);
    }
  }
}
