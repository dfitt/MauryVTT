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
    id: "sword_slash",
    name: "Twin Swords",
    svgHtml: createSvg(
      "sword_slash",
      `<path d="M12 52 L52 12 M18 58 L58 18" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/>
       <path d="M48 12 L52 12 L52 16" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
       <path d="M54 18 L58 18 L58 22" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
       <path d="M8 46 L18 56 M16 44 L6 54" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
       <circle cx="10" cy="54" r="3" fill="#f59e0b"/>
       <circle cx="14" cy="50" r="3" fill="#f59e0b"/>`
    )
  },
  {
    id: "arrow_hit",
    name: "Piercing Arrow",
    svgHtml: createSvg(
      "arrow_hit",
      `<circle cx="36" cy="36" r="22" fill="#334155" stroke="#78350f" stroke-width="3"/>
       <circle cx="36" cy="36" r="14" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 2"/>
       <circle cx="36" cy="36" r="6" fill="#ef4444"/>
       <line x1="6" y1="6" x2="38" y2="38" stroke="#d97706" stroke-width="3.5" stroke-linecap="round"/>
       <polygon points="34,34 46,32 32,46" fill="#e2e8f0" stroke="#475569" stroke-width="1"/>
       <path d="M6 6 L14 6 L6 14 Z M10 10 L18 10 L10 18 Z" fill="#ef4444"/>`
    )
  },
  {
    id: "fireball_explosion",
    name: "Hellfire Blast",
    svgHtml: createSvg(
      "fireball_explosion",
      `<circle cx="32" cy="32" r="26" fill="#7f1d1d" opacity="0.4"/>
       <path d="M32 6 C42 16 56 26 50 44 C44 60 20 60 14 44 C8 26 22 16 32 6 Z" fill="#ef4444"/>
       <path d="M32 16 C38 24 46 32 42 46 C38 56 26 56 22 46 C18 32 26 24 32 16 Z" fill="#f97316"/>
       <path d="M32 26 C36 32 40 38 38 46 C36 52 28 52 26 46 C24 38 28 32 32 26 Z" fill="#fef08a"/>
       <circle cx="20" cy="18" r="3" fill="#1e293b"/>
       <circle cx="44" cy="16" r="2.5" fill="#1e293b"/>
       <circle cx="48" cy="28" r="2" fill="#f97316"/>`
    )
  },
  {
    id: "pink_sparkles",
    name: "Arcane Starburst",
    svgHtml: createSvg(
      "pink_sparkles",
      `<path d="M32 4 C32 24 40 32 60 32 C40 32 32 40 32 60 C32 40 24 32 4 32 C24 32 32 24 32 4 Z" fill="#ec4899" stroke="#f472b6" stroke-width="1.5"/>
       <path d="M32 16 C32 28 36 32 48 32 C36 32 32 36 32 48 C32 36 28 32 16 32 C28 32 32 28 32 16 Z" fill="#ffffff"/>
       <circle cx="16" cy="16" r="4" fill="#fbbf24"/>
       <circle cx="48" cy="48" r="4" fill="#fbbf24"/>
       <circle cx="48" cy="16" r="3" fill="#f472b6"/>`
    )
  },
  {
    id: "dagger_twirl",
    name: "Shadow Stiletto",
    svgHtml: createSvg(
      "dagger_twirl",
      `<path d="M54 10 L30 34 L26 30 L50 6 Z" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
       <path d="M54 10 L30 34 L32 32 L50 6 Z" fill="#94a3b8"/>
       <path d="M26 30 L18 38 L26 46 L34 38 Z" fill="#334155" stroke="#1e293b" stroke-width="1"/>
       <circle cx="26" cy="38" r="4" fill="#22c55e" stroke="#15803d" stroke-width="1"/>
       <path d="M18 38 L8 48 L16 56 L26 46 Z" fill="#475569"/>
       <circle cx="12" cy="52" r="3" fill="#f59e0b"/>`
    )
  },
  {
    id: "holy_healing",
    name: "Radiant Cross",
    svgHtml: createSvg(
      "holy_healing",
      `<circle cx="32" cy="32" r="26" fill="none" stroke="#facc15" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.7"/>
       <path d="M26 12 L38 12 L38 26 L52 26 L52 38 L38 38 L38 52 L26 52 L26 38 L12 38 L12 26 L26 26 Z" fill="#facc15" stroke="#ffffff" stroke-width="2"/>
       <path d="M18 44 C22 48 26 50 32 50 C38 50 42 48 46 44" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round"/>
       <circle cx="20" cy="20" r="3" fill="#ffffff"/>
       <circle cx="44" cy="20" r="3" fill="#ffffff"/>`
    )
  },
  {
    id: "turn_undead",
    name: "Turn Undead",
    svgHtml: createSvg(
      "turn_undead",
      `<circle cx="32" cy="32" r="28" fill="#1e1b4b" stroke="#a855f7" stroke-width="2"/>
       <path d="M26 52 L38 52 L38 38 L52 38 L52 26 L38 26 L38 12 L26 12 L26 26 L12 26 L12 38 L26 38 Z" fill="#3b0764" stroke="#c084fc" stroke-width="2"/>
       <path d="M24 36 C24 28 40 28 40 36 L40 44 L24 44 Z" fill="#cbd5e1"/>
       <circle cx="29" cy="36" r="2.5" fill="#581c87"/>
       <circle cx="35" cy="36" r="2.5" fill="#581c87"/>
       <line x1="28" y1="41" x2="36" y2="41" stroke="#581c87" stroke-width="1.5"/>`
    )
  },
  {
    id: "lute_music",
    name: "Bardic Lute",
    svgHtml: createSvg(
      "lute_music",
      `<circle cx="24" cy="42" r="16" fill="#78350f" stroke="#451a03" stroke-width="2"/>
       <circle cx="24" cy="42" r="5" fill="#1e293b" stroke="#f59e0b" stroke-width="1"/>
       <path d="M34 32 L52 14 L56 18 L38 36 Z" fill="#b45309" stroke="#451a03" stroke-width="1.5"/>
       <path d="M50 12 L56 18 L60 14 L54 8 Z" fill="#451a03"/>
       <line x1="20" y1="46" x2="54" y2="12" stroke="#fef08a" stroke-width="1"/>
       <line x1="24" y1="48" x2="56" y2="16" stroke="#fef08a" stroke-width="1"/>
       <circle cx="48" cy="40" r="3" fill="#facc15"/>
       <path d="M50 38 L50 30 L56 32" fill="none" stroke="#facc15" stroke-width="1.5"/>`
    )
  },
  {
    id: "lightning_strikes",
    name: "Skybolt",
    svgHtml: createSvg(
      "lightning_strikes",
      `<path d="M12 18 C12 10 24 8 32 12 C40 8 52 10 52 18 C56 22 54 30 46 30 L18 30 C10 30 8 22 12 18 Z" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
       <path d="M34 24 L22 42 L34 42 L26 60 L46 36 L34 36 Z" fill="#00f2fe" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
       <circle cx="22" cy="50" r="2" fill="#38bdf8"/>
       <circle cx="44" cy="46" r="2.5" fill="#ffffff"/>`
    )
  },
  {
    id: "toxic_cloud",
    name: "Miasma Cloud",
    svgHtml: createSvg(
      "toxic_cloud",
      `<path d="M14 36 C8 36 6 26 14 22 C16 12 30 10 36 16 C42 12 54 14 54 24 C60 28 58 38 50 38 L14 38 Z" fill="#15803d" stroke="#22c55e" stroke-width="2"/>
       <circle cx="26" cy="28" r="8" fill="#14532d"/>
       <circle cx="40" cy="28" r="6" fill="#14532d"/>
       <circle cx="32" cy="46" r="5" fill="#22c55e" opacity="0.8"/>
       <circle cx="20" cy="52" r="3.5" fill="#4ade80" opacity="0.8"/>
       <circle cx="46" cy="50" r="4" fill="#22c55e" opacity="0.8"/>
       <path d="M32 24 A4 4 0 0 1 32 32 A4 4 0 0 1 32 24" fill="#86efac"/>`
    )
  },
  {
    id: "arcane_shield",
    name: "Runic Barrier",
    svgHtml: createSvg(
      "arcane_shield",
      `<polygon points="32,6 58,22 58,52 32,60 6,52 6,22" fill="#1e293b" stroke="#38bdf8" stroke-width="2.5"/>
       <polygon points="32,14 50,26 50,48 32,54 14,48 14,26" fill="none" stroke="#818cf8" stroke-width="1.5" stroke-dasharray="4 3"/>
       <circle cx="32" cy="34" r="10" fill="none" stroke="#c084fc" stroke-width="2"/>
       <circle cx="32" cy="34" r="4" fill="#38bdf8"/>
       <path d="M32 24 L32 18 M32 44 L32 50 M22 34 L16 34 M42 34 L48 34" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>`
    )
  },
  {
    id: "ice_spike",
    name: "Glacial Spike",
    svgHtml: createSvg(
      "ice_spike",
      `<polygon points="32,6 44,56 20,56" fill="#0c4a6e" stroke="#38bdf8" stroke-width="2"/>
       <polygon points="32,6 32,56 20,56" fill="#0284c7"/>
       <polygon points="32,6 36,56 32,56" fill="#e0f2fe"/>
       <polygon points="16,26 24,56 10,56" fill="#0369a1" stroke="#7dd3fc" stroke-width="1.5"/>
       <polygon points="48,26 54,56 40,56" fill="#0c4a6e" stroke="#7dd3fc" stroke-width="1.5"/>
       <circle cx="28" cy="18" r="2" fill="#ffffff"/>
       <circle cx="42" cy="32" r="2" fill="#ffffff"/>`
    )
  },
  {
    id: "eldritch_blast",
    name: "Eldritch Eye",
    svgHtml: createSvg(
      "eldritch_blast",
      `<circle cx="32" cy="32" r="26" fill="#2e1065" stroke="#a855f7" stroke-width="2"/>
       <path d="M8 32 C18 16 46 16 56 32 C46 48 18 48 8 32 Z" fill="#3b0764" stroke="#c084fc" stroke-width="2"/>
       <circle cx="32" cy="32" r="12" fill="#22c55e" stroke="#ffffff" stroke-width="1.5"/>
       <ellipse cx="32" cy="32" rx="4" ry="10" fill="#0f172a"/>
       <circle cx="36" cy="28" r="2" fill="#ffffff"/>`
    )
  },
  {
    id: "necrotic_drain",
    name: "Necro Skull",
    svgHtml: createSvg(
      "necrotic_drain",
      `<path d="M16 28 C16 16 24 8 32 8 C40 8 48 16 48 28 C48 38 44 44 38 48 L38 58 L26 58 L26 48 C20 44 16 38 16 28 Z" fill="#1e293b" stroke="#ef4444" stroke-width="2"/>
       <circle cx="26" cy="30" r="5" fill="#7f1d1d"/>
       <circle cx="26" cy="30" r="2" fill="#ef4444"/>
       <circle cx="38" cy="30" r="5" fill="#7f1d1d"/>
       <circle cx="38" cy="30" r="2" fill="#ef4444"/>
       <path d="M30 42 L34 42 L32 38 Z" fill="#ef4444"/>
       <line x1="28" y1="50" x2="28" y2="56" stroke="#ef4444" stroke-width="2"/>
       <line x1="32" y1="50" x2="32" y2="56" stroke="#ef4444" stroke-width="2"/>
       <line x1="36" y1="50" x2="36" y2="56" stroke="#ef4444" stroke-width="2"/>`
    )
  },
  {
    id: "counterspell",
    name: "Spell Sever",
    svgHtml: createSvg(
      "counterspell",
      `<circle cx="32" cy="32" r="24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="6 4"/>
       <polygon points="32,14 46,42 18,42" fill="none" stroke="#818cf8" stroke-width="2"/>
       <circle cx="32" cy="32" r="8" fill="#1e293b" stroke="#c084fc" stroke-width="1.5"/>
       <line x1="10" y1="10" x2="54" y2="54" stroke="#ef4444" stroke-width="6" stroke-linecap="round"/>
       <line x1="10" y1="10" x2="54" y2="54" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>`
    )
  },
  {
    id: "nature_entangle",
    name: "Thorny Vines",
    svgHtml: createSvg(
      "nature_entangle",
      `<path d="M12 52 C22 40 16 24 32 18 C48 12 44 32 54 12" fill="none" stroke="#15803d" stroke-width="4" stroke-linecap="round"/>
       <path d="M16 48 C30 48 36 34 26 24 C16 14 42 16 50 38" fill="none" stroke="#854d0e" stroke-width="3" stroke-linecap="round"/>
       <path d="M32 18 C30 12 36 10 38 14 C40 18 34 20 32 18 Z" fill="#4ade80"/>
       <path d="M26 24 C20 22 22 16 26 16 C30 16 30 22 26 24 Z" fill="#facc15"/>
       <path d="M50 38 C56 40 58 46 54 48 C50 50 46 44 50 38 Z" fill="#4ade80"/>
       <circle cx="24" cy="40" r="2" fill="#ef4444"/>
       <circle cx="42" cy="22" r="2" fill="#ef4444"/>`
    )
  },
  {
    id: "psychic_blast",
    name: "Psionic Mind",
    svgHtml: createSvg(
      "psychic_blast",
      `<path d="M32 12 C20 12 12 22 12 34 C12 44 20 52 30 52 L30 42 C24 42 20 38 20 34 C20 28 24 22 32 22 C40 22 44 28 44 34 C44 38 40 42 34 42 L34 52 C44 52 52 44 52 34 C52 22 44 12 32 12 Z" fill="#3b0764" stroke="#c084fc" stroke-width="2"/>
       <circle cx="32" cy="34" r="6" fill="#a855f7" stroke="#ffffff" stroke-width="1.5"/>
       <path d="M6 34 A26 26 0 0 1 12 18" fill="none" stroke="#818cf8" stroke-width="2" stroke-linecap="round"/>
       <path d="M58 34 A26 26 0 0 0 52 18" fill="none" stroke="#818cf8" stroke-width="2" stroke-linecap="round"/>`
    )
  },
  {
    id: "divine_smite",
    name: "Holy Warhammer",
    svgHtml: createSvg(
      "divine_smite",
      `<polygon points="16,14 48,14 44,30 20,30" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
       <polygon points="12,16 16,14 20,30 12,28" fill="#f59e0b"/>
       <polygon points="52,16 48,14 44,30 52,28" fill="#f59e0b"/>
       <line x1="32" y1="30" x2="32" y2="58" stroke="#78350f" stroke-width="6" stroke-linecap="round"/>
       <line x1="32" y1="30" x2="32" y2="58" stroke="#b45309" stroke-width="3" stroke-linecap="round"/>
       <circle cx="32" cy="58" r="4" fill="#f59e0b"/>
       <path d="M32 6 L30 10 L34 10 Z" fill="#ffffff"/>
       <circle cx="32" cy="22" r="4" fill="#ffffff" opacity="0.8"/>`
    )
  },
  {
    id: "barbarian_rage",
    name: "Berserker Axe",
    svgHtml: createSvg(
      "barbarian_rage",
      `<path d="M20 18 C8 16 6 36 20 38 L26 32 L26 24 Z" fill="#cbd5e1" stroke="#991b1b" stroke-width="2"/>
       <path d="M44 18 C56 16 58 36 44 38 L38 32 L38 24 Z" fill="#cbd5e1" stroke="#991b1b" stroke-width="2"/>
       <line x1="32" y1="8" x2="32" y2="58" stroke="#451a03" stroke-width="5" stroke-linecap="round"/>
       <line x1="32" y1="8" x2="32" y2="58" stroke="#78350f" stroke-width="2.5" stroke-linecap="round"/>
       <circle cx="32" cy="28" r="5" fill="#b45309" stroke="#f59e0b" stroke-width="1"/>
       <path d="M12 26 L16 28 M52 26 L48 28" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>`
    )
  },
  {
    id: "wild_magic",
    name: "Chaos Vortex",
    svgHtml: createSvg(
      "wild_magic",
      `<circle cx="32" cy="32" r="26" fill="none" stroke="#ec4899" stroke-width="2.5" stroke-dasharray="8 4"/>
       <circle cx="32" cy="32" r="18" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="6 4"/>
       <polygon points="32,16 46,40 18,40" fill="none" stroke="#facc15" stroke-width="2"/>
       <circle cx="32" cy="32" r="6" fill="#a855f7"/>
       <circle cx="32" cy="32" r="3" fill="#ffffff"/>
       <circle cx="44" cy="18" r="3" fill="#4ade80"/>
       <circle cx="16" cy="44" r="3" fill="#f97316"/>`
    )
  },
  {
    id: "time_warp",
    name: "Chronal Glass",
    svgHtml: createSvg(
      "time_warp",
      `<polygon points="16,8 48,8 36,32 48,56 16,56 28,32" fill="#1e293b" stroke="#d97706" stroke-width="2.5"/>
       <polygon points="20,12 44,12 34,30 20,12" fill="#00f2fe" opacity="0.8"/>
       <polygon points="24,52 40,52 34,36 24,52" fill="#00f2fe" opacity="0.4"/>
       <line x1="12" y1="6" x2="52" y2="6" stroke="#b45309" stroke-width="4" stroke-linecap="round"/>
       <line x1="12" y1="58" x2="52" y2="58" stroke="#b45309" stroke-width="4" stroke-linecap="round"/>
       <circle cx="32" cy="32" r="3" fill="#ffffff"/>`
    )
  },
  {
    id: "guidance_bless",
    name: "Divine Dove",
    svgHtml: createSvg(
      "guidance_bless",
      `<circle cx="32" cy="22" r="14" fill="none" stroke="#facc15" stroke-width="2" opacity="0.8"/>
       <path d="M32 18 C28 26 16 24 10 34 C20 34 26 30 32 36 C38 30 44 34 54 34 C48 24 36 26 32 18 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
       <path d="M32 36 L26 50 L32 46 L38 50 Z" fill="#cbd5e1"/>
       <circle cx="32" cy="24" r="2" fill="#f59e0b"/>
       <line x1="32" y1="6" x2="32" y2="10" stroke="#facc15" stroke-width="2"/>`
    )
  },
  {
    id: "hunters_mark",
    name: "Hunter's Mark",
    svgHtml: createSvg(
      "hunters_mark",
      `<circle cx="32" cy="32" r="24" fill="#1e293b" stroke="#991b1b" stroke-width="2"/>
       <path d="M14 32 C20 20 44 20 50 32 C44 44 20 44 14 32 Z" fill="#78350f" stroke="#f59e0b" stroke-width="1.5"/>
       <circle cx="32" cy="32" r="8" fill="#ef4444"/>
       <ellipse cx="32" cy="32" rx="2.5" ry="7" fill="#0f172a"/>
       <circle cx="32" cy="32" r="20" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="8 4"/>
       <line x1="32" y1="6" x2="32" y2="14" stroke="#ef4444" stroke-width="2"/>
       <line x1="32" y1="50" x2="32" y2="58" stroke="#ef4444" stroke-width="2"/>
       <line x1="6" y1="32" x2="14" y2="32" stroke="#ef4444" stroke-width="2"/>
       <line x1="50" y1="32" x2="58" y2="32" stroke="#ef4444" stroke-width="2"/>`
    )
  },
  {
    id: "spore_cloud",
    name: "Underdark Spore",
    svgHtml: createSvg(
      "spore_cloud",
      `<path d="M12 36 C12 20 20 12 32 12 C44 12 52 20 52 36 Z" fill="#581c87" stroke="#a855f7" stroke-width="2"/>
       <path d="M26 36 L28 54 L36 54 L38 36 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
       <circle cx="24" cy="26" r="3.5" fill="#4ade80"/>
       <circle cx="38" cy="24" r="4" fill="#4ade80"/>
       <circle cx="32" cy="18" r="2.5" fill="#facc15"/>
       <circle cx="16" cy="44" r="2.5" fill="#c084fc" opacity="0.8"/>
       <circle cx="48" cy="46" r="3" fill="#4ade80" opacity="0.8"/>
       <circle cx="32" cy="48" r="2" fill="#facc15" opacity="0.8"/>`
    )
  },
  {
    id: "witch_hex",
    name: "Witch Cauldron",
    svgHtml: createSvg(
      "witch_hex",
      `<path d="M14 30 L50 30 L46 54 C46 58 40 60 32 60 C24 60 18 58 18 54 Z" fill="#1e293b" stroke="#475569" stroke-width="2"/>
       <ellipse cx="32" cy="30" rx="18" ry="5" fill="#3b0764" stroke="#a855f7" stroke-width="2"/>
       <ellipse cx="32" cy="30" rx="14" ry="3" fill="#22c55e"/>
       <path d="M24 26 C22 18 28 14 26 8" fill="none" stroke="#c084fc" stroke-width="2" stroke-linecap="round"/>
       <path d="M40 26 C42 18 36 14 38 8" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round"/>
       <circle cx="32" cy="28" r="2" fill="#facc15"/>
       <line x1="10" y1="30" x2="14" y2="30" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
       <line x1="50" y1="30" x2="54" y2="30" stroke="#475569" stroke-width="3" stroke-linecap="round"/>`
    )
  },
  {
    id: "lantern_light",
    name: "Briar Lantern",
    svgHtml: createSvg(
      "lantern_light",
      `<polygon points="22,18 42,18 46,52 18,52" fill="#1e293b" stroke="#b45309" stroke-width="2"/>
       <polygon points="24,22 40,22 42,48 22,48" fill="#451a03" stroke="#f59e0b" stroke-width="1"/>
       <path d="M32 26 C36 32 38 38 32 44 C26 38 28 32 32 26 Z" fill="#facc15"/>
       <circle cx="32" cy="36" r="4" fill="#ffffff"/>
       <polygon points="18,18 46,18 32,8" fill="#78350f" stroke="#b45309" stroke-width="1.5"/>
       <circle cx="32" cy="6" r="3" fill="none" stroke="#b45309" stroke-width="2"/>
       <line x1="18" y1="52" x2="46" y2="52" stroke="#b45309" stroke-width="3"/>`
    )
  },
  {
    id: "spider_web",
    name: "Silken Web",
    svgHtml: createSvg(
      "spider_web",
      `<path d="M6 6 L58 58 M6 58 L58 6 M32 4 L32 60 M4 32 L60 32" stroke="#475569" stroke-width="1" opacity="0.6"/>
       <polygon points="32,14 45,19 50,32 45,45 32,50 19,45 14,32 19,19" fill="none" stroke="#94a3b8" stroke-width="1.2"/>
       <polygon points="32,22 39,25 42,32 39,39 32,42 25,39 22,32 25,25" fill="none" stroke="#cbd5e1" stroke-width="1.2"/>
       <circle cx="38" cy="38" r="5" fill="#0f172a" stroke="#ef4444" stroke-width="1"/>
       <circle cx="43" cy="43" r="3" fill="#0f172a"/>
       <line x1="34" y1="36" x2="30" y2="34" stroke="#ef4444" stroke-width="1.5"/>
       <line x1="40" y1="34" x2="44" y2="30" stroke="#ef4444" stroke-width="1.5"/>`
    )
  },
  {
    id: "potion_elixir",
    name: "Crimson Elixir",
    svgHtml: createSvg(
      "potion_elixir",
      `<path d="M26 16 L38 16 L38 24 L48 44 C52 52 46 58 32 58 C18 58 12 52 16 44 L26 24 Z" fill="#1e293b" stroke="#94a3b8" stroke-width="2"/>
       <path d="M20 38 L44 38 L46 46 C48 52 44 56 32 56 C20 56 16 52 18 46 Z" fill="#ef4444"/>
       <ellipse cx="32" cy="38" rx="12" ry="3" fill="#f87171"/>
       <polygon points="28,8 36,8 34,16 30,16" fill="#b45309" stroke="#78350f" stroke-width="1"/>
       <circle cx="28" cy="46" r="2.5" fill="#ffffff" opacity="0.8"/>
       <circle cx="36" cy="48" r="1.5" fill="#ffffff" opacity="0.8"/>`
    )
  },
  {
    id: "beast_shape",
    name: "Feral Wolf",
    svgHtml: createSvg(
      "beast_shape",
      `<path d="M12 54 L18 36 L12 24 L24 28 L32 14 L40 28 L52 24 L46 36 L52 54 Z" fill="#1e293b" stroke="#64748b" stroke-width="2" stroke-linejoin="round"/>
       <polygon points="32,36 26,48 38,48" fill="#334155"/>
       <circle cx="24" cy="34" r="3" fill="#facc15"/>
       <circle cx="40" cy="34" r="3" fill="#facc15"/>
       <polygon points="30,44 34,44 32,48" fill="#0f172a"/>
       <path d="M26 50 L28 54 M38 50 L36 54" stroke="#ef4444" stroke-width="2"/>`
    )
  },
  {
    id: "fairy_glamour",
    name: "Faerie Wings",
    svgHtml: createSvg(
      "fairy_glamour",
      `<path d="M32 32 C16 10 4 20 12 36 C18 44 28 38 32 32 Z" fill="#f472b6" opacity="0.7" stroke="#ec4899" stroke-width="1.5"/>
       <path d="M32 32 C48 10 60 20 52 36 C46 44 36 38 32 32 Z" fill="#38bdf8" opacity="0.7" stroke="#00f2fe" stroke-width="1.5"/>
       <path d="M32 32 C18 44 14 56 24 54 C30 52 32 44 32 32 Z" fill="#c084fc" opacity="0.7"/>
       <path d="M32 32 C46 44 50 56 40 54 C34 52 32 44 32 32 Z" fill="#f472b6" opacity="0.7"/>
       <circle cx="32" cy="32" r="4" fill="#ffffff" stroke="#facc15" stroke-width="1"/>
       <circle cx="20" cy="24" r="2" fill="#ffffff"/>
       <circle cx="44" cy="24" r="2" fill="#ffffff"/>`
    )
  },
  {
    id: "campfire_rest",
    name: "Campfire Rest",
    svgHtml: createSvg(
      "campfire_rest",
      `<line x1="14" y1="52" x2="50" y2="44" stroke="#451a03" stroke-width="6" stroke-linecap="round"/>
       <line x1="14" y1="44" x2="50" y2="52" stroke="#78350f" stroke-width="6" stroke-linecap="round"/>
       <path d="M32 16 C40 26 44 36 38 46 C32 54 20 50 24 40 C28 30 32 24 32 16 Z" fill="#ef4444"/>
       <path d="M32 24 C36 32 38 38 34 44 C30 48 24 46 26 40 C28 34 32 28 32 24 Z" fill="#f97316"/>
       <path d="M32 32 C34 36 36 40 34 44 C32 46 28 46 28 42 C28 38 32 34 32 32 Z" fill="#facc15"/>
       <circle cx="22" cy="22" r="2" fill="#f97316"/>
       <circle cx="42" cy="26" r="2.5" fill="#facc15"/>`
    )
  },
  {
    id: "breggle_charge",
    name: "Breggle Crest",
    svgHtml: createSvg(
      "breggle_charge",
      `<path d="M12 24 C12 12 24 8 30 16 C28 22 20 22 18 28 Z" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
       <path d="M52 24 C52 12 40 8 34 16 C36 22 44 22 46 28 Z" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
       <polygon points="32,18 44,36 32,56 20,36" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
       <circle cx="26" cy="34" r="3.5" fill="#d97706"/>
       <circle cx="38" cy="34" r="3.5" fill="#d97706"/>
       <line x1="28" y1="46" x2="36" y2="46" stroke="#94a3b8" stroke-width="2"/>`
    )
  },
  {
    id: "grimalkin_shadow",
    name: "Grimalkin Shadow",
    svgHtml: createSvg(
      "grimalkin_shadow",
      `<polygon points="12,14 24,28 14,38" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
       <polygon points="52,14 40,28 50,38" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
       <ellipse cx="32" cy="38" rx="18" ry="16" fill="#0f172a" stroke="#334155" stroke-width="2"/>
       <ellipse cx="24" cy="36" rx="4" ry="6" fill="#4ade80"/>
       <ellipse cx="24" cy="36" rx="1.5" ry="6" fill="#0f172a"/>
       <ellipse cx="40" cy="36" rx="4" ry="6" fill="#4ade80"/>
       <ellipse cx="40" cy="36" rx="1.5" ry="6" fill="#0f172a"/>
       <path d="M28 46 L32 48 L36 46" fill="none" stroke="#4ade80" stroke-width="1.5"/>
       <line x1="8" y1="42" x2="18" y2="44" stroke="#64748b" stroke-width="1"/>
       <line x1="56" y1="42" x2="46" y2="44" stroke="#64748b" stroke-width="1"/>`
    )
  },
  {
    id: "woodland_shrine",
    name: "Shrine Bell",
    svgHtml: createSvg(
      "woodland_shrine",
      `<path d="M16 54 L16 26 C16 16 48 16 48 26 L48 54" fill="none" stroke="#475569" stroke-width="6"/>
       <path d="M16 54 L16 26 C16 16 48 16 48 26 L48 54" fill="none" stroke="#16a34a" stroke-width="2" stroke-dasharray="8 6"/>
       <path d="M24 36 L40 36 L42 48 L22 48 Z" fill="#b45309" stroke="#f59e0b" stroke-width="1.5"/>
       <circle cx="32" cy="50" r="3" fill="#f59e0b"/>
       <line x1="32" y1="20" x2="32" y2="36" stroke="#78350f" stroke-width="2.5"/>`
    )
  },
  {
    id: "drune_wicker",
    name: "Wicker Owl",
    svgHtml: createSvg(
      "drune_wicker",
      `<circle cx="32" cy="34" r="22" fill="#78350f" stroke="#451a03" stroke-width="2"/>
       <circle cx="32" cy="34" r="18" fill="none" stroke="#b45309" stroke-width="1.5" stroke-dasharray="4 3"/>
       <circle cx="24" cy="30" r="6" fill="#1e293b" stroke="#ef4444" stroke-width="2"/>
       <circle cx="40" cy="30" r="6" fill="#1e293b" stroke="#ef4444" stroke-width="2"/>
       <circle cx="24" cy="30" r="2" fill="#ef4444"/>
       <circle cx="40" cy="30" r="2" fill="#ef4444"/>
       <polygon points="32,36 28,46 36,46" fill="#451a03"/>
       <polygon points="20,12 26,20 16,22" fill="#78350f"/>
       <polygon points="44,12 38,20 48,22" fill="#78350f"/>`
    )
  },
  {
    id: "thrown_boomerang",
    name: "Ironwood Blade",
    svgHtml: createSvg(
      "thrown_boomerang",
      `<path d="M12 52 C16 32 32 16 52 12 C44 24 36 36 32 44 C24 48 18 50 12 52 Z" fill="#78350f" stroke="#b45309" stroke-width="2"/>
       <path d="M18 46 C22 32 32 22 46 18" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4 4"/>
       <path d="M8 36 C12 24 24 12 36 8" fill="none" stroke="#38bdf8" stroke-width="1.5" opacity="0.6"/>`
    )
  },
  {
    id: "rapier_flurry",
    name: "Fencing Rapier",
    svgHtml: createSvg(
      "rapier_flurry",
      `<line x1="14" y1="50" x2="56" y2="8" stroke="#e2e8f0" stroke-width="2.5" stroke-linecap="round"/>
       <path d="M12 48 C20 40 24 44 16 52 Z" fill="#f59e0b" stroke="#b45309" stroke-width="1.5"/>
       <line x1="8" y1="56" x2="16" y2="48" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
       <line x1="30" y1="20" x2="52" y2="16" stroke="#94a3b8" stroke-width="1" opacity="0.7"/>
       <line x1="36" y1="32" x2="56" y2="24" stroke="#94a3b8" stroke-width="1" opacity="0.7"/>`
    )
  },
  {
    id: "camelot_crown",
    name: "Royal Diadem",
    svgHtml: createSvg(
      "camelot_crown",
      `<polygon points="12,46 12,24 24,36 32,16 40,36 52,24 52,46" fill="#f59e0b" stroke="#b45309" stroke-width="2" stroke-linejoin="round"/>
       <rect x="12" y="46" width="40" height="6" fill="#78350f" stroke="#b45309" stroke-width="1"/>
       <circle cx="32" cy="38" r="3.5" fill="#ef4444"/>
       <circle cx="20" cy="40" r="2.5" fill="#3b82f6"/>
       <circle cx="44" cy="40" r="2.5" fill="#3b82f6"/>
       <circle cx="32" cy="16" r="2.5" fill="#ffffff"/>`
    )
  },
  {
    id: "merlins_magic",
    name: "Archmage Staff",
    svgHtml: createSvg(
      "merlins_magic",
      `<polygon points="18,52 38,52 28,14" fill="#312e81" stroke="#4338ca" stroke-width="2"/>
       <ellipse cx="28" cy="52" rx="14" ry="4" fill="#1e1b4b" stroke="#4338ca" stroke-width="1.5"/>
       <line x1="46" y1="56" x2="46" y2="16" stroke="#78350f" stroke-width="4" stroke-linecap="round"/>
       <circle cx="46" cy="14" r="6" fill="#38bdf8" stroke="#00f2fe" stroke-width="1.5"/>
       <circle cx="46" cy="14" r="2" fill="#ffffff"/>
       <path d="M26 30 L30 30 M28 28 L28 32" stroke="#facc15" stroke-width="1.5"/>`
    )
  },
  {
    id: "camelot_castle",
    name: "Keep Towers",
    svgHtml: createSvg(
      "camelot_castle",
      `<rect x="14" y="24" width="14" height="32" fill="#475569" stroke="#1e293b" stroke-width="2"/>
       <rect x="36" y="24" width="14" height="32" fill="#475569" stroke="#1e293b" stroke-width="2"/>
       <rect x="24" y="34" width="16" height="22" fill="#334155" stroke="#1e293b" stroke-width="2"/>
       <polygon points="12,24 14,14 28,14 30,24" fill="#64748b" stroke="#1e293b" stroke-width="1.5"/>
       <polygon points="34,24 36,14 50,14 52,24" fill="#64748b" stroke="#1e293b" stroke-width="1.5"/>
       <path d="M28 56 L28 44 C28 40 36 40 36 44 L36 56 Z" fill="#0f172a"/>
       <polygon points="21,14 21,6 28,9" fill="#ef4444"/>
       <polygon points="43,14 43,6 50,9" fill="#ef4444"/>`
    )
  },
  {
    id: "meteor_storm",
    name: "Meteor Strike",
    svgHtml: createSvg(
      "meteor_storm",
      `<path d="M52 12 L36 28 L28 20 L44 4 Z" fill="#f97316" opacity="0.7"/>
       <line x1="56" y1="8" x2="28" y2="36" stroke="#ef4444" stroke-width="6" stroke-linecap="round"/>
       <circle cx="24" cy="40" r="12" fill="#7f1d1d" stroke="#ef4444" stroke-width="2"/>
       <circle cx="22" cy="42" r="6" fill="#f97316"/>
       <circle cx="20" cy="44" r="3" fill="#fef08a"/>
       <circle cx="44" cy="20" r="2" fill="#f97316"/>
       <circle cx="36" cy="12" r="1.5" fill="#f97316"/>`
    )
  },
  {
    id: "whirlwind_storm",
    name: "Cyclone Funnel",
    svgHtml: createSvg(
      "whirlwind_storm",
      `<path d="M12 16 C24 20 40 20 52 16 C46 28 38 38 36 54 C28 38 20 28 12 16 Z" fill="#475569" stroke="#64748b" stroke-width="2"/>
       <path d="M18 24 C28 28 36 28 46 24" fill="none" stroke="#94a3b8" stroke-width="2"/>
       <path d="M22 36 C28 38 36 38 42 36" fill="none" stroke="#94a3b8" stroke-width="2"/>
       <polyline points="28,20 34,30 30,34 38,46" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
       <circle cx="24" cy="48" r="2" fill="#38bdf8"/>`
    )
  },
  {
    id: "black_hole_implosion",
    name: "Void Singularity",
    svgHtml: createSvg(
      "black_hole_implosion",
      `<ellipse cx="32" cy="32" rx="26" ry="14" fill="none" stroke="#a855f7" stroke-width="3" transform="rotate(-20 32 32)"/>
       <ellipse cx="32" cy="32" rx="20" ry="10" fill="none" stroke="#ec4899" stroke-width="2" transform="rotate(-20 32 32)"/>
       <circle cx="32" cy="32" r="12" fill="#090c13" stroke="#c084fc" stroke-width="2"/>
       <circle cx="32" cy="32" r="8" fill="#000000"/>
       <circle cx="14" cy="26" r="2" fill="#ffffff"/>
       <circle cx="50" cy="38" r="2" fill="#ffffff"/>`
    )
  },
  {
    id: "prismatic_spray",
    name: "Prismatic Beams",
    svgHtml: createSvg(
      "prismatic_spray",
      `<polygon points="12,52 20,12 26,52" fill="#ef4444" opacity="0.8"/>
       <polygon points="20,52 32,8 36,52" fill="#facc15" opacity="0.8"/>
       <polygon points="30,52 44,12 46,52" fill="#22c55e" opacity="0.8"/>
       <polygon points="38,52 54,20 52,52" fill="#38bdf8" opacity="0.8"/>
       <circle cx="32" cy="52" r="6" fill="#ffffff" stroke="#a855f7" stroke-width="2"/>`
    )
  },
  {
    id: "solar_flare",
    name: "Solar Flare",
    svgHtml: createSvg(
      "solar_flare",
      `<circle cx="32" cy="32" r="16" fill="#f59e0b" stroke="#fef08a" stroke-width="2"/>
       <circle cx="32" cy="32" r="10" fill="#fef08a"/>
       <path d="M32 4 L32 10 M32 54 L32 60 M4 32 L10 32 M54 32 L60 32 M12 12 L16 16 M48 48 L52 52 M12 52 L16 48 M48 16 L52 12" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>
       <path d="M44 20 C50 14 54 24 48 28" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>`
    )
  },
  {
    id: "magma_eruption",
    name: "Volcanic Eruption",
    svgHtml: createSvg(
      "magma_eruption",
      `<polygon points="8,56 32,20 56,56" fill="#1e293b" stroke="#475569" stroke-width="2"/>
       <path d="M26 20 C28 10 36 10 38 20" fill="#ef4444"/>
       <path d="M32 20 L30 36 L34 44 L32 56" fill="none" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>
       <circle cx="24" cy="12" r="3" fill="#f97316"/>
       <circle cx="40" cy="14" r="2.5" fill="#ef4444"/>
       <circle cx="32" cy="6" r="2" fill="#facc15"/>`
    )
  },
  {
    id: "radiation_pulse",
    name: "Hazard Pulse",
    svgHtml: createSvg(
      "radiation_pulse",
      `<circle cx="32" cy="32" r="24" fill="#14532d" stroke="#22c55e" stroke-width="2"/>
       <path d="M32 32 L32 12 A20 20 0 0 1 49 22 Z" fill="#4ade80"/>
       <path d="M32 32 L49 42 A20 20 0 0 1 32 52 Z" fill="#4ade80"/>
       <path d="M32 32 L15 42 A20 20 0 0 1 15 22 Z" fill="#4ade80"/>
       <circle cx="32" cy="32" r="6" fill="#14532d" stroke="#22c55e" stroke-width="2"/>
       <circle cx="32" cy="32" r="3" fill="#4ade80"/>`
    )
  },
  {
    id: "diamond_burst",
    name: "Forcecage Prism",
    svgHtml: createSvg(
      "diamond_burst",
      `<polygon points="32,6 56,32 32,58 8,32" fill="#0c4a6e" stroke="#38bdf8" stroke-width="2"/>
       <polygon points="32,6 44,32 32,58 20,32" fill="#0284c7" opacity="0.8"/>
       <polygon points="32,16 56,32 32,48 8,32" fill="#7dd3fc" opacity="0.6"/>
       <line x1="8" y1="32" x2="56" y2="32" stroke="#ffffff" stroke-width="1.5"/>
       <line x1="32" y1="6" x2="32" y2="58" stroke="#ffffff" stroke-width="1.5"/>
       <circle cx="32" cy="32" r="3" fill="#ffffff"/>`
    )
  },
  {
    id: "plasma_cannon",
    name: "Arcane Cannon",
    svgHtml: createSvg(
      "plasma_cannon",
      `<path d="M12 28 L44 24 L56 32 L44 40 L12 36 Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
       <circle cx="20" cy="32" r="8" fill="#0f172a" stroke="#00f2fe" stroke-width="1.5"/>
       <line x1="24" y1="32" x2="52" y2="32" stroke="#00f2fe" stroke-width="3" stroke-linecap="round"/>
       <circle cx="56" cy="32" r="4" fill="#ffffff" stroke="#00f2fe" stroke-width="1"/>`
    )
  },
  {
    id: "soul_harvest",
    name: "Soul Harvest",
    svgHtml: createSvg(
      "soul_harvest",
      `<path d="M48 10 C32 10 20 22 18 38 L14 56 L22 46 C26 50 36 50 42 42 C48 34 52 22 48 10 Z" fill="#0f172a" stroke="#2dd4bf" stroke-width="2"/>
       <path d="M26 36 C28 28 36 22 44 20" fill="none" stroke="#5eead4" stroke-width="1.5" stroke-dasharray="3 3"/>
       <circle cx="34" cy="34" r="5" fill="#14b8a6" opacity="0.8"/>
       <circle cx="34" cy="34" r="2" fill="#ffffff"/>`
    )
  },
  {
    id: "void_collapse",
    name: "Void Rift",
    svgHtml: createSvg(
      "void_collapse",
      `<circle cx="32" cy="32" r="26" fill="#000000" stroke="#a855f7" stroke-width="2"/>
       <path d="M32 6 C45 18 45 46 32 58 C19 46 19 18 32 6 Z" fill="#3b0764" opacity="0.7"/>
       <circle cx="32" cy="32" r="14" fill="none" stroke="#c084fc" stroke-width="1.5" stroke-dasharray="4 2"/>
       <circle cx="32" cy="32" r="6" fill="#000000" stroke="#ec4899" stroke-width="2"/>`
    )
  },
  {
    id: "pyroclastic_storm",
    name: "Pyroclasm",
    svgHtml: createSvg(
      "pyroclastic_storm",
      `<polygon points="16,48 24,16 48,22 52,50 30,58" fill="#1e293b" stroke="#f97316" stroke-width="2"/>
       <path d="M24 16 L34 36 L52 50 M48 22 L34 36 L20 52" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
       <circle cx="34" cy="36" r="4" fill="#fbbf24"/>
       <circle cx="26" cy="24" r="2" fill="#f97316"/>`
    )
  },
  {
    id: "fae_symphony",
    name: "Fae Symphony",
    svgHtml: createSvg(
      "fae_symphony",
      `<path d="M18 52 C18 20 36 12 48 16 C48 36 36 52 18 52 Z" fill="#1e293b" stroke="#facc15" stroke-width="2"/>
       <line x1="26" y1="44" x2="38" y2="18" stroke="#4ade80" stroke-width="1.5"/>
       <line x1="32" y1="46" x2="42" y2="20" stroke="#f472b6" stroke-width="1.5"/>
       <line x1="38" y1="48" x2="46" y2="22" stroke="#38bdf8" stroke-width="1.5"/>
       <circle cx="26" cy="44" r="2.5" fill="#facc15"/>
       <circle cx="38" cy="48" r="2.5" fill="#facc15"/>`
    )
  },
  {
    id: "frost_nova",
    name: "Frost Nova",
    svgHtml: createSvg(
      "frost_nova",
      `<polygon points="32,4 38,26 60,32 38,38 32,60 26,38 4,32 26,26" fill="#1e3a8a" stroke="#38bdf8" stroke-width="2"/>
       <polygon points="32,16 36,28 48,32 36,36 32,48 28,36 16,32 28,28" fill="#7dd3fc" opacity="0.8"/>
       <circle cx="32" cy="32" r="5" fill="#ffffff"/>`
    )
  },
  {
    id: "alchemical_blaze",
    name: "Acid Blaze",
    svgHtml: createSvg(
      "alchemical_blaze",
      `<path d="M26 14 L38 14 L38 24 L52 48 C56 54 50 60 32 60 C14 60 8 54 12 48 L26 24 Z" fill="#1e293b" stroke="#84cc16" stroke-width="2"/>
       <path d="M16 42 C24 38 40 46 48 42 L50 48 C52 52 46 56 32 56 C18 56 12 52 14 48 Z" fill="#84cc16"/>
       <circle cx="28" cy="46" r="4" fill="#eab308"/>
       <circle cx="38" cy="50" r="3" fill="#a3e635"/>
       <circle cx="34" cy="34" r="2.5" fill="#84cc16"/>`
    )
  },
  {
    id: "celestial_judgment",
    name: "Starfall Blade",
    svgHtml: createSvg(
      "celestial_judgment",
      `<circle cx="32" cy="32" r="24" fill="#312e81" stroke="#f59e0b" stroke-width="2"/>
       <path d="M32 6 L38 24 L56 32 L38 40 L32 58 L26 40 L8 32 L26 24 Z" fill="#facc15" stroke="#ffffff" stroke-width="1.5"/>
       <circle cx="32" cy="32" r="6" fill="#ffffff"/>`
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
export const COIN_ICON_SVG: string = ROLL_ICONS.find(i => i.id === "coin_flip")?.svgHtml || ALL_ROLL_ICONS[0];
