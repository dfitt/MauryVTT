export interface ParticleConfig {
  count: number;
  colors: string[];
  speedRange: [number, number]; // px per second
  sizeRangePx: [number, number];
  gravity: number; // px per second^2 (negative for rising, positive for falling)
  shape: "circle" | "sparkle" | "ember" | "splinter" | "note";
  spreadAngleRange?: [number, number]; // radians from 0 to 2*PI
  lifeMs: number;
}

export interface VttEffectDefinition {
  id: string;
  durationMs: number;
  renderSvg: () => string;
  particles?: ParticleConfig;
}

export function getEffectIdForIcon(icon?: string): string | null {
  if (!icon) return null;
  const attrMatch = icon.match(/data-vtt-icon=["']([^"']+)["']/);
  if (attrMatch && attrMatch[1]) {
    const id = attrMatch[1];
    if (id !== "d20_dice" && id !== "coin_flip") {
      return id;
    }
    return null;
  }
  if (icon.includes("⚔️") || icon.includes("sword_slash")) return "sword_slash";
  if (icon.includes("🏹") || icon.includes("arrow_hit")) return "arrow_hit";
  if (icon.includes("🔥") || icon.includes("fireball_explosion")) return "fireball_explosion";
  if (icon.includes("✨") || icon.includes("💖") || icon.includes("pink_sparkles")) return "pink_sparkles";
  if (icon.includes("🗡️") || icon.includes("dagger_twirl")) return "dagger_twirl";
  if (icon.includes("☀️") || icon.includes("✝️") || icon.includes("holy_healing")) return "holy_healing";
  if (icon.includes("📿") || icon.includes("🧿") || icon.includes("⚰️") || icon.includes("turn_undead")) return "turn_undead";
  if (icon.includes("🪕") || icon.includes("circle cx=\"26\" cy=\"42\" r=\"16\" fill=\"#92400e\"") || icon.includes("🎸") || icon.includes("🪈") || icon.includes("lute_music")) return "lute_music";
  if (icon.includes("⚡") || icon.includes("lightning_strikes")) return "lightning_strikes";
  if (icon.includes("☁️") || icon.includes("☣️") || icon.includes("🧪") || icon.includes("toxic_cloud")) return "toxic_cloud";
  if (icon.includes("🛡️") || icon.includes("arcane_shield")) return "arcane_shield";
  if (icon.includes("❄️") || icon.includes("🧊") || icon.includes("ice_spike")) return "ice_spike";
  if (icon.includes("👁️") || icon.includes("eldritch_blast")) return "eldritch_blast";
  if (icon.includes("💀") || icon.includes("necrotic_drain")) return "necrotic_drain";
  if (icon.includes("🚫") || icon.includes("counterspell")) return "counterspell";
  if (icon.includes("🌿") || icon.includes("nature_entangle")) return "nature_entangle";
  if (icon.includes("🧠") || icon.includes("psychic_blast")) return "psychic_blast";
  if (icon.includes("💫") || icon.includes("💥") || icon.includes("divine_smite")) return "divine_smite";
  if (icon.includes("💢") || icon.includes("💪") || icon.includes("barbarian_rage")) return "barbarian_rage";
  if (icon.includes("🌀") || icon.includes("wild_magic")) return "wild_magic";
  if (icon.includes("⏳") || icon.includes("time_warp")) return "time_warp";
  if (icon.includes("🕊️") || icon.includes("🙏") || icon.includes("guidance_bless")) return "guidance_bless";
  if (icon.includes("🎯") || icon.includes("hunters_mark")) return "hunters_mark";
  if (icon.includes("🍄") || icon.includes("spore_cloud")) return "spore_cloud";
  if (icon.includes("🔮") || icon.includes("witch_hex")) return "witch_hex";
  if (icon.includes("🏮") || icon.includes("🪔") || icon.includes("lantern_light")) return "lantern_light";
  if (icon.includes("🕸️") || icon.includes("🕷️") || icon.includes("spider_web")) return "spider_web";
  if (icon.includes("🍷") || icon.includes("🏺") || icon.includes("potion_elixir")) return "potion_elixir";
  if (icon.includes("🐺") || icon.includes("beast_shape")) return "beast_shape";
  if (icon.includes("🦋") || icon.includes("🧚") || icon.includes("fairy_glamour")) return "fairy_glamour";
  if (icon.includes("🪵") || icon.includes("campfire_rest")) return "campfire_rest";
  if (icon.includes("🐐") || icon.includes("breggle_charge")) return "breggle_charge";
  if (icon.includes("🐈") || icon.includes("🐾") || icon.includes("grimalkin_shadow")) return "grimalkin_shadow";
  if (icon.includes("🔔") || icon.includes("woodland_shrine")) return "woodland_shrine";
  if (icon.includes("🦉") || icon.includes("drune_wicker")) return "drune_wicker";
  if (icon.includes("🪃") || icon.includes("thrown_boomerang")) return "thrown_boomerang";
  if (icon.includes("🤺") || icon.includes("rapier_flurry")) return "rapier_flurry";
  if (icon.includes("👑") || icon.includes("camelot_crown")) return "camelot_crown";
  if (icon.includes("🧙") || icon.includes("merlins_magic")) return "merlins_magic";
  if (icon.includes("🏰") || icon.includes("camelot_castle")) return "camelot_castle";
  if (icon.includes("☄️") || icon.includes("meteor_storm")) return "meteor_storm";
  if (icon.includes("🌪️") || icon.includes("whirlwind_storm")) return "whirlwind_storm";
  if (icon.includes("🌌") || icon.includes("black_hole_implosion")) return "black_hole_implosion";
  if (icon.includes("🎇") || icon.includes("prismatic_spray")) return "prismatic_spray";
  if (icon.includes("🌟") || icon.includes("solar_flare")) return "solar_flare";
  if (icon.includes("🌋") || icon.includes("magma_eruption")) return "magma_eruption";
  if (icon.includes("☢️") || icon.includes("radiation_pulse")) return "radiation_pulse";
  if (icon.includes("💠") || icon.includes("diamond_burst")) return "diamond_burst";
  if (icon.includes("plasma_cannon")) return "plasma_cannon";
  if (icon.includes("soul_harvest")) return "soul_harvest";
  if (icon.includes("void_collapse")) return "void_collapse";
  if (icon.includes("pyroclastic_storm")) return "pyroclastic_storm";
  if (icon.includes("fae_symphony")) return "fae_symphony";
  if (icon.includes("frost_nova")) return "frost_nova";
  if (icon.includes("alchemical_blaze")) return "alchemical_blaze";
  if (icon.includes("celestial_judgment")) return "celestial_judgment";
  return null;
}

export const EFFECT_REGISTRY: Record<string, VttEffectDefinition> = {
  sword_slash: {
    id: "sword_slash",
    durationMs: 850,
    renderSvg: () => `
      <style>
        @keyframes vttSwordSlash1 {
          0% { transform: translate(140%, -140%) rotate(-45deg) scale(0.9); opacity: 0; }
          25% { transform: translate(-10%, 10%) rotate(-135deg) scale(1.3); opacity: 1; }
          45% { transform: translate(-150%, 150%) rotate(-180deg) scale(1.0); opacity: 0; }
          100% { transform: translate(-150%, 150%) opacity: 0; }
        }
        @keyframes vttSwordSlash2 {
          0% { transform: translate(-140%, -140%) rotate(45deg) scale(0.9); opacity: 0; }
          45% { transform: translate(-140%, -140%) rotate(45deg) scale(0.9); opacity: 0; }
          70% { transform: translate(10%, 10%) rotate(135deg) scale(1.3); opacity: 1; }
          90% { transform: translate(150%, 150%) rotate(180deg) scale(1.0); opacity: 0; }
          100% { transform: translate(150%, 150%) opacity: 0; }
        }
        @keyframes vttSlashCutLine1 {
          0% { transform: scaleX(0) rotate(-45deg); opacity: 0; }
          28% { transform: scaleX(1.6) rotate(-45deg); opacity: 1; }
          50% { transform: scaleX(2) rotate(-45deg); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes vttSlashCutLine2 {
          0% { transform: scaleX(0) rotate(45deg); opacity: 0; }
          48% { transform: scaleX(0) rotate(45deg); opacity: 0; }
          72% { transform: scaleX(1.6) rotate(45deg); opacity: 1; }
          95% { transform: scaleX(2) rotate(45deg); opacity: 0; }
          100% { opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Metallic Steel Slash Line 1 (Right to Left) -->
        <div style="position: absolute; width: 180%; height: 2px; background: linear-gradient(90deg, transparent, #ffffff, #cbd5e1, transparent); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.7); animation: vttSlashCutLine1 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Metallic Steel Slash Line 2 (Left to Right) -->
        <div style="position: absolute; width: 180%; height: 2px; background: linear-gradient(90deg, transparent, #ffffff, #94a3b8, transparent); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.7); animation: vttSlashCutLine2 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Authentic Metal Longsword 1 (Right to Left) -->
        <svg viewBox="0 0 64 64" width="84" height="84" style="position: absolute; animation: vttSwordSlash1 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.75));">
          <!-- Blade -->
          <path d="M54 10 L14 50 L10 54 L6 50 L10 46 L50 6 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.2" />
          <!-- Fuller -->
          <path d="M46 18 L18 46" stroke="#64748b" stroke-width="1.5" />
          <!-- Crossguard -->
          <path d="M14 50 L6 58 L10 62 L18 54 Z" fill="#475569" stroke="#334155" stroke-width="1" />
          <!-- Pommel -->
          <circle cx="8" cy="60" r="3" fill="#f59e0b" stroke="#78350f" stroke-width="1" />
        </svg>
        <!-- Authentic Metal Longsword 2 (Left to Right) -->
        <svg viewBox="0 0 64 64" width="84" height="84" style="position: absolute; animation: vttSwordSlash2 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards; filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.75));">
          <!-- Blade -->
          <path d="M54 10 L14 50 L10 54 L6 50 L10 46 L50 6 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.2" />
          <!-- Fuller -->
          <path d="M46 18 L18 46" stroke="#64748b" stroke-width="1.5" />
          <!-- Crossguard -->
          <path d="M14 50 L6 58 L10 62 L18 54 Z" fill="#475569" stroke="#334155" stroke-width="1" />
          <!-- Pommel -->
          <circle cx="8" cy="60" r="3" fill="#f59e0b" stroke="#78350f" stroke-width="1" />
        </svg>
      </div>
    `,
    particles: {
      count: 12,
      colors: ["#ef4444", "#dc2626", "#b91c1c", "#ffffff", "#fca5a5"],
      speedRange: [40, 110],
      sizeRangePx: [2, 4],
      gravity: 80,
      shape: "sparkle",
      spreadAngleRange: [0, Math.PI * 2],
      lifeMs: 600
    }
  },

  arrow_hit: {
    id: "arrow_hit",
    durationMs: 700,
    renderSvg: () => `
      <style>
        @keyframes vttArrowShoot {
          0% { transform: translate(-150%, 0%) scale(1.15); opacity: 0; }
          15% { opacity: 1; }
          45% { transform: translate(0%, 0%) scale(1.15); opacity: 1; }
          65% { transform: translate(10%, 0%) scale(1.15); opacity: 1; }
          100% { transform: translate(150%, 0%) scale(1.15); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <svg viewBox="0 0 64 64" width="88" height="44" style="animation: vttArrowShoot 0.65s cubic-bezier(0.25, 1, 0.5, 1) forwards; filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.7));">
          <!-- Horizontal Arrow pointing right -->
          <path d="M4 32 L46 32 L46 24 L62 32 L46 40 L46 32 L4 32 Z" fill="#d97706" stroke="#78350f" stroke-width="1.5" />
          <!-- Arrow feathers on left -->
          <path d="M4 32 L14 24 L14 32 Z" fill="#ef4444" />
          <path d="M4 32 L14 40 L14 32 Z" fill="#dc2626" />
          <!-- Arrow tip -->
          <path d="M46 24 L62 32 L46 40 Z" fill="#94a3b8" stroke="#475569" stroke-width="1" />
        </svg>
      </div>
    `,
    particles: {
      count: 14,
      colors: ["#d97706", "#b45309", "#92400e", "#fef3c7", "#f59e0b"],
      speedRange: [60, 150],
      sizeRangePx: [2, 4],
      gravity: 180,
      shape: "splinter",
      lifeMs: 500
    }
  },

  fireball_explosion: {
    id: "fireball_explosion",
    durationMs: 900,
    renderSvg: () => `
      <style>
        @keyframes vttFireballCore {
          0% { transform: scale(0.1); opacity: 0.95; filter: blur(0px) brightness(2.0); }
          12% { transform: scale(0.6); opacity: 1; filter: blur(0px) brightness(1.6); }
          25% { transform: scale(1.2); opacity: 1; filter: blur(1px) brightness(1.4); }
          38% { transform: scale(1.6); opacity: 0.95; filter: blur(1px) brightness(1.2); }
          50% { transform: scale(1.9); opacity: 0.9; filter: blur(2px) brightness(1.1); }
          62% { transform: scale(2.2); opacity: 0.8; filter: blur(3px) brightness(1.0); }
          75% { transform: scale(2.5); opacity: 0.6; filter: blur(4px) brightness(0.9); }
          86% { transform: scale(2.7); opacity: 0.35; filter: blur(6px) brightness(0.8); }
          94% { transform: scale(2.9); opacity: 0.15; filter: blur(7px) brightness(0.7); }
          100% { transform: scale(3.1); opacity: 0; filter: blur(8px) brightness(0.6); }
        }
        @keyframes vttShockwave {
          0% { transform: scale(0.2); opacity: 1; border-width: 8px; }
          12% { transform: scale(0.6); opacity: 0.95; border-width: 7px; }
          25% { transform: scale(1.1); opacity: 0.9; border-width: 6px; }
          38% { transform: scale(1.5); opacity: 0.85; border-width: 5px; }
          50% { transform: scale(1.9); opacity: 0.75; border-width: 4px; }
          62% { transform: scale(2.3); opacity: 0.6; border-width: 4px; }
          75% { transform: scale(2.6); opacity: 0.45; border-width: 3px; }
          86% { transform: scale(2.9); opacity: 0.25; border-width: 2px; }
          94% { transform: scale(3.1); opacity: 0.1; border-width: 1px; }
          100% { transform: scale(3.3); opacity: 0; border-width: 1px; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Expanding Shockwave -->
        <div style="position: absolute; width: 70px; height: 70px; border: 6px solid #f97316; border-radius: 50%; box-shadow: 0 0 20px #ef4444, inset 0 0 20px #eab308; animation: vttShockwave 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Fireball Core SVG -->
        <svg viewBox="0 0 100 100" width="110" height="110" style="animation: vttFireballCore 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <defs>
            <radialGradient id="fireGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#ffffff" />
              <stop offset="25%" stop-color="#fef08a" />
              <stop offset="55%" stop-color="#f97316" />
              <stop offset="85%" stop-color="#ef4444" />
              <stop offset="100%" stop-color="transparent" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#fireGrad)" />
        </svg>
      </div>
    `,
    particles: {
      count: 38,
      colors: ["#f97316", "#eab308", "#ef4444", "#ffedd5", "#fb923c"],
      speedRange: [60, 160],
      sizeRangePx: [3, 8],
      gravity: -90, // Rising thermal embers
      shape: "ember",
      lifeMs: 800
    }
  },

  pink_sparkles: {
    id: "pink_sparkles",
    durationMs: 1000,
    renderSvg: () => `
      <style>
        @keyframes vttSparkleRotate {
          0% { transform: scale(0.3) rotate(0deg); opacity: 0; }
          30% { transform: scale(1.4) rotate(180deg); opacity: 1; filter: drop-shadow(0 0 14px #ec4899); }
          70% { transform: scale(1.2) rotate(360deg); opacity: 0.9; }
          100% { transform: scale(0.2) rotate(540deg); opacity: 0; }
        }
        @keyframes vttSparkleRotateCounter {
          0% { transform: scale(0.2) rotate(0deg); opacity: 0; }
          40% { transform: scale(1.1) rotate(-180deg); opacity: 0.8; filter: drop-shadow(0 0 10px #fbbf24); }
          100% { transform: scale(0.1) rotate(-360deg); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Primary Pink Star -->
        <svg viewBox="0 0 100 100" width="96" height="96" style="position: absolute; animation: vttSparkleRotate 0.95s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M50 0 C50 35 65 50 100 50 C65 50 50 65 50 100 C50 65 35 50 0 50 C35 50 50 35 50 0 Z" fill="#ec4899" />
          <circle cx="50" cy="50" r="12" fill="#ffffff" />
        </svg>
        <!-- Secondary Gold Star -->
        <svg viewBox="0 0 100 100" width="76" height="76" style="position: absolute; animation: vttSparkleRotateCounter 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M50 0 C50 35 65 50 100 50 C65 50 50 65 50 100 C50 65 35 50 0 50 C35 50 50 35 50 0 Z" fill="#fbbf24" opacity="0.85" />
        </svg>
      </div>
    `,
    particles: {
      count: 30,
      colors: ["#ec4899", "#f472b6", "#fbbf24", "#fbcfe8", "#ffffff"],
      speedRange: [25, 80],
      sizeRangePx: [3, 7],
      gravity: -35, // Soft floating upward fountain
      shape: "sparkle",
      lifeMs: 900
    }
  },

  dagger_twirl: {
    id: "dagger_twirl",
    durationMs: 700,
    renderSvg: () => `
      <style>
        @keyframes vttDaggerTwirl {
          0%   { transform: translate(-160%, 0%) rotate(0deg) scale(1.1); opacity: 0; }
          10%  { transform: translate(-128%, 0%) rotate(72deg) scale(1.1); opacity: 1; }
          20%  { transform: translate(-96%, 0%) rotate(144deg) scale(1.1); opacity: 1; }
          30%  { transform: translate(-64%, 0%) rotate(216deg) scale(1.1); opacity: 1; }
          40%  { transform: translate(-32%, 0%) rotate(288deg) scale(1.1); opacity: 1; }
          50%  { transform: translate(0%, 0%) rotate(360deg) scale(1.1); opacity: 1; }
          60%  { transform: translate(32%, 0%) rotate(432deg) scale(1.1); opacity: 1; }
          70%  { transform: translate(64%, 0%) rotate(504deg) scale(1.1); opacity: 1; }
          80%  { transform: translate(96%, 0%) rotate(576deg) scale(1.1); opacity: 1; }
          90%  { transform: translate(128%, 0%) rotate(648deg) scale(1.1); opacity: 1; }
          100% { transform: translate(160%, 0%) rotate(720deg) scale(1.1); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <svg viewBox="0 0 64 64" width="68" height="68" style="animation: vttDaggerTwirl 0.68s linear forwards; filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.7));">
          <path d="M52 12 L26 38 L22 34 L48 8 Z" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5" />
          <path d="M22 34 L16 40 L24 48 L30 42 Z" fill="#334155" />
          <path d="M16 40 L8 48 L16 56 L24 48 Z" fill="#78350f" />
          <circle cx="12" cy="52" r="3" fill="#fbbf24" />
        </svg>
      </div>
    `,
    particles: {
      count: 10,
      colors: ["#94a3b8", "#cbd5e1", "#ffffff", "#f1f5f9"],
      speedRange: [50, 130],
      sizeRangePx: [2, 4],
      gravity: 120,
      shape: "sparkle",
      lifeMs: 480
    }
  },

  holy_healing: {
    id: "holy_healing",
    durationMs: 900,
    renderSvg: () => `
      <style>
        @keyframes vttHolyCore {
          0% { transform: scale(0.2); opacity: 0; filter: blur(4px); }
          25% { transform: scale(1.2); opacity: 1; filter: blur(0px) drop-shadow(0 0 16px #facc15); }
          50% { transform: scale(1.0); opacity: 1; filter: blur(0px) drop-shadow(0 0 24px #4ade80); }
          80% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttHealingAura {
          0% { transform: scale(0.2); opacity: 1; border-width: 6px; }
          60% { transform: scale(2.2); opacity: 0.7; border-width: 3px; }
          100% { transform: scale(3.0); opacity: 0; border-width: 1px; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <div style="position: absolute; width: 70px; height: 70px; border: 4px solid #4ade80; border-radius: 50%; box-shadow: 0 0 20px #facc15, inset 0 0 20px #86efac; animation: vttHealingAura 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <svg viewBox="0 0 100 100" width="88" height="88" style="animation: vttHolyCore 0.88s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <!-- Holy Cross Symbol -->
          <path d="M44 20 L56 20 L56 44 L80 44 L80 56 L56 56 L56 80 L44 80 L44 56 L20 56 L20 44 L44 44 Z" fill="#facc15" stroke="#ffffff" stroke-width="2" />
        </svg>
      </div>
    `,
    particles: {
      count: 26,
      colors: ["#facc15", "#4ade80", "#86efac", "#ffffff", "#fef08a"],
      speedRange: [30, 90],
      sizeRangePx: [2, 6],
      gravity: -55, // Gentle rising healing sparkles
      shape: "sparkle",
      lifeMs: 750
    }
  },

  turn_undead: {
    id: "turn_undead",
    durationMs: 950,
    renderSvg: () => `
      <style>
        @keyframes vttDarknessLayer {
          0% { transform: scale(1); opacity: 0.9; }
          30% { transform: scale(1.1); opacity: 0.9; filter: blur(2px); }
          60% { transform: scale(1.6); opacity: 0.3; filter: blur(8px); }
          100% { transform: scale(2.2); opacity: 0; filter: blur(14px); }
        }
        @keyframes vttHolyLightWipe {
          0% { transform: scale(0.1); opacity: 0; }
          25% { transform: scale(0.4); opacity: 1; }
          65% { transform: scale(2.8); opacity: 0.8; }
          100% { transform: scale(3.5); opacity: 0; }
        }
        @keyframes vttHolySymbolPulse {
          0% { transform: scale(0.5); opacity: 0; }
          25% { transform: scale(1.3); opacity: 1; filter: drop-shadow(0 0 20px #a855f7); }
          70% { transform: scale(1.1); opacity: 0.9; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Darkness Mist Layer -->
        <div style="position: absolute; width: 140px; height: 140px; background: radial-gradient(circle, #0f172a 0%, #1e293b 50%, transparent 100%); border-radius: 50%; animation: vttDarknessLayer 0.9s ease-out forwards;"></div>
        <!-- Holy Light Wipe Wave -->
        <div style="position: absolute; width: 80px; height: 80px; background: radial-gradient(circle, #ffffff 10%, #a855f7 60%, transparent 100%); border-radius: 50%; animation: vttHolyLightWipe 0.88s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Upside-Down Holy Healing Cross inverted -->
        <svg viewBox="0 0 100 100" width="80" height="80" style="position: absolute; animation: vttHolySymbolPulse 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <!-- Holy Cross turned upside down (rotate(180 50 50)) and inverted colors -->
          <path d="M44 20 L56 20 L56 44 L80 44 L80 56 L56 56 L56 80 L44 80 L44 56 L20 56 L20 44 L44 44 Z" transform="rotate(180 50 50)" fill="#3b0764" stroke="#c084fc" stroke-width="2" />
        </svg>
      </div>
    `,
    particles: {
      count: 32,
      colors: ["#c084fc", "#a855f7", "#ffffff", "#e9d5ff"],
      speedRange: [50, 140],
      sizeRangePx: [3, 6],
      gravity: -65, // Rising holy violet ash
      shape: "sparkle",
      lifeMs: 800
    }
  },

  lute_music: {
    id: "lute_music",
    durationMs: 950,
    renderSvg: () => `
      <style>
        @keyframes vttLuteStrum {
          0% { transform: scale(0.6) rotate(-15deg); opacity: 0; }
          20% { transform: scale(1.1) rotate(12deg); opacity: 1; filter: drop-shadow(0 0 12px #fbbf24); }
          45% { transform: scale(1.0) rotate(-8deg); opacity: 1; }
          70% { transform: scale(1.05) rotate(6deg); opacity: 0.9; }
          100% { transform: scale(0.8) rotate(0deg); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <svg viewBox="0 0 64 64" width="84" height="84" style="animation: vttLuteStrum 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.7));">
          <!-- Body (Rich Dark Brown) -->
          <circle cx="26" cy="42" r="16" fill="#92400e" stroke="#78350f" stroke-width="2" />
          <circle cx="26" cy="42" r="6" fill="#451a03" />
          <!-- Neck & Head (Medium Brown) -->
          <path d="M36 32 L54 14 L58 18 L40 36 Z" fill="#b45309" stroke="#78350f" stroke-width="1" />
          <path d="M52 12 L58 18 L62 14 L56 8 Z" fill="#78350f" />
          <!-- Strings -->
          <line x1="22" y1="46" x2="56" y2="12" stroke="#fef08a" stroke-width="1" />
          <line x1="26" y1="48" x2="58" y2="16" stroke="#fef08a" stroke-width="1" />
        </svg>
      </div>
    `,
    particles: {
      count: 24,
      colors: ["#facc15", "#38bdf8", "#f472b6", "#a855f7", "#4ade80"],
      speedRange: [30, 85],
      sizeRangePx: [4, 8],
      gravity: -50, // Drifting upward notes
      shape: "note",
      lifeMs: 850
    }
  },

  lightning_strikes: {
    id: "lightning_strikes",
    durationMs: 800,
    renderSvg: () => `
      <style>
        @keyframes vttLightningFlash {
          0% { opacity: 0; }
          12% { opacity: 0.45; background: #38bdf8; }
          18% { opacity: 0; }
          40% { opacity: 0.65; background: #ffffff; }
          48% { opacity: 0; }
          72% { opacity: 0.5; background: #00f2fe; }
          82% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes vttBoltStrike1 {
          0% { opacity: 0; transform: translateY(-40px) scaleY(0.5); }
          10% { opacity: 1; transform: translateY(0) scaleY(1.1); filter: drop-shadow(0 0 12px #38bdf8); }
          22% { opacity: 0; transform: translateY(10px) scaleY(1); }
          100% { opacity: 0; }
        }
        @keyframes vttBoltStrike2 {
          0% { opacity: 0; }
          36% { opacity: 0; transform: translateX(25px) translateY(-30px) scale(0.8) rotate(10deg); }
          42% { opacity: 1; transform: translateX(20px) translateY(0) scale(1.2) rotate(10deg); filter: drop-shadow(0 0 16px #ffffff); }
          54% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes vttBoltStrike3 {
          0% { opacity: 0; }
          66% { opacity: 0; transform: translateX(-25px) translateY(-30px) scale(0.9) rotate(-12deg); }
          74% { opacity: 1; transform: translateX(-20px) translateY(0) scale(1.1) rotate(-12deg); filter: drop-shadow(0 0 14px #00f2fe); }
          86% { opacity: 0; }
          100% { opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <div style="position: absolute; width: 100%; height: 100%; animation: vttLightningFlash 0.78s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Bolt 1 -->
        <svg viewBox="0 0 64 64" width="70" height="70" style="position: absolute; animation: vttBoltStrike1 0.75s forwards;">
          <path d="M34 2 L18 34 L32 34 L26 62 L48 26 L34 26 Z" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" />
        </svg>
        <!-- Bolt 2 -->
        <svg viewBox="0 0 64 64" width="76" height="76" style="position: absolute; animation: vttBoltStrike2 0.78s forwards;">
          <path d="M34 2 L18 34 L32 34 L26 62 L48 26 L34 26 Z" fill="#ffffff" stroke="#00f2fe" stroke-width="2" />
        </svg>
        <!-- Bolt 3 -->
        <svg viewBox="0 0 64 64" width="68" height="68" style="position: absolute; animation: vttBoltStrike3 0.78s forwards;">
          <path d="M34 2 L18 34 L32 34 L26 62 L48 26 L34 26 Z" fill="#00f2fe" stroke="#ffffff" stroke-width="1.5" />
        </svg>
      </div>
    `,
    particles: {
      count: 28,
      colors: ["#38bdf8", "#00f2fe", "#ffffff", "#7dd3fc"],
      speedRange: [80, 200],
      sizeRangePx: [2, 5],
      gravity: 160,
      shape: "sparkle",
      lifeMs: 500
    }
  },

  toxic_cloud: {
    id: "toxic_cloud",
    durationMs: 950,
    renderSvg: () => `
      <style>
        @keyframes vttToxicGas1 {
          0% { transform: scale(0.2) translate(-20px, 10px); opacity: 0; }
          30% { transform: scale(1.6) translate(-10px, -5px); opacity: 0.85; filter: blur(4px); }
          70% { transform: scale(2.2) translate(5px, -15px); opacity: 0.6; filter: blur(8px); }
          100% { transform: scale(2.8) translate(15px, -25px); opacity: 0; filter: blur(14px); }
        }
        @keyframes vttToxicGas2 {
          0% { transform: scale(0.2) translate(20px, 10px); opacity: 0; }
          35% { transform: scale(1.5) translate(10px, -5px); opacity: 0.8; filter: blur(3px); }
          75% { transform: scale(2.4) translate(-5px, -18px); opacity: 0.5; filter: blur(10px); }
          100% { transform: scale(3.0) translate(-15px, -30px); opacity: 0; filter: blur(16px); }
        }
        @keyframes vttToxicSkull {
          0% { transform: scale(0.4); opacity: 0; }
          25% { transform: scale(1.2); opacity: 0.95; filter: drop-shadow(0 0 12px #22c55e); }
          65% { transform: scale(1.3); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; filter: blur(6px); }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Billowing Gas Cloud 1 -->
        <div style="position: absolute; width: 90px; height: 90px; background: radial-gradient(circle, #22c55e 10%, #15803d 50%, transparent 100%); border-radius: 50%; animation: vttToxicGas1 0.9s ease-out forwards;"></div>
        <!-- Billowing Gas Cloud 2 -->
        <div style="position: absolute; width: 90px; height: 90px; background: radial-gradient(circle, #a855f7 10%, #86198f 50%, transparent 100%); border-radius: 50%; animation: vttToxicGas2 0.92s ease-out forwards;"></div>
        <!-- Biohazard Skull/Symbol -->
        <svg viewBox="0 0 100 100" width="76" height="76" style="position: absolute; animation: vttToxicSkull 0.88s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <circle cx="50" cy="50" r="32" fill="none" stroke="#22c55e" stroke-width="4" />
          <circle cx="50" cy="50" r="10" fill="#22c55e" />
          <path d="M50 18 L50 34 M23 65 L37 57 M77 65 L63 57" stroke="#22c55e" stroke-width="6" stroke-linecap="round" />
        </svg>
      </div>
    `,
    particles: {
      count: 34,
      colors: ["#22c55e", "#4ade80", "#86efac", "#a855f7", "#c084fc"],
      speedRange: [30, 90],
      sizeRangePx: [3, 7],
      gravity: -45, // Rising poison bubbles
      shape: "circle",
      lifeMs: 800
    }
  },


  arcane_shield: {
    id: "arcane_shield",
    durationMs: 850,
    renderSvg: () => `
      <style>
        @keyframes vttShieldDeploy {
          0% { transform: scale(0.2); opacity: 0; filter: blur(4px); }
          25% { transform: scale(1.3); opacity: 1; filter: drop-shadow(0 0 16px #38bdf8); }
          65% { transform: scale(1.15); opacity: 0.9; }
          100% { transform: scale(1.6); opacity: 0; filter: blur(8px); }
        }
        @keyframes vttShieldImpact {
          0% { transform: scale(0.1); opacity: 0; }
          30% { transform: scale(0.8); opacity: 1; }
          60% { transform: scale(1.4); opacity: 0.7; }
          100% { transform: scale(2.0); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Deflected Energy Ring -->
        <div style="position: absolute; width: 78px; height: 78px; border: 3px solid #818cf8; border-radius: 50%; box-shadow: 0 0 20px #38bdf8; animation: vttShieldImpact 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Hexagonal Arcane Barrier -->
        <svg viewBox="0 0 100 100" width="88" height="88" style="position: absolute; animation: vttShieldDeploy 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <!-- Runic Outer Shield Shield Crest -->
          <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="rgba(56, 189, 248, 0.25)" stroke="#38bdf8" stroke-width="3" />
          <polygon points="50,16 80,34 80,66 50,84 20,66 20,34" fill="none" stroke="#818cf8" stroke-width="1.5" stroke-dasharray="6 4" />
          <circle cx="50" cy="50" r="18" fill="rgba(99, 102, 241, 0.3)" stroke="#c084fc" stroke-width="2" />
          <circle cx="50" cy="50" r="6" fill="#ffffff" />
        </svg>
      </div>
    `,
    particles: {
      count: 26,
      colors: ["#38bdf8", "#818cf8", "#a855f7", "#ffffff", "#e0e7ff"],
      speedRange: [40, 110],
      sizeRangePx: [2, 5],
      gravity: 0,
      shape: "sparkle",
      lifeMs: 700
    }
  },

  ice_spike: {
    id: "ice_spike",
    durationMs: 850,
    renderSvg: () => `
      <style>
        @keyframes vttIceStalagmite {
          0% { transform: translateY(60%) scaleY(0.1) scaleX(0.5); opacity: 0; }
          22% { transform: translateY(-8%) scaleY(1.3) scaleX(1.2); opacity: 1; filter: drop-shadow(0 0 16px #38bdf8); }
          50% { transform: translateY(0%) scaleY(1.1) scaleX(1.0); opacity: 1; }
          75% { transform: translateY(0%) scaleY(1.1) scaleX(1.0); opacity: 0.9; }
          100% { transform: translateY(-15%) scaleY(1.3) scaleX(1.2); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttFrostMist {
          0% { transform: scale(0.2); opacity: 0.9; }
          50% { transform: scale(1.8); opacity: 0.6; filter: blur(6px); }
          100% { transform: scale(2.6); opacity: 0; filter: blur(12px); }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Freezing Mist Ring -->
        <div style="position: absolute; width: 90px; height: 40px; background: radial-gradient(ellipse at center, #bae6fd 10%, #38bdf8 60%, transparent 100%); animation: vttFrostMist 0.85s ease-out forwards;"></div>
        <!-- Crystalline Glacial Spike -->
        <svg viewBox="0 0 64 64" width="86" height="86" style="position: absolute; animation: vttIceStalagmite 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <!-- Main Central Spike -->
          <polygon points="32,4 44,56 20,56" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2" />
          <polygon points="32,4 32,56 20,56" fill="#7dd3fc" />
          <!-- Left Flanking Shard -->
          <polygon points="18,24 26,56 12,56" fill="#bae6fd" stroke="#0284c7" stroke-width="1.5" />
          <!-- Right Flanking Shard -->
          <polygon points="46,24 52,56 38,56" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5" />
        </svg>
      </div>
    `,
    particles: {
      count: 30,
      colors: ["#e0f2fe", "#bae6fd", "#38bdf8", "#ffffff", "#7dd3fc"],
      speedRange: [50, 150],
      sizeRangePx: [2, 5],
      gravity: 140, // Falling frost shards
      shape: "splinter",
      lifeMs: 750
    }
  },



  eldritch_blast: {
    id: "eldritch_blast",
    durationMs: 800,
    renderSvg: () => `
      <style>
        @keyframes vttBlastBeam {
          0% { transform: scaleX(0); opacity: 0; }
          30% { transform: scaleX(1.8); opacity: 1; filter: drop-shadow(0 0 16px #22c55e); }
          70% { transform: scaleX(2.0); opacity: 0.8; }
          100% { transform: scaleX(2.4); opacity: 0; }
        }
        @keyframes vttEldritchEye {
          0% { transform: scale(0.2) rotate(-30deg); opacity: 0; }
          30% { transform: scale(1.3) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 18px #a855f7); }
          70% { transform: scale(1.1) rotate(15deg); opacity: 0.9; }
          100% { transform: scale(0.5) rotate(45deg); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Crackling Force Beam -->
        <div style="position: absolute; width: 180%; height: 6px; background: linear-gradient(90deg, transparent, #a855f7, #22c55e, #ffffff, #22c55e, transparent); box-shadow: 0 0 16px #a855f7; animation: vttBlastBeam 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Eldritch Arcane Eye -->
        <svg viewBox="0 0 64 64" width="76" height="76" style="position: absolute; animation: vttEldritchEye 0.78s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M4 32 C16 12 48 12 60 32 C48 52 16 52 4 32 Z" fill="#3b0764" stroke="#a855f7" stroke-width="2.5" />
          <circle cx="32" cy="32" r="12" fill="#22c55e" stroke="#ffffff" stroke-width="1.5" />
          <circle cx="32" cy="32" r="5" fill="#0f172a" />
        </svg>
      </div>
    `,
    particles: {
      count: 32,
      colors: ["#a855f7", "#c084fc", "#22c55e", "#ffffff"],
      speedRange: [80, 190],
      sizeRangePx: [2, 5],
      gravity: 0,
      shape: "sparkle",
      lifeMs: 650
    }
  },

  necrotic_drain: {
    id: "necrotic_drain",
    durationMs: 850,
    renderSvg: () => `
      <style>
        @keyframes vttNecroSkull {
          0% { transform: scale(0.3); opacity: 0; }
          25% { transform: scale(1.2); opacity: 1; filter: drop-shadow(0 0 16px #991b1b); }
          65% { transform: scale(1.05); opacity: 0.9; }
          100% { transform: scale(1.4); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttDrainVortex {
          0% { transform: scale(2.2) rotate(0deg); opacity: 0; }
          40% { transform: scale(1.0) rotate(180deg); opacity: 0.85; }
          100% { transform: scale(0.2) rotate(360deg); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Inward Spiraling Life Drain Ring -->
        <div style="position: absolute; width: 90px; height: 90px; border: 4px dashed #ef4444; border-radius: 50%; box-shadow: 0 0 18px #991b1b; animation: vttDrainVortex 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Dark Necromancy Skull -->
        <svg viewBox="0 0 64 64" width="76" height="76" style="position: absolute; animation: vttNecroSkull 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M16 26 C16 14 24 8 32 8 C40 8 48 14 48 26 C48 36 44 42 38 46 L38 56 L26 56 L26 46 C20 42 16 36 16 26 Z" fill="#1e293b" stroke="#ef4444" stroke-width="2" />
          <circle cx="26" cy="28" r="4" fill="#ef4444" />
          <circle cx="38" cy="28" r="4" fill="#ef4444" />
          <path d="M30 40 L34 40 L32 36 Z" fill="#991b1b" />
        </svg>
      </div>
    `,
    particles: {
      count: 28,
      colors: ["#991b1b", "#ef4444", "#4c0519", "#0f172a"],
      speedRange: [40, 100],
      sizeRangePx: [3, 6],
      gravity: -60,
      shape: "circle",
      lifeMs: 750
    }
  },

  counterspell: {
    id: "counterspell",
    durationMs: 800,
    renderSvg: () => `
      <style>
        @keyframes vttSpellRunes {
          0% { transform: scale(1.4) rotate(0deg); opacity: 0.9; }
          35% { transform: scale(1.0) rotate(90deg); opacity: 1; }
          45% { transform: scale(0.2) rotate(180deg); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes vttCounterSlam {
          0% { transform: scale(0.1); opacity: 0; }
          35% { transform: scale(1.5); opacity: 1; filter: drop-shadow(0 0 20px #ef4444); }
          65% { transform: scale(1.8); opacity: 0.8; }
          100% { transform: scale(2.6); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Incoming Runic Magic Circle being shattered -->
        <div style="position: absolute; width: 76px; height: 76px; border: 3px solid #38bdf8; border-radius: 50%; box-shadow: 0 0 14px #f472b6; animation: vttSpellRunes 0.75s ease-in forwards;"></div>
        <!-- Anti-Magic Counterspell Slam -->
        <svg viewBox="0 0 100 100" width="88" height="88" style="position: absolute; animation: vttCounterSlam 0.78s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <circle cx="50" cy="50" r="38" fill="none" stroke="#ef4444" stroke-width="6" />
          <line x1="22" y1="22" x2="78" y2="78" stroke="#ef4444" stroke-width="8" stroke-linecap="round" />
          <circle cx="50" cy="50" r="16" fill="rgba(245, 158, 11, 0.4)" />
        </svg>
      </div>
    `,
    particles: {
      count: 30,
      colors: ["#38bdf8", "#f472b6", "#ef4444", "#ffffff"],
      speedRange: [60, 160],
      sizeRangePx: [2, 5],
      gravity: 0,
      shape: "splinter",
      lifeMs: 600
    }
  },

  nature_entangle: {
    id: "nature_entangle",
    durationMs: 900,
    renderSvg: () => `
      <style>
        @keyframes vttVineGrow {
          0% { transform: scale(0.2) rotate(-45deg); opacity: 0; }
          30% { transform: scale(1.25) rotate(10deg); opacity: 1; filter: drop-shadow(0 0 16px #4ade80); }
          70% { transform: scale(1.1) rotate(0deg); opacity: 0.9; }
          100% { transform: scale(1.5) rotate(20deg); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttBloomPulse {
          0% { transform: scale(0.1); opacity: 0; }
          40% { transform: scale(1.4); opacity: 1; }
          100% { transform: scale(2.0); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Bloom Ring -->
        <div style="position: absolute; width: 84px; height: 84px; border: 3px solid #4ade80; border-radius: 50%; box-shadow: 0 0 16px #facc15; animation: vttBloomPulse 0.85s ease-out forwards;"></div>
        <!-- Entangling Thorny Vines -->
        <svg viewBox="0 0 64 64" width="86" height="86" style="position: absolute; animation: vttVineGrow 0.88s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M12 52 C24 40 16 24 32 18 C48 12 44 32 54 12" fill="none" stroke="#16a34a" stroke-width="4" stroke-linecap="round" />
          <path d="M16 48 C30 48 36 34 26 24 C16 14 42 16 50 38" fill="none" stroke="#854d0e" stroke-width="3" stroke-linecap="round" />
          <!-- Leaves & Blossoms -->
          <circle cx="32" cy="18" r="6" fill="#4ade80" />
          <circle cx="26" cy="24" r="5" fill="#facc15" />
          <circle cx="50" cy="38" r="6" fill="#4ade80" />
        </svg>
      </div>
    `,
    particles: {
      count: 26,
      colors: ["#4ade80", "#22c55e", "#86efac", "#facc15"],
      speedRange: [30, 85],
      sizeRangePx: [3, 7],
      gravity: -25, // Rising nature spores/leaves
      shape: "circle",
      lifeMs: 800
    }
  },



  psychic_blast: {
    id: "psychic_blast",
    durationMs: 850,
    renderSvg: () => `
      <style>
        @keyframes vttPsiPulse {
          0% { transform: scale(0.3); opacity: 0; filter: blur(4px); }
          25% { transform: scale(1.3); opacity: 1; filter: drop-shadow(0 0 18px #ec4899); }
          65% { transform: scale(1.1); opacity: 0.9; }
          100% { transform: scale(1.6); opacity: 0; filter: blur(8px); }
        }
        @keyframes vttPsiRing1 {
          0% { transform: scale(0.2); opacity: 1; border-width: 5px; }
          60% { transform: scale(2.4); opacity: 0.7; border-width: 2px; }
          100% { transform: scale(3.2); opacity: 0; border-width: 1px; }
        }
        @keyframes vttPsiRing2 {
          0% { transform: scale(0.1); opacity: 0; }
          25% { transform: scale(0.4); opacity: 1; border-width: 4px; }
          80% { transform: scale(2.8); opacity: 0.5; border-width: 1px; }
          100% { transform: scale(3.5); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Concentric Psionic Shockwaves -->
        <div style="position: absolute; width: 76px; height: 76px; border: 3px solid #ec4899; border-radius: 50%; box-shadow: 0 0 16px #a855f7; animation: vttPsiRing1 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <div style="position: absolute; width: 76px; height: 76px; border: 3px solid #38bdf8; border-radius: 50%; animation: vttPsiRing2 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.1s; opacity: 0;"></div>
        <!-- Brain / Mind Pulse Symbol -->
        <svg viewBox="0 0 64 64" width="80" height="80" style="position: absolute; animation: vttPsiPulse 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M32 12 C20 12 14 20 14 30 C14 36 18 42 22 46 C24 48 26 52 32 52 C38 52 40 48 42 46 C46 42 50 36 50 30 C50 20 44 12 32 12 Z" fill="#701a75" stroke="#ec4899" stroke-width="2.5" />
          <path d="M32 16 L32 48 M22 24 C26 24 28 28 28 32 M42 24 C38 24 36 28 36 32" stroke="#f472b6" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div>
    `,
    particles: {
      count: 30,
      colors: ["#ec4899", "#f472b6", "#a855f7", "#38bdf8", "#ffffff"],
      speedRange: [40, 130],
      sizeRangePx: [2, 5],
      gravity: 0,
      shape: "sparkle",
      lifeMs: 750
    }
  },

  divine_smite: {
    id: "divine_smite",
    durationMs: 850,
    renderSvg: () => `
      <style>
        @keyframes vttSmiteBlade {
          0% { transform: translateY(-160%) scaleX(0.5); opacity: 0; }
          25% { transform: translateY(0%) scaleX(1.4); opacity: 1; filter: drop-shadow(0 0 24px #facc15); }
          60% { transform: translateY(0%) scaleX(1.1); opacity: 0.9; }
          100% { transform: translateY(15%) scaleX(1.6); opacity: 0; filter: blur(8px); }
        }
        @keyframes vttSmiteNova {
          0% { transform: scale(0.1); opacity: 0; }
          25% { transform: scale(1.6); opacity: 1; }
          75% { transform: scale(2.4); opacity: 0.7; }
          100% { transform: scale(3.2); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Golden Solar Flare Nova -->
        <div style="position: absolute; width: 84px; height: 84px; background: radial-gradient(circle, #ffffff 10%, #facc15 50%, transparent 100%); border-radius: 50%; animation: vttSmiteNova 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.15s; opacity: 0;"></div>
        <!-- Holy Sunburst Sword of Light -->
        <svg viewBox="0 0 64 64" width="90" height="90" style="position: absolute; animation: vttSmiteBlade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M32 2 L40 24 L62 32 L40 40 L32 62 L24 40 L2 32 L24 24 Z" fill="#facc15" stroke="#ffffff" stroke-width="2" />
          <circle cx="32" cy="32" r="10" fill="#ffffff" />
        </svg>
      </div>
    `,
    particles: {
      count: 34,
      colors: ["#facc15", "#fbbf24", "#ffffff", "#fef08a"],
      speedRange: [80, 210],
      sizeRangePx: [2, 6],
      gravity: 110,
      shape: "sparkle",
      lifeMs: 700
    }
  },

  barbarian_rage: {
    id: "barbarian_rage",
    durationMs: 850,
    renderSvg: () => `
      <style>
        @keyframes vttRageAura {
          0% { transform: scale(0.3); opacity: 0; filter: blur(4px); }
          30% { transform: scale(1.45); opacity: 1; filter: drop-shadow(0 0 22px #ef4444); }
          70% { transform: scale(1.25); opacity: 0.85; }
          100% { transform: scale(1.8); opacity: 0; filter: blur(10px); }
        }
        @keyframes vttClawSlash {
          0% { transform: scale(1.6) translate(-20px, -20px); opacity: 0; }
          25% { transform: scale(1.1) translate(0px, 0px); opacity: 1; filter: drop-shadow(0 0 16px #f97316); }
          65% { transform: scale(1.0) translate(5px, 5px); opacity: 0.9; }
          100% { transform: scale(0.8) translate(15px, 15px); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Boiling Primal Fury Aura Ring -->
        <div style="position: absolute; width: 86px; height: 86px; border: 4px solid #ef4444; border-radius: 50%; box-shadow: 0 0 24px #dc2626; animation: vttRageAura 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Raging Primal Claw Slashes -->
        <svg viewBox="0 0 64 64" width="86" height="86" style="position: absolute; animation: vttClawSlash 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M12 18 C26 28 38 42 46 54" stroke="#ef4444" stroke-width="5" stroke-linecap="round" />
          <path d="M22 10 C36 20 48 34 56 46" stroke="#f97316" stroke-width="6" stroke-linecap="round" />
          <path d="M8 28 C20 38 32 50 40 58" stroke="#ef4444" stroke-width="4" stroke-linecap="round" />
        </svg>
      </div>
    `,
    particles: {
      count: 32,
      colors: ["#ef4444", "#f97316", "#dc2626", "#fbbf24"],
      speedRange: [80, 200],
      sizeRangePx: [3, 6],
      gravity: -100, // Boiling rage embers rising up
      shape: "sparkle",
      lifeMs: 700
    }
  },

  wild_magic: {
    id: "wild_magic",
    durationMs: 900,
    renderSvg: () => `
      <style>
        @keyframes vttChaosVortex {
          0% { transform: scale(0.2) rotate(0deg); opacity: 0; filter: blur(4px); }
          30% { transform: scale(1.4) rotate(180deg); opacity: 1; filter: drop-shadow(0 0 20px #ec4899); }
          70% { transform: scale(1.2) rotate(360deg); opacity: 0.9; }
          100% { transform: scale(0.1) rotate(540deg); opacity: 0; filter: blur(8px); }
        }
        @keyframes vttChaosPulse {
          0% { transform: scale(0.1); opacity: 1; }
          50% { transform: scale(2.2); opacity: 0.7; }
          100% { transform: scale(3.4); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Prismatic Rainbow Pulse Ring -->
        <div style="position: absolute; width: 80px; height: 80px; border: 3px dashed #38bdf8; border-radius: 50%; box-shadow: 0 0 18px #facc15; animation: vttChaosPulse 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Prismatic Spiral Vortex -->
        <svg viewBox="0 0 64 64" width="86" height="86" style="position: absolute; animation: vttChaosVortex 0.88s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M32 6 C46 6 58 18 58 32 C58 46 46 58 32 58 C18 58 6 46 6 32" fill="none" stroke="#ec4899" stroke-width="4" stroke-linecap="round" />
          <path d="M32 14 C42 14 50 22 50 32 C50 42 42 50 32 50 C22 50 14 42 14 32" fill="none" stroke="#facc15" stroke-width="3" stroke-linecap="round" />
          <path d="M32 22 C38 22 42 26 42 32 C42 38 38 42 32 42 C26 42 22 38 22 32" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" />
          <circle cx="32" cy="32" r="6" fill="#4ade80" />
        </svg>
      </div>
    `,
    particles: {
      count: 36,
      colors: ["#ec4899", "#38bdf8", "#facc15", "#a855f7", "#4ade80", "#ff5722"],
      speedRange: [60, 180],
      sizeRangePx: [3, 6],
      gravity: 40,
      shape: "circle",
      lifeMs: 800
    }
  },



  time_warp: {
    id: "time_warp",
    durationMs: 900,
    renderSvg: () => `
      <style>
        @keyframes vttHourglass {
          0% { transform: scale(0.3) rotate(0deg); opacity: 0; }
          25% { transform: scale(1.3) rotate(180deg); opacity: 1; filter: drop-shadow(0 0 20px #facc15); }
          65% { transform: scale(1.15) rotate(360deg); opacity: 0.9; }
          100% { transform: scale(1.6) rotate(540deg); opacity: 0; filter: blur(8px); }
        }
        @keyframes vttTimeRing {
          0% { transform: scale(0.2); opacity: 1; border-width: 4px; }
          50% { transform: scale(2.2); opacity: 0.7; border-width: 2px; }
          100% { transform: scale(3.2); opacity: 0; border-width: 1px; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Chronurgy Time Rings -->
        <div style="position: absolute; width: 80px; height: 80px; border: 3px solid #facc15; border-radius: 50%; box-shadow: 0 0 16px #38bdf8; animation: vttTimeRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <div style="position: absolute; width: 80px; height: 80px; border: 2px dashed #38bdf8; border-radius: 50%; animation: vttTimeRing 0.88s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.12s; opacity: 0;"></div>
        <!-- Golden Chronometer Hourglass -->
        <svg viewBox="0 0 64 64" width="82" height="82" style="position: absolute; animation: vttHourglass 0.88s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <polygon points="18,10 46,10 32,32" fill="rgba(56, 189, 248, 0.4)" stroke="#facc15" stroke-width="2.5" />
          <polygon points="18,54 46,54 32,32" fill="rgba(250, 204, 21, 0.5)" stroke="#facc15" stroke-width="2.5" />
          <line x1="14" y1="10" x2="50" y2="10" stroke="#fbbf24" stroke-width="4" stroke-linecap="round" />
          <line x1="14" y1="54" x2="50" y2="54" stroke="#fbbf24" stroke-width="4" stroke-linecap="round" />
          <circle cx="32" cy="32" r="3" fill="#ffffff" />
        </svg>
      </div>
    `,
    particles: {
      count: 26,
      colors: ["#facc15", "#fbbf24", "#38bdf8", "#ffffff"],
      speedRange: [20, 70],
      sizeRangePx: [2, 5],
      gravity: 0, // Suspended in time
      shape: "sparkle",
      lifeMs: 850
    }
  },

  guidance_bless: {
    id: "guidance_bless",
    durationMs: 900,
    renderSvg: () => `
      <style>
        @keyframes vttHolyDove {
          0% { transform: translateY(-30px) scale(0.4); opacity: 0; }
          25% { transform: translateY(0px) scale(1.2); opacity: 1; filter: drop-shadow(0 0 18px #fef08a); }
          65% { transform: translateY(4px) scale(1.1); opacity: 0.95; }
          100% { transform: translateY(-15px) scale(1.4); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttBlessHalo {
          0% { transform: scale(0.2); opacity: 1; }
          50% { transform: scale(2.0); opacity: 0.8; }
          100% { transform: scale(3.2); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Expanding Benediction Halos -->
        <div style="position: absolute; width: 76px; height: 76px; border: 3px solid #fef08a; border-radius: 50%; box-shadow: 0 0 16px #facc15; animation: vttBlessHalo 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <div style="position: absolute; width: 76px; height: 76px; border: 2px dashed #38bdf8; border-radius: 50%; animation: vttBlessHalo 0.88s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.15s; opacity: 0;"></div>
        <!-- Holy Guidance Dove / Wings -->
        <svg viewBox="0 0 64 64" width="84" height="84" style="position: absolute; animation: vttHolyDove 0.88s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M32 14 C24 14 10 22 6 34 C14 30 22 32 30 24 C30 38 24 46 32 54 C40 46 34 38 34 24 C42 32 50 30 58 34 C54 22 40 14 32 14 Z" fill="#ffffff" stroke="#facc15" stroke-width="2" />
          <circle cx="32" cy="18" r="4" fill="#fef08a" stroke="#f59e0b" stroke-width="1.5" />
        </svg>
      </div>
    `,
    particles: {
      count: 30,
      colors: ["#fef08a", "#facc15", "#38bdf8", "#ffffff"],
      speedRange: [30, 90],
      sizeRangePx: [2, 6],
      gravity: 30, // Gentle benediction fall
      shape: "sparkle",
      lifeMs: 800
    }
  },

  hunters_mark: {
    id: "hunters_mark",
    durationMs: 800,
    renderSvg: () => `
      <style>
        @keyframes vttSniperReticle {
          0% { transform: scale(2.4) rotate(-45deg); opacity: 0; }
          25% { transform: scale(1.0) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 18px #ef4444); }
          65% { transform: scale(0.95) rotate(0deg); opacity: 0.95; }
          100% { transform: scale(1.3) rotate(15deg); opacity: 0; filter: blur(4px); }
        }
        @keyframes vttLockFlash {
          0% { transform: scale(0.1); opacity: 1; }
          30% { transform: scale(1.8); opacity: 0.8; }
          100% { transform: scale(2.6); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Target Lock Shock Ring -->
        <div style="position: absolute; width: 70px; height: 70px; border: 3px solid #ef4444; border-radius: 50%; box-shadow: 0 0 16px #facc15; animation: vttLockFlash 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.1s; opacity: 0;"></div>
        <!-- Hunter's Mark Sniper Crosshair -->
        <svg viewBox="0 0 64 64" width="86" height="86" style="position: absolute; animation: vttSniperReticle 0.78s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <circle cx="32" cy="32" r="22" fill="none" stroke="#ef4444" stroke-width="3" stroke-dasharray="10 6" />
          <circle cx="32" cy="32" r="14" fill="none" stroke="#38bdf8" stroke-width="2" />
          <circle cx="32" cy="32" r="4" fill="#facc15" />
          <line x1="32" y1="2" x2="32" y2="16" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />
          <line x1="32" y1="48" x2="32" y2="62" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />
          <line x1="2" y1="32" x2="16" y2="32" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />
          <line x1="48" y1="32" x2="62" y2="32" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />
        </svg>
      </div>
    `,
    particles: {
      count: 32,
      colors: ["#ef4444", "#facc15", "#38bdf8", "#ffffff"],
      speedRange: [80, 200],
      sizeRangePx: [2, 5],
      gravity: 0,
      shape: "sparkle",
      lifeMs: 650
    }
  },

  spore_cloud: {
    id: "spore_cloud",
    durationMs: 850,
    renderSvg: () => `
      <style>
        @keyframes vttToadstoolPop {
          0% { transform: translateY(40px) scale(0.3); opacity: 0; }
          25% { transform: translateY(0px) scale(1.25); opacity: 1; filter: drop-shadow(0 0 16px #c084fc); }
          65% { transform: translateY(-4px) scale(1.1); opacity: 0.9; }
          100% { transform: translateY(-16px) scale(1.4); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttSporePuff {
          0% { transform: scale(0.2); opacity: 0.9; }
          60% { transform: scale(2.2); opacity: 0.7; }
          100% { transform: scale(3.2); opacity: 0; filter: blur(8px); }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Bioluminescent Spore Puff Rings -->
        <div style="position: absolute; width: 78px; height: 78px; border: 3px solid #c084fc; border-radius: 50%; box-shadow: 0 0 16px #2dd4bf; animation: vttSporePuff 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <div style="position: absolute; width: 78px; height: 78px; border: 2px dashed #2dd4bf; border-radius: 50%; animation: vttSporePuff 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.15s; opacity: 0;"></div>
        <!-- Moss/Fungi Toadstool -->
        <svg viewBox="0 0 64 64" width="84" height="84" style="position: absolute; animation: vttToadstoolPop 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M26 38 L38 38 L40 56 L24 56 Z" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2" />
          <path d="M12 38 C12 20 22 10 32 10 C42 10 52 20 52 38 Z" fill="#9333ea" stroke="#c084fc" stroke-width="2" />
          <circle cx="24" cy="26" r="3.5" fill="#2dd4bf" />
          <circle cx="38" cy="22" r="4.5" fill="#e879f9" />
          <circle cx="44" cy="30" r="3" fill="#2dd4bf" />
          <circle cx="28" cy="18" r="2.5" fill="#f1f5f9" />
        </svg>
      </div>
    `,
    particles: {
      count: 36,
      colors: ["#c084fc", "#2dd4bf", "#e879f9", "#86efac"],
      speedRange: [20, 75],
      sizeRangePx: [2, 6],
      gravity: -40, // Bioluminescent moss spores drifting up
      shape: "circle",
      lifeMs: 850
    }
  },

  witch_hex: {
    id: "witch_hex",
    durationMs: 800,
    renderSvg: () => `
      <style>
        @keyframes vttHexOrb {
          0% { transform: scale(0.3) rotate(0deg); opacity: 0; }
          30% { transform: scale(1.35) rotate(180deg); opacity: 1; filter: drop-shadow(0 0 20px #a855f7); }
          70% { transform: scale(1.15) rotate(360deg); opacity: 0.9; }
          100% { transform: scale(1.6) rotate(540deg); opacity: 0; filter: blur(8px); }
        }
        @keyframes vttHexRunes {
          0% { transform: scale(0.2) rotate(45deg); opacity: 1; }
          60% { transform: scale(2.3) rotate(-45deg); opacity: 0.7; }
          100% { transform: scale(3.4) rotate(-90deg); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Hex Rune Circle -->
        <div style="position: absolute; width: 80px; height: 80px; border: 3px solid #10b981; border-radius: 50%; box-shadow: 0 0 18px #a855f7; animation: vttHexRunes 0.78s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Witchcraft Scrying Orb -->
        <svg viewBox="0 0 64 64" width="84" height="84" style="position: absolute; animation: vttHexOrb 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <circle cx="32" cy="32" r="18" fill="#3b0764" stroke="#a855f7" stroke-width="3" />
          <path d="M26 26 L38 38 M38 26 L26 38" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" />
          <circle cx="32" cy="32" r="6" fill="none" stroke="#e879f9" stroke-width="2" />
        </svg>
      </div>
    `,
    particles: {
      count: 30,
      colors: ["#a855f7", "#10b981", "#6b21a8", "#34d399"],
      speedRange: [50, 150],
      sizeRangePx: [2, 5],
      gravity: -20,
      shape: "sparkle",
      lifeMs: 750
    }
  },

  lantern_light: {
    id: "lantern_light",
    durationMs: 880,
    renderSvg: () => `
      <style>
        @keyframes vttLanternSwing {
          0% { transform: rotate(-25deg) scale(0.5); opacity: 0; transform-origin: top center; }
          30% { transform: rotate(12deg) scale(1.2); opacity: 1; filter: drop-shadow(0 0 22px #fbbf24); }
          65% { transform: rotate(-8deg) scale(1.1); opacity: 0.95; }
          100% { transform: rotate(0deg) scale(1.4); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttLanternGlow {
          0% { transform: scale(0.2); opacity: 1; }
          50% { transform: scale(2.4); opacity: 0.8; }
          100% { transform: scale(3.6); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Warm Expanding Ley Light Waves -->
        <div style="position: absolute; width: 84px; height: 84px; background: radial-gradient(circle, #fef08a 10%, #fbbf24 40%, transparent 80%); border-radius: 50%; animation: vttLanternGlow 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0;"></div>
        <!-- Rustic Briar Lantern -->
        <svg viewBox="0 0 64 64" width="86" height="86" style="position: absolute; animation: vttLanternSwing 0.88s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M28 8 L36 8 L36 14 L28 14 Z" fill="#78350f" />
          <path d="M22 14 L42 14 L46 22 L18 22 Z" fill="#92400e" stroke="#78350f" stroke-width="1.5" />
          <rect x="20" y="22" width="24" height="26" rx="3" fill="rgba(254, 240, 138, 0.85)" stroke="#d97706" stroke-width="2.5" />
          <path d="M18 48 L46 48 L42 56 L22 56 Z" fill="#92400e" stroke="#78350f" stroke-width="1.5" />
          <circle cx="32" cy="35" r="6" fill="#ffffff" filter="drop-shadow(0 0 8px #f59e0b)" />
        </svg>
      </div>
    `,
    particles: {
      count: 32,
      colors: ["#fbbf24", "#fef08a", "#f59e0b", "#fffbeb"],
      speedRange: [30, 80],
      sizeRangePx: [2, 6],
      gravity: -15, // Floating warm forest fireflies
      shape: "circle",
      lifeMs: 850
    }
  },

  spider_web: {
    id: "spider_web",
    durationMs: 800,
    renderSvg: () => `
      <style>
        @keyframes vttWebNet {
          0% { transform: scale(0.2) rotate(-30deg); opacity: 0; }
          25% { transform: scale(1.3) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 16px #cbd5e1); }
          65% { transform: scale(1.15) rotate(5deg); opacity: 0.9; }
          100% { transform: scale(1.5) rotate(10deg); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttWebShiver {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-3px, 2px); }
          40% { transform: translate(3px, -2px); }
          60% { transform: translate(-2px, -1px); }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Silvery Spider Web Net -->
        <svg viewBox="0 0 64 64" width="90" height="90" style="position: absolute; animation: vttWebNet 0.78s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <g style="animation: vttWebShiver 0.4s ease-in-out infinite;">
            <line x1="4" y1="4" x2="60" y2="60" stroke="#cbd5e1" stroke-width="2" />
            <line x1="60" y1="4" x2="4" y2="60" stroke="#cbd5e1" stroke-width="2" />
            <line x1="32" y1="2" x2="32" y2="62" stroke="#e2e8f0" stroke-width="2" />
            <line x1="2" y1="32" x2="62" y2="32" stroke="#e2e8f0" stroke-width="2" />
            <polygon points="32,12 52,32 32,52 12,32" fill="none" stroke="#94a3b8" stroke-width="1.5" />
            <polygon points="32,22 42,32 32,42 22,32" fill="none" stroke="#cbd5e1" stroke-width="1.5" />
          </g>
        </svg>
      </div>
    `,
    particles: {
      count: 28,
      colors: ["#e2e8f0", "#cbd5e1", "#ffffff", "#94a3b8"],
      speedRange: [60, 160],
      sizeRangePx: [2, 5],
      gravity: 50, // Dew drops sliding off silk
      shape: "splinter",
      lifeMs: 700
    }
  },

  potion_elixir: {
    id: "potion_elixir",
    durationMs: 820,
    renderSvg: () => `
      <style>
        @keyframes vttPotionRaise {
          0% { transform: translateY(30px) scale(0.4) rotate(-15deg); opacity: 0; }
          25% { transform: translateY(0px) scale(1.25) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 18px #ef4444); }
          65% { transform: translateY(-6px) scale(1.1) rotate(6deg); opacity: 0.95; }
          100% { transform: translateY(-20px) scale(1.4) rotate(12deg); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttElixirGlow {
          0% { transform: scale(0.2); opacity: 1; }
          50% { transform: scale(2.2); opacity: 0.8; }
          100% { transform: scale(3.4); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Ruby Healing Aura Ring -->
        <div style="position: absolute; width: 78px; height: 78px; border: 3px solid #ef4444; border-radius: 50%; box-shadow: 0 0 16px #facc15; animation: vttElixirGlow 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Potion / Goblet Vessel -->
        <svg viewBox="0 0 64 64" width="84" height="84" style="position: absolute; animation: vttPotionRaise 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M22 14 L42 14 L42 32 C42 42 34 50 32 50 C30 50 22 42 22 32 Z" fill="#ef4444" stroke="#facc15" stroke-width="2.5" />
          <path d="M20 12 L44 12 L44 16 L20 16 Z" fill="#fbbf24" />
          <line x1="32" y1="50" x2="32" y2="58" stroke="#facc15" stroke-width="3" />
          <line x1="24" y1="58" x2="40" y2="58" stroke="#facc15" stroke-width="3" stroke-linecap="round" />
          <circle cx="32" cy="30" r="5" fill="#ffffff" opacity="0.6" />
        </svg>
      </div>
    `,
    particles: {
      count: 34,
      colors: ["#ef4444", "#facc15", "#60a5fa", "#ffffff"],
      speedRange: [50, 140],
      sizeRangePx: [2, 6],
      gravity: -120, // Rising carbonated healing fizz
      shape: "circle",
      lifeMs: 750
    }
  },



  beast_shape: {
    id: "beast_shape",
    durationMs: 820,
    renderSvg: () => `
      <style>
        @keyframes vttBeastLeap {
          0% { transform: scale(0.4) translate(-20px, 20px) rotate(-15deg); opacity: 0; }
          25% { transform: scale(1.2) translate(0px, 0px) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 18px #10b981); }
          65% { transform: scale(1.1) translate(5px, -5px) rotate(5deg); opacity: 0.95; }
          100% { transform: scale(1.4) translate(15px, -15px) rotate(15deg); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttMoonRing {
          0% { transform: scale(0.2); opacity: 1; }
          60% { transform: scale(2.3); opacity: 0.7; }
          100% { transform: scale(3.3); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Moonlit Primal Ring -->
        <div style="position: absolute; width: 82px; height: 82px; border: 3px solid #10b981; border-radius: 50%; box-shadow: 0 0 18px #34d399; animation: vttMoonRing 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Beast / Wolf Silhouette -->
        <svg viewBox="0 0 64 64" width="86" height="86" style="position: absolute; animation: vttBeastLeap 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M14 46 L20 30 L16 18 L26 24 L36 20 L48 28 L54 24 L50 36 L44 48 L28 50 Z" fill="#065f46" stroke="#34d399" stroke-width="2" />
          <circle cx="38" cy="28" r="3" fill="#facc15" />
        </svg>
      </div>
    `,
    particles: {
      count: 32,
      colors: ["#10b981", "#34d399", "#e2e8f0", "#ffffff"],
      speedRange: [70, 180],
      sizeRangePx: [2, 5],
      gravity: -30,
      shape: "sparkle",
      lifeMs: 700
    }
  },

  fairy_glamour: {
    id: "fairy_glamour",
    durationMs: 850,
    renderSvg: () => `
      <style>
        @keyframes vttButterflyFlutter {
          0% { transform: scale(0.4) rotate(-20deg); opacity: 0; }
          25% { transform: scale(1.25) rotate(10deg); opacity: 1; filter: drop-shadow(0 0 18px #f472b6); }
          50% { transform: scale(1.1) rotate(-10deg); }
          75% { transform: scale(1.2) rotate(12deg); opacity: 0.9; }
          100% { transform: scale(1.5) rotate(-15deg); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttGlamourRing {
          0% { transform: scale(0.2); opacity: 1; }
          50% { transform: scale(2.2); opacity: 0.8; }
          100% { transform: scale(3.4); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Iridescent Glamour Rings -->
        <div style="position: absolute; width: 78px; height: 78px; border: 3px dashed #f472b6; border-radius: 50%; box-shadow: 0 0 16px #38bdf8; animation: vttGlamourRing 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Pixie / Fairy Butterfly Wings -->
        <svg viewBox="0 0 64 64" width="86" height="86" style="position: absolute; animation: vttButterflyFlutter 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M32 32 C18 12 6 22 14 36 C20 44 32 32 32 32 Z" fill="#f472b6" stroke="#facc15" stroke-width="2" opacity="0.9" />
          <path d="M32 32 C46 12 58 22 50 36 C44 44 32 32 32 32 Z" fill="#38bdf8" stroke="#facc15" stroke-width="2" opacity="0.9" />
          <path d="M32 32 C20 46 12 56 22 58 C30 58 32 32 32 32 Z" fill="#c084fc" opacity="0.8" />
          <path d="M32 32 C44 46 52 56 42 58 C34 58 32 32 32 32 Z" fill="#c084fc" opacity="0.8" />
          <line x1="32" y1="20" x2="32" y2="44" stroke="#facc15" stroke-width="2.5" stroke-linecap="round" />
        </svg>
      </div>
    `,
    particles: {
      count: 36,
      colors: ["#f472b6", "#38bdf8", "#facc15", "#c084fc", "#ffffff"],
      speedRange: [40, 120],
      sizeRangePx: [2, 6],
      gravity: 10,
      shape: "sparkle",
      lifeMs: 800
    }
  },



  campfire_rest: {
    id: "campfire_rest",
    durationMs: 880,
    renderSvg: () => `
      <style>
        @keyframes vttCampfireBurn {
          0% { transform: scale(0.4) translateY(20px); opacity: 0; }
          25% { transform: scale(1.25) translateY(0px); opacity: 1; filter: drop-shadow(0 0 20px #f97316); }
          65% { transform: scale(1.1) translateY(-3px); opacity: 0.95; }
          100% { transform: scale(1.4) translateY(-12px); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttSmokeRing {
          0% { transform: translateY(0px) scale(0.3); opacity: 0.8; }
          100% { transform: translateY(-50px) scale(2.6); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Rising Smoke Rings -->
        <div style="position: absolute; width: 50px; height: 30px; border: 3px solid #cbd5e1; border-radius: 50%; animation: vttSmokeRing 0.85s ease-out forwards; opacity: 0;"></div>
        <div style="position: absolute; width: 50px; height: 30px; border: 2px solid #94a3b8; border-radius: 50%; animation: vttSmokeRing 0.88s ease-out forwards; animation-delay: 0.15s; opacity: 0;"></div>
        <!-- Campfire Logs & Flames -->
        <svg viewBox="0 0 64 64" width="86" height="86" style="position: absolute; animation: vttCampfireBurn 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <!-- Logs -->
          <path d="M14 50 L50 38" stroke="#78350f" stroke-width="6" stroke-linecap="round" />
          <path d="M14 38 L50 50" stroke="#92400e" stroke-width="6" stroke-linecap="round" />
          <!-- Flame -->
          <path d="M32 14 C20 30 22 46 32 46 C42 46 44 30 32 14 Z" fill="#f97316" />
          <path d="M32 24 C26 34 26 44 32 44 C38 44 38 34 32 24 Z" fill="#fbbf24" />
          <circle cx="32" cy="38" r="4" fill="#ffffff" />
        </svg>
      </div>
    `,
    particles: {
      count: 32,
      colors: ["#f97316", "#fbbf24", "#94a3b8", "#cbd5e1"],
      speedRange: [30, 90],
      sizeRangePx: [2, 5],
      gravity: -80, // Cozy campfire sparks and smoke rising up
      shape: "sparkle",
      lifeMs: 850
    }
  },

  breggle_charge: {
    id: "breggle_charge",
    durationMs: 800,
    renderSvg: () => `
      <style>
        @keyframes vttBreggleRam {
          0% { transform: translateX(50px) scale(0.6) rotate(15deg); opacity: 0; }
          25% { transform: translateX(-12px) scale(1.3) rotate(-5deg); opacity: 1; filter: drop-shadow(0 0 20px #fbbf24); }
          50% { transform: translateX(0px) scale(1.15) rotate(0deg); opacity: 0.95; }
          100% { transform: translateX(-30px) scale(1.4) rotate(-10deg); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttHornImpactRing {
          0% { transform: scale(0.2); opacity: 1; border-width: 5px; }
          60% { transform: scale(2.4); opacity: 0.8; border-width: 2px; }
          100% { transform: scale(3.4); opacity: 0; border-width: 1px; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Horn Impact Ring -->
        <div style="position: absolute; width: 78px; height: 78px; border: 4px solid #fbbf24; border-radius: 50%; box-shadow: 0 0 18px #f59e0b; animation: vttHornImpactRing 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.15s; opacity: 0;"></div>
        <!-- Breggle / Goat Head & Horns -->
        <svg viewBox="0 0 64 64" width="86" height="86" style="position: absolute; animation: vttBreggleRam 0.78s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <!-- Noble Horns -->
          <path d="M22 28 C14 16 6 12 12 6 C20 4 28 14 30 24" fill="none" stroke="#e2e8f0" stroke-width="4.5" stroke-linecap="round" />
          <path d="M42 28 C50 16 58 12 52 6 C44 4 36 14 34 24" fill="none" stroke="#e2e8f0" stroke-width="4.5" stroke-linecap="round" />
          <!-- Head -->
          <polygon points="32,54 20,32 44,32" fill="#78350f" stroke="#92400e" stroke-width="2" />
          <!-- Beard -->
          <path d="M28 54 L32 62 L36 54 Z" fill="#e2e8f0" />
          <circle cx="26" cy="38" r="3" fill="#fbbf24" />
          <circle cx="38" cy="38" r="3" fill="#fbbf24" />
        </svg>
      </div>
    `,
    particles: {
      count: 30,
      colors: ["#fbbf24", "#e2e8f0", "#92400e", "#ffffff"],
      speedRange: [80, 200],
      sizeRangePx: [2, 5],
      gravity: 60, // Horn clash splinters falling
      shape: "splinter",
      lifeMs: 700
    }
  },

  grimalkin_shadow: {
    id: "grimalkin_shadow",
    durationMs: 850,
    renderSvg: () => `
      <style>
        @keyframes vttGrimalkinSmile {
          0% { transform: scale(0.3) rotate(-15deg); opacity: 0; }
          25% { transform: scale(1.3) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 20px #a855f7); }
          65% { transform: scale(1.15) rotate(5deg); opacity: 0.9; }
          100% { transform: scale(1.6) rotate(15deg); opacity: 0; filter: blur(8px); }
        }
        @keyframes vttCheshireFade {
          0% { transform: scale(0.2); opacity: 1; }
          60% { transform: scale(2.6); opacity: 0.7; }
          100% { transform: scale(3.6); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Dream Mist Ripple -->
        <div style="position: absolute; width: 80px; height: 80px; border: 3px dashed #a855f7; border-radius: 50%; box-shadow: 0 0 16px #c084fc; animation: vttCheshireFade 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Grimalkin Feline Silhouette & Eyes -->
        <svg viewBox="0 0 64 64" width="86" height="86" style="position: absolute; animation: vttGrimalkinSmile 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <!-- Ears & Head -->
          <path d="M14 18 L24 28 C28 26 36 26 40 28 L50 18 L46 36 C50 44 44 54 32 54 C20 54 14 44 18 36 Z" fill="#3b0764" stroke="#a855f7" stroke-width="2.5" />
          <!-- Slit Glowing Eyes -->
          <ellipse cx="24" cy="36" rx="4" ry="6" fill="#f59e0b" />
          <ellipse cx="40" cy="36" rx="4" ry="6" fill="#f59e0b" />
          <ellipse cx="24" cy="36" rx="1.5" ry="6" fill="#000000" />
          <ellipse cx="40" cy="36" rx="1.5" ry="6" fill="#000000" />
          <!-- Cheshire Smile -->
          <path d="M22 46 C28 52 36 52 42 46" fill="none" stroke="#facc15" stroke-width="2.5" stroke-linecap="round" />
        </svg>
      </div>
    `,
    particles: {
      count: 32,
      colors: ["#a855f7", "#f59e0b", "#6b21a8", "#c084fc"],
      speedRange: [30, 90],
      sizeRangePx: [2, 6],
      gravity: -20, // Swirling shadow glamour sparks
      shape: "sparkle",
      lifeMs: 800
    }
  },

  woodland_shrine: {
    id: "woodland_shrine",
    durationMs: 850,
    renderSvg: () => `
      <style>
        @keyframes vttShrineBell {
          0% { transform: rotate(-25deg) scale(0.4); opacity: 0; transform-origin: top center; }
          25% { transform: rotate(18deg) scale(1.25); opacity: 1; filter: drop-shadow(0 0 18px #facc15); }
          50% { transform: rotate(-12deg) scale(1.1); }
          75% { transform: rotate(8deg) scale(1.15); opacity: 0.95; }
          100% { transform: rotate(0deg) scale(1.4); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttHolyChimeRing {
          0% { transform: scale(0.2); opacity: 1; }
          50% { transform: scale(2.2); opacity: 0.8; }
          100% { transform: scale(3.4); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Sanctified Chime Waves -->
        <div style="position: absolute; width: 78px; height: 78px; border: 3px solid #fef08a; border-radius: 50%; box-shadow: 0 0 16px #facc15; animation: vttHolyChimeRing 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <div style="position: absolute; width: 78px; height: 78px; border: 2px dashed #38bdf8; border-radius: 50%; animation: vttHolyChimeRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.15s; opacity: 0;"></div>
        <!-- Monastery Bell of St. Sedge -->
        <svg viewBox="0 0 64 64" width="86" height="86" style="position: absolute; animation: vttShrineBell 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M32 6 L32 14 M20 14 L44 14 C48 14 52 24 52 40 L12 40 C12 24 16 14 20 14 Z" fill="#d97706" stroke="#fef08a" stroke-width="2" />
          <rect x="10" y="40" width="44" height="6" rx="3" fill="#fbbf24" stroke="#d97706" stroke-width="1.5" />
          <circle cx="32" cy="52" r="6" fill="#f59e0b" />
        </svg>
      </div>
    `,
    particles: {
      count: 32,
      colors: ["#fbbf24", "#fef08a", "#ffffff", "#38bdf8"],
      speedRange: [60, 160],
      sizeRangePx: [2, 5],
      gravity: 10,
      shape: "note",
      lifeMs: 750
    }
  },

  drune_wicker: {
    id: "drune_wicker",
    durationMs: 820,
    renderSvg: () => `
      <style>
        @keyframes vttDruneOwl {
          0% { transform: scale(0.3) rotate(-15deg); opacity: 0; }
          25% { transform: scale(1.3) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 20px #dc2626); }
          65% { transform: scale(1.12) rotate(5deg); opacity: 0.95; }
          100% { transform: scale(1.5) rotate(15deg); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttOccultBriarRing {
          0% { transform: scale(0.2) rotate(0deg); opacity: 1; }
          60% { transform: scale(2.4) rotate(120deg); opacity: 0.8; }
          100% { transform: scale(3.5) rotate(240deg); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Occult Wicker Circle -->
        <div style="position: absolute; width: 80px; height: 80px; border: 3px dashed #dc2626; border-radius: 50%; box-shadow: 0 0 16px #78350f; animation: vttOccultBriarRing 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Hooded Drune Owl Emblem -->
        <svg viewBox="0 0 64 64" width="86" height="86" style="position: absolute; animation: vttDruneOwl 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <!-- Wicker/Briar Frame -->
          <polygon points="32,6 56,52 8,52" fill="none" stroke="#78350f" stroke-width="3" stroke-dasharray="6 4" />
          <!-- Hooded Owl Head -->
          <path d="M20 24 L32 14 L44 24 C44 40 38 48 32 48 C26 48 20 40 20 24 Z" fill="#1e293b" stroke="#dc2626" stroke-width="2" />
          <circle cx="26" cy="30" r="4.5" fill="#dc2626" />
          <circle cx="38" cy="30" r="4.5" fill="#dc2626" />
          <circle cx="26" cy="30" r="1.5" fill="#facc15" />
          <circle cx="38" cy="30" r="1.5" fill="#facc15" />
          <polygon points="32,34 29,40 35,40" fill="#fbbf24" />
        </svg>
      </div>
    `,
    particles: {
      count: 34,
      colors: ["#dc2626", "#78350f", "#991b1b", "#fbbf24"],
      speedRange: [50, 150],
      sizeRangePx: [2, 6],
      gravity: 40,
      shape: "splinter",
      lifeMs: 750
    }
  },

  thrown_boomerang: {
    id: "thrown_boomerang",
    durationMs: 840,
    renderSvg: () => `
      <style>
        @keyframes vttBoomerangFlight {
          0% { transform: scale(0.4) rotate(0deg) translate(-40px, 20px); opacity: 0; }
          25% { transform: scale(1.25) rotate(180deg) translate(0px, -15px); opacity: 1; filter: drop-shadow(0 0 18px #10b981); }
          50% { transform: scale(1.1) rotate(360deg) translate(25px, 0px); opacity: 0.95; }
          75% { transform: scale(1.2) rotate(540deg) translate(0px, 15px); opacity: 0.9; }
          100% { transform: scale(1.4) rotate(720deg) translate(-30px, -10px); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttWindRing {
          0% { transform: scale(0.2); opacity: 1; }
          60% { transform: scale(2.4); opacity: 0.7; }
          100% { transform: scale(3.5); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Ricochet Wind Ring -->
        <div style="position: absolute; width: 78px; height: 78px; border: 3px dashed #10b981; border-radius: 50%; box-shadow: 0 0 16px #34d399; animation: vttWindRing 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Thrown Boomerang / Handaxe -->
        <svg viewBox="0 0 64 64" width="86" height="86" style="position: absolute; animation: vttBoomerangFlight 0.82s linear forwards;">
          <path d="M14 50 C26 38 38 26 50 14 C44 26 36 40 28 50 C22 48 16 48 14 50 Z" fill="#065f46" stroke="#34d399" stroke-width="2.5" />
          <path d="M42 22 L50 14 L38 24 Z" fill="#e2e8f0" stroke="#ffffff" stroke-width="1.5" />
          <circle cx="34" cy="30" r="3" fill="#facc15" />
        </svg>
      </div>
    `,
    particles: {
      count: 30,
      colors: ["#10b981", "#34d399", "#e2e8f0", "#ffffff"],
      speedRange: [60, 160],
      sizeRangePx: [2, 5],
      gravity: 0, // Zero gravity wind trail sparks
      shape: "splinter",
      lifeMs: 750
    }
  },

  rapier_flurry: {
    id: "rapier_flurry",
    durationMs: 780,
    renderSvg: () => `
      <style>
        @keyframes vttRapierLunge {
          0% { transform: scale(0.4) translate(-30px, 30px); opacity: 0; }
          25% { transform: scale(1.3) translate(10px, -10px); opacity: 1; filter: drop-shadow(0 0 18px #facc15); }
          45% { transform: scale(1.0) translate(-5px, 5px); }
          65% { transform: scale(1.25) translate(15px, -15px); opacity: 0.95; }
          100% { transform: scale(1.4) translate(25px, -25px); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttFlurryStars {
          0% { transform: scale(0.1) rotate(0deg); opacity: 1; }
          50% { transform: scale(2.2) rotate(45deg); opacity: 0.8; }
          100% { transform: scale(3.3) rotate(90deg); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Puncture Critical Hit Stars -->
        <div style="position: absolute; width: 76px; height: 76px; border: 3px solid #facc15; border-radius: 50%; box-shadow: 0 0 16px #38bdf8; animation: vttFlurryStars 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.1s; opacity: 0;"></div>
        <!-- Duelist Rapier & Basket Hilt -->
        <svg viewBox="0 0 64 64" width="88" height="88" style="position: absolute; animation: vttRapierLunge 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <!-- Hilt -->
          <circle cx="18" cy="46" r="8" fill="none" stroke="#f59e0b" stroke-width="3" />
          <path d="M12 52 L22 42" stroke="#78350f" stroke-width="4" stroke-linecap="round" />
          <!-- Needle Blade -->
          <line x1="22" y1="42" x2="56" y2="8" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round" filter="drop-shadow(0 0 4px #ffffff)" />
          <polygon points="58,6 50,12 54,16" fill="#facc15" />
          <circle cx="46" cy="18" r="3" fill="#38bdf8" />
        </svg>
      </div>
    `,
    particles: {
      count: 34,
      colors: ["#facc15", "#e2e8f0", "#ffffff", "#38bdf8"],
      speedRange: [90, 220],
      sizeRangePx: [2, 5],
      gravity: 20, // Precision needle sparks
      shape: "sparkle",
      lifeMs: 650
    }
  },

  camelot_crown: {
    id: "camelot_crown",
    durationMs: 840,
    renderSvg: () => `
      <style>
        @keyframes vttCrownDescend {
          0% { transform: translateY(-40px) scale(0.5); opacity: 0; }
          30% { transform: translateY(0px) scale(1.3); opacity: 1; filter: drop-shadow(0 0 22px #fbbf24); }
          65% { transform: translateY(-6px) scale(1.15); opacity: 0.95; }
          100% { transform: translateY(-18px) scale(1.4); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttCrownRings {
          0% { transform: scale(0.2); opacity: 1; }
          60% { transform: scale(2.3); opacity: 0.8; }
          100% { transform: scale(3.4); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Royal Sovereignty Ring -->
        <div style="position: absolute; width: 78px; height: 78px; border: 3px solid #fbbf24; border-radius: 50%; box-shadow: 0 0 18px #f59e0b; animation: vttCrownRings 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- High Crown of King Arthur -->
        <svg viewBox="0 0 64 64" width="88" height="88" style="position: absolute; animation: vttCrownDescend 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <!-- Crown Band & Peaks -->
          <path d="M12 44 L12 24 L24 34 L32 16 L40 34 L52 24 L52 44 Z" fill="#d97706" stroke="#fef08a" stroke-width="2.5" />
          <rect x="12" y="44" width="40" height="6" rx="2" fill="#b45309" stroke="#facc15" stroke-width="1.5" />
          <!-- Gemstones -->
          <circle cx="32" cy="16" r="3.5" fill="#ef4444" stroke="#ffffff" stroke-width="1" />
          <circle cx="12" cy="24" r="3" fill="#38bdf8" />
          <circle cx="52" cy="24" r="3" fill="#38bdf8" />
          <circle cx="32" cy="47" r="2.5" fill="#10b981" />
          <circle cx="22" cy="47" r="2.5" fill="#ef4444" />
          <circle cx="42" cy="47" r="2.5" fill="#ef4444" />
        </svg>
      </div>
    `,
    particles: {
      count: 34,
      colors: ["#fbbf24", "#ef4444", "#fef08a", "#ffffff"],
      speedRange: [60, 160],
      sizeRangePx: [2, 6],
      gravity: 50, // Royal gold and ruby glints falling
      shape: "sparkle",
      lifeMs: 800
    }
  },

  merlins_magic: {
    id: "merlins_magic",
    durationMs: 880,
    renderSvg: () => `
      <style>
        @keyframes vttMerlinWeave {
          0% { transform: scale(0.4) rotate(-30deg); opacity: 0; }
          30% { transform: scale(1.3) rotate(15deg); opacity: 1; filter: drop-shadow(0 0 24px #c084fc); }
          65% { transform: scale(1.15) rotate(0deg); opacity: 0.95; filter: drop-shadow(0 0 28px #38bdf8); }
          100% { transform: scale(1.4) rotate(30deg); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttProphecyVortex {
          0% { transform: scale(0.2) rotate(0deg); opacity: 1; }
          60% { transform: scale(2.4) rotate(180deg); opacity: 0.8; }
          100% { transform: scale(3.5) rotate(360deg); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Prophecy Starlight Vortex -->
        <div style="position: absolute; width: 80px; height: 80px; border: 3px dotted #c084fc; border-radius: 50%; box-shadow: 0 0 18px #38bdf8; animation: vttProphecyVortex 0.86s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Merlin's Staff & Dragon Orb -->
        <svg viewBox="0 0 64 64" width="88" height="88" style="position: absolute; animation: vttMerlinWeave 0.86s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M14 54 C24 44 32 34 38 24" stroke="#78350f" stroke-width="6" stroke-linecap="round" />
          <!-- Twisting Roots Top -->
          <path d="M38 24 C44 18 52 14 54 18 C56 22 46 28 38 24" fill="none" stroke="#92400e" stroke-width="4" stroke-linecap="round" />
          <!-- Glowing Amethyst Crystal Orb -->
          <circle cx="46" cy="18" r="8" fill="#c084fc" stroke="#38bdf8" stroke-width="2" filter="drop-shadow(0 0 10px #e0f2fe)" />
          <circle cx="44" cy="16" r="2.5" fill="#ffffff" />
          <!-- Arcane Runes -->
          <circle cx="22" cy="30" r="3" fill="#facc15" />
          <circle cx="54" cy="36" r="3" fill="#38bdf8" />
        </svg>
      </div>
    `,
    particles: {
      count: 36,
      colors: ["#c084fc", "#38bdf8", "#facc15", "#ffffff"],
      speedRange: [50, 160],
      sizeRangePx: [2, 6],
      gravity: -35, // Wizardry stardust orbiting upward
      shape: "sparkle",
      lifeMs: 880
    }
  },

  camelot_castle: {
    id: "camelot_castle",
    durationMs: 860,
    renderSvg: () => `
      <style>
        @keyframes vttCastleRise {
          0% { transform: translateY(40px) scale(0.5); opacity: 0; }
          25% { transform: translateY(0px) scale(1.25); opacity: 1; filter: drop-shadow(0 0 20px #facc15); }
          65% { transform: translateY(-4px) scale(1.15); opacity: 0.95; }
          100% { transform: translateY(-18px) scale(1.35); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttSunriseGlow {
          0% { transform: scale(0.2); opacity: 1; }
          60% { transform: scale(2.4); opacity: 0.8; }
          100% { transform: scale(3.5); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Sunrise Glory Ring -->
        <div style="position: absolute; width: 80px; height: 80px; border: 3px solid #facc15; border-radius: 50%; box-shadow: 0 0 18px #38bdf8; animation: vttSunriseGlow 0.84s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Camelot White Towers & Pennants -->
        <svg viewBox="0 0 64 64" width="88" height="88" style="position: absolute; animation: vttCastleRise 0.84s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <!-- Green Hill Base -->
          <path d="M6 56 C20 48 44 48 58 56 L58 60 L6 60 Z" fill="#15803d" />
          <!-- Main White Keep & Side Towers -->
          <rect x="24" y="24" width="16" height="32" fill="#f8fafc" stroke="#64748b" stroke-width="1.5" />
          <polygon points="22,24 32,10 42,24" fill="#38bdf8" stroke="#fbbf24" stroke-width="1.5" />
          <rect x="12" y="34" width="12" height="22" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5" />
          <polygon points="10,34 18,22 26,34" fill="#ef4444" stroke="#fbbf24" stroke-width="1.5" />
          <rect x="40" y="34" width="12" height="22" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5" />
          <polygon points="38,34 46,22 54,34" fill="#ef4444" stroke="#fbbf24" stroke-width="1.5" />
          <!-- Golden Gate & Banners -->
          <path d="M29 56 L29 44 C29 42 35 42 35 44 L35 56 Z" fill="#78350f" />
          <polygon points="32,10 38,12 32,14" fill="#ef4444" />
        </svg>
      </div>
    `,
    particles: {
      count: 34,
      colors: ["#fef08a", "#38bdf8", "#ef4444", "#ffffff"],
      speedRange: [40, 130],
      sizeRangePx: [2, 6],
      gravity: 15, // Golden sunlight rays and fluttering pennant embers
      shape: "splinter",
      lifeMs: 860
    }
  },

  meteor_storm: {
    id: "meteor_storm",
    durationMs: 840,
    renderSvg: () => `
      <style>
        @keyframes vttMeteorImpact {
          0% { transform: translate(-55px, -55px) scale(0.4) rotate(-45deg); opacity: 0; }
          25% { transform: translate(0px, 0px) scale(1.35) rotate(-45deg); opacity: 1; filter: drop-shadow(0 0 24px #f97316); }
          60% { transform: translate(8px, 8px) scale(1.15) rotate(-45deg); opacity: 0.95; }
          100% { transform: translate(25px, 25px) scale(1.4) rotate(-45deg); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttMeteorRing {
          0% { transform: scale(0.1); opacity: 1; border-width: 6px; }
          60% { transform: scale(2.5); opacity: 0.8; border-width: 2px; }
          100% { transform: scale(3.6); opacity: 0; border-width: 1px; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Fiery Crater Shockwave Ring -->
        <div style="position: absolute; width: 84px; height: 84px; border: 4px solid #f97316; border-radius: 50%; box-shadow: 0 0 20px #ef4444; animation: vttMeteorRing 0.78s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.12s; opacity: 0;"></div>
        <!-- Blazing Flaming Meteor Cluster -->
        <svg viewBox="0 0 64 64" width="94" height="94" style="position: absolute; animation: vttMeteorImpact 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <!-- Flame Trails -->
          <path d="M10 10 L34 34 M18 8 L40 30 M8 18 L30 40" stroke="#ea580c" stroke-width="4" stroke-linecap="round" filter="drop-shadow(0 0 6px #ef4444)" />
          <path d="M14 14 L34 34" stroke="#facc15" stroke-width="2" stroke-linecap="round" />
          <!-- Molten Core -->
          <circle cx="44" cy="44" r="14" fill="#991b1b" stroke="#f97316" stroke-width="2.5" />
          <circle cx="44" cy="44" r="9" fill="#f97316" />
          <circle cx="46" cy="42" r="5" fill="#facc15" />
          <circle cx="48" cy="40" r="2" fill="#ffffff" />
        </svg>
      </div>
    `,
    particles: {
      count: 38,
      colors: ["#f97316", "#ef4444", "#fbbf24", "#ffffff"],
      speedRange: [130, 300],
      sizeRangePx: [3, 8],
      gravity: 90,
      shape: "splinter",
      lifeMs: 800
    }
  },

  whirlwind_storm: {
    id: "whirlwind_storm",
    durationMs: 850,
    renderSvg: () => `
      <style>
        @keyframes vttWhirlwindSpin {
          0% { transform: scale(0.4) rotate(-360deg); opacity: 0; }
          30% { transform: scale(1.3) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 20px #38bdf8); }
          65% { transform: scale(1.15) rotate(360deg); opacity: 0.95; }
          100% { transform: scale(1.4) rotate(720deg); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttWindStormRing {
          0% { transform: scale(0.2); opacity: 1; }
          60% { transform: scale(2.4); opacity: 0.7; }
          100% { transform: scale(3.5); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Electric Wind Ring -->
        <div style="position: absolute; width: 80px; height: 80px; border: 3px dashed #38bdf8; border-radius: 50%; box-shadow: 0 0 16px #cbd5e1; animation: vttWindStormRing 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Spinning Tornado Cyclone -->
        <svg viewBox="0 0 64 64" width="90" height="90" style="position: absolute; animation: vttWhirlwindSpin 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <!-- Swirling Funnel Curves -->
          <path d="M12 16 C28 10 36 22 52 16 C40 28 24 20 16 32 C32 32 44 40 40 48 C28 44 20 54 32 58" fill="none" stroke="#94a3b8" stroke-width="4" stroke-linecap="round" />
          <path d="M16 20 C30 16 36 26 48 20 C36 32 26 26 20 36 C34 36 40 44 36 50" fill="none" stroke="#e2e8f0" stroke-width="2.5" stroke-linecap="round" />
          <!-- Lightning Bolts inside Funnel -->
          <polygon points="30,22 36,32 32,34 38,46 26,34 30,32" fill="#38bdf8" filter="drop-shadow(0 0 6px #ffffff)" />
        </svg>
      </div>
    `,
    particles: {
      count: 36,
      colors: ["#cbd5e1", "#38bdf8", "#f8fafc", "#ffffff"],
      speedRange: [100, 260],
      sizeRangePx: [2, 6],
      gravity: -25,
      shape: "splinter",
      lifeMs: 850
    }
  },

  black_hole_implosion: {
    id: "black_hole_implosion",
    durationMs: 860,
    renderSvg: () => `
      <style>
        @keyframes vttSingularity {
          0% { transform: scale(1.6) rotate(0deg); opacity: 0; }
          30% { transform: scale(0.7) rotate(180deg); opacity: 1; filter: drop-shadow(0 0 24px #a855f7); }
          65% { transform: scale(0.5) rotate(360deg); opacity: 0.95; filter: drop-shadow(0 0 32px #c084fc); }
          100% { transform: scale(1.5) rotate(540deg); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttAccretionRing {
          0% { transform: scale(2.4) rotate(0deg); opacity: 1; }
          50% { transform: scale(0.6) rotate(-180deg); opacity: 0.9; }
          100% { transform: scale(3.2) rotate(-360deg); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Accretion Warp Ring -->
        <svg viewBox="0 0 100 100" width="115" height="115" style="position: absolute; animation: vttAccretionRing 0.84s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <ellipse cx="50" cy="50" rx="44" ry="18" fill="none" stroke="#c084fc" stroke-width="4" stroke-dasharray="16 8" transform="rotate(-25 50 50)" />
          <ellipse cx="50" cy="50" rx="38" ry="14" fill="none" stroke="#38bdf8" stroke-width="2" transform="rotate(35 50 50)" />
        </svg>
        <!-- Dark Void Core -->
        <svg viewBox="0 0 64 64" width="88" height="88" style="position: absolute; animation: vttSingularity 0.84s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <circle cx="32" cy="32" r="24" fill="#1e1b4b" opacity="0.9" />
          <circle cx="32" cy="32" r="16" fill="#000000" stroke="#a855f7" stroke-width="3" filter="drop-shadow(0 0 12px #c084fc)" />
          <circle cx="32" cy="32" r="8" fill="#000000" stroke="#38bdf8" stroke-width="1.5" />
        </svg>
      </div>
    `,
    particles: {
      count: 36,
      colors: ["#a855f7", "#c084fc", "#38bdf8", "#ffffff"],
      speedRange: [110, 260],
      sizeRangePx: [2, 6],
      gravity: 0,
      shape: "sparkle",
      lifeMs: 860
    }
  },

  prismatic_spray: {
    id: "prismatic_spray",
    durationMs: 840,
    renderSvg: () => `
      <style>
        @keyframes vttPrismaticBurst {
          0% { transform: scale(0.3) rotate(0deg); opacity: 0; }
          25% { transform: scale(1.35) rotate(45deg); opacity: 1; filter: drop-shadow(0 0 24px #38bdf8); }
          60% { transform: scale(1.15) rotate(90deg); opacity: 0.95; filter: drop-shadow(0 0 28px #facc15); }
          100% { transform: scale(1.45) rotate(135deg); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttPrismaticRing {
          0% { transform: scale(0.2); opacity: 1; }
          60% { transform: scale(2.4); opacity: 0.85; }
          100% { transform: scale(3.5); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Rainbow Starburst Ring -->
        <div style="position: absolute; width: 82px; height: 82px; border: 3px solid #facc15; border-radius: 50%; box-shadow: 0 0 18px #ec4899; animation: vttPrismaticRing 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- 7-Color Prismatic Beams -->
        <svg viewBox="0 0 64 64" width="94" height="94" style="position: absolute; animation: vttPrismaticBurst 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <!-- 8 multi-color rays -->
          <line x1="32" y1="4" x2="32" y2="60" stroke="#ef4444" stroke-width="4" stroke-linecap="round" />
          <line x1="4" y1="32" x2="60" y2="32" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" />
          <line x1="12" y1="12" x2="52" y2="52" stroke="#facc15" stroke-width="3.5" stroke-linecap="round" />
          <line x1="12" y1="52" x2="52" y2="12" stroke="#22c55e" stroke-width="3.5" stroke-linecap="round" />
          <!-- Central Multi-Color Diamond -->
          <polygon points="32,18 46,32 32,46 18,32" fill="#a855f7" stroke="#ffffff" stroke-width="2" />
          <circle cx="32" cy="32" r="6" fill="#f97316" />
          <circle cx="32" cy="32" r="2.5" fill="#ffffff" />
        </svg>
      </div>
    `,
    particles: {
      count: 40,
      colors: ["#ef4444", "#facc15", "#22c55e", "#38bdf8", "#a855f7"],
      speedRange: [130, 290],
      sizeRangePx: [2, 7],
      gravity: 25,
      shape: "sparkle",
      lifeMs: 840
    }
  },

  solar_flare: {
    id: "solar_flare",
    durationMs: 800,
    renderSvg: () => `
      <style>
        @keyframes vttSolarFlareCore {
          0% { transform: scale(0.2); opacity: 0; }
          25% { transform: scale(1.35); opacity: 1; filter: drop-shadow(0 0 26px #facc15); }
          60% { transform: scale(1.15); opacity: 0.95; filter: drop-shadow(0 0 30px #f97316); }
          100% { transform: scale(1.45); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttSolarFlareRays {
          0% { transform: rotate(0deg) scale(0.4); opacity: 1; }
          50% { transform: rotate(45deg) scale(2.3); opacity: 0.85; }
          100% { transform: rotate(90deg) scale(3.4); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Expanding Blinding Sun Rays -->
        <svg viewBox="0 0 100 100" width="120" height="120" style="position: absolute; animation: vttSolarFlareRays 0.78s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <circle cx="50" cy="50" r="36" fill="none" stroke="#facc15" stroke-width="3" stroke-dasharray="12 8" />
          <path d="M50 4 L50 16 M50 84 L50 96 M4 50 L16 50 M84 50 L96 50 M18 18 L26 26 M74 74 L82 82 M18 82 L26 74 M74 26 L82 18" stroke="#fef08a" stroke-width="4" stroke-linecap="round" />
        </svg>
        <!-- Superheated Solar Core -->
        <svg viewBox="0 0 64 64" width="86" height="86" style="position: absolute; animation: vttSolarFlareCore 0.78s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <circle cx="32" cy="32" r="22" fill="#d97706" opacity="0.8" />
          <circle cx="32" cy="32" r="16" fill="#facc15" stroke="#fef08a" stroke-width="2" />
          <circle cx="32" cy="32" r="10" fill="#ffffff" filter="drop-shadow(0 0 8px #ffffff)" />
        </svg>
      </div>
    `,
    particles: {
      count: 38,
      colors: ["#facc15", "#fef08a", "#f97316", "#ffffff"],
      speedRange: [130, 290],
      sizeRangePx: [2, 7],
      gravity: 0,
      shape: "sparkle",
      lifeMs: 800
    }
  },

  magma_eruption: {
    id: "magma_eruption",
    durationMs: 840,
    renderSvg: () => `
      <style>
        @keyframes vttMagmaBurst {
          0% { transform: translateY(35px) scale(0.4); opacity: 0; }
          25% { transform: translateY(0px) scale(1.35); opacity: 1; filter: drop-shadow(0 0 24px #ef4444); }
          60% { transform: translateY(-6px) scale(1.15); opacity: 0.95; filter: drop-shadow(0 0 28px #f97316); }
          100% { transform: translateY(-20px) scale(1.4); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttVolcanoRing {
          0% { transform: scale(0.2); opacity: 1; border-width: 6px; }
          60% { transform: scale(2.4); opacity: 0.8; border-width: 2px; }
          100% { transform: scale(3.5); opacity: 0; border-width: 1px; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Lava Shockwave Ring -->
        <div style="position: absolute; width: 80px; height: 80px; border: 4px solid #ea580c; border-radius: 50%; box-shadow: 0 0 18px #dc2626; animation: vttVolcanoRing 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Erupting Volcanic Magma Cone & Lava Bombs -->
        <svg viewBox="0 0 64 64" width="92" height="92" style="position: absolute; animation: vttMagmaBurst 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <!-- Volcanic Cone Base -->
          <polygon points="6,56 58,56 42,30 22,30" fill="#451a03" stroke="#78350f" stroke-width="2" />
          <!-- Erupting Lava Column -->
          <path d="M26 30 C26 12 32 4 38 30" fill="none" stroke="#ef4444" stroke-width="8" stroke-linecap="round" filter="drop-shadow(0 0 10px #f97316)" />
          <path d="M28 30 C28 16 32 10 36 30" fill="none" stroke="#facc15" stroke-width="4" stroke-linecap="round" />
          <!-- Molten Lava Bombs -->
          <circle cx="16" cy="18" r="5" fill="#ef4444" stroke="#facc15" stroke-width="1" />
          <circle cx="48" cy="14" r="6" fill="#ea580c" stroke="#fef08a" stroke-width="1" />
          <circle cx="32" cy="8" r="4.5" fill="#facc15" />
        </svg>
      </div>
    `,
    particles: {
      count: 38,
      colors: ["#ef4444", "#ea580c", "#facc15", "#ffffff"],
      speedRange: [120, 280],
      sizeRangePx: [3, 8],
      gravity: 80,
      shape: "splinter",
      lifeMs: 840
    }
  },

  radiation_pulse: {
    id: "radiation_pulse",
    durationMs: 820,
    renderSvg: () => `
      <style>
        @keyframes vttRadiationPulse {
          0% { transform: scale(0.3) rotate(-30deg); opacity: 0; }
          25% { transform: scale(1.35) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 24px #84cc16); }
          60% { transform: scale(1.15) rotate(15deg); opacity: 0.95; }
          100% { transform: scale(1.45) rotate(30deg); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttRadiationRings {
          0% { transform: scale(0.2); opacity: 1; border-width: 5px; }
          60% { transform: scale(2.5); opacity: 0.85; border-width: 2px; }
          100% { transform: scale(3.6); opacity: 0; border-width: 1px; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Sickening Green Pulse Rings -->
        <div style="position: absolute; width: 84px; height: 84px; border: 3px solid #84cc16; border-radius: 50%; box-shadow: 0 0 20px #65a30d; animation: vttRadiationRings 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Hazard Radiation Trefoil Energy Burst -->
        <svg viewBox="0 0 64 64" width="90" height="90" style="position: absolute; animation: vttRadiationPulse 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <circle cx="32" cy="32" r="26" fill="#365314" opacity="0.8" stroke="#84cc16" stroke-width="2" />
          <!-- Trefoil blades -->
          <path d="M32 32 L32 10 A22 22 0 0 1 51 21 Z" fill="#84cc16" filter="drop-shadow(0 0 8px #bef264)" />
          <path d="M32 32 L51 43 A22 22 0 0 1 32 54 Z" fill="#84cc16" filter="drop-shadow(0 0 8px #bef264)" />
          <path d="M32 32 L13 43 A22 22 0 0 1 13 21 Z" fill="#84cc16" filter="drop-shadow(0 0 8px #bef264)" />
          <!-- Core circle -->
          <circle cx="32" cy="32" r="6" fill="#1a2e05" stroke="#bef264" stroke-width="2.5" />
          <circle cx="32" cy="32" r="2" fill="#ffffff" />
        </svg>
      </div>
    `,
    particles: {
      count: 36,
      colors: ["#84cc16", "#bef264", "#65a30d", "#ffffff"],
      speedRange: [110, 260],
      sizeRangePx: [2, 6],
      gravity: 0,
      shape: "circle",
      lifeMs: 820
    }
  },

  diamond_burst: {
    id: "diamond_burst",
    durationMs: 830,
    renderSvg: () => `
      <style>
        @keyframes vttDiamondDetonate {
          0% { transform: scale(0.3) rotate(-45deg); opacity: 0; }
          25% { transform: scale(1.35) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 24px #38bdf8); }
          60% { transform: scale(1.15) rotate(15deg); opacity: 0.95; filter: drop-shadow(0 0 28px #60a5fa); }
          100% { transform: scale(1.45) rotate(30deg); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttDiamondRing {
          0% { transform: scale(0.2); opacity: 1; }
          60% { transform: scale(2.4); opacity: 0.85; }
          100% { transform: scale(3.5); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Forcecage Diamond Shockwave -->
        <div style="position: absolute; width: 80px; height: 80px; border: 3px solid #60a5fa; border-radius: 12px; transform: rotate(45deg); box-shadow: 0 0 18px #3b82f6; animation: vttDiamondRing 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Crystalline Diamond Prism -->
        <svg viewBox="0 0 64 64" width="92" height="92" style="position: absolute; animation: vttDiamondDetonate 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <!-- Diamond Facets -->
          <polygon points="32,4 58,32 32,60 6,32" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2.5" />
          <polygon points="32,4 58,32 32,32" fill="#2563eb" opacity="0.8" />
          <polygon points="32,4 6,32 32,32" fill="#3b82f6" opacity="0.8" />
          <polygon points="32,60 58,32 32,32" fill="#1d4ed8" opacity="0.8" />
          <polygon points="32,60 6,32 32,32" fill="#1e40af" opacity="0.8" />
          <polygon points="32,16 46,32 32,48 18,32" fill="#93c5fd" stroke="#ffffff" stroke-width="1.5" filter="drop-shadow(0 0 8px #ffffff)" />
          <circle cx="32" cy="32" r="4" fill="#ffffff" />
        </svg>
      </div>
    `,
    particles: {
      count: 38,
      colors: ["#60a5fa", "#93c5fd", "#3b82f6", "#ffffff"],
      speedRange: [120, 280],
      sizeRangePx: [2, 7],
      gravity: 30,
      shape: "splinter",
      lifeMs: 830
    }
  },
  plasma_cannon: {
    id: "plasma_cannon",
    durationMs: 1500,
    renderSvg: () => `
      <style>
        @keyframes vttPlasmaPulse {
          0% { transform: scale(0.2); opacity: 1; }
          60% { transform: scale(2.2); opacity: 0.8; }
          100% { transform: scale(3.2); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <div style="position: absolute; width: 90px; height: 90px; border: 3px solid #00f2fe; border-radius: 50%; box-shadow: 0 0 20px #38bdf8, inset 0 0 15px #00f2fe; animation: vttPlasmaPulse 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
      </div>
    `,
    particles: {
      count: 55,
      colors: ["#00f2fe", "#38bdf8", "#e0f2fe", "#a855f7", "#ffffff"],
      speedRange: [180, 420],
      sizeRangePx: [4, 9],
      gravity: -10,
      shape: "sparkle",
      lifeMs: 1400
    }
  },
  soul_harvest: {
    id: "soul_harvest",
    durationMs: 1800,
    renderSvg: () => `
      <style>
        @keyframes vttSoulMist {
          0% { transform: scale(0.5); opacity: 0; }
          30% { transform: scale(1.2); opacity: 0.85; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <div style="position: absolute; width: 100px; height: 100px; border: 2px dashed #2dd4bf; border-radius: 50%; box-shadow: 0 0 25px #14b8a6; animation: vttSoulMist 1.6s ease-out forwards;"></div>
      </div>
    `,
    particles: {
      count: 60,
      colors: ["#2dd4bf", "#0d9488", "#5eead4", "#a855f7", "#ffffff"],
      speedRange: [60, 160],
      sizeRangePx: [5, 12],
      gravity: -120,
      shape: "ember",
      lifeMs: 1700
    }
  },
  void_collapse: {
    id: "void_collapse",
    durationMs: 2000,
    renderSvg: () => `
      <style>
        @keyframes vttVoidRing {
          0% { transform: scale(2.5) rotate(0deg); opacity: 0; }
          30% { transform: scale(1.4) rotate(120deg); opacity: 0.9; }
          100% { transform: scale(0.3) rotate(360deg); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <div style="position: absolute; width: 110px; height: 110px; border: 3px solid #c084fc; border-radius: 50%; box-shadow: 0 0 30px #581c87, inset 0 0 20px #000000; animation: vttVoidRing 1.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;"></div>
      </div>
    `,
    particles: {
      count: 65,
      colors: ["#c084fc", "#a855f7", "#ec4899", "#6366f1", "#ffffff"],
      speedRange: [30, 340],
      sizeRangePx: [3, 8],
      gravity: 0,
      shape: "sparkle",
      lifeMs: 1900
    }
  },
  pyroclastic_storm: {
    id: "pyroclastic_storm",
    durationMs: 1600,
    renderSvg: () => `
      <style>
        @keyframes vttPyroWave {
          0% { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(2.8); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <div style="position: absolute; width: 90px; height: 90px; border: 3px solid #f97316; border-radius: 50%; box-shadow: 0 0 24px #ef4444; animation: vttPyroWave 1.2s ease-out forwards;"></div>
      </div>
    `,
    particles: {
      count: 60,
      colors: ["#ef4444", "#f97316", "#fbbf24", "#7f1d1d", "#ffffff"],
      speedRange: [150, 390],
      sizeRangePx: [6, 14],
      gravity: 240,
      shape: "splinter",
      lifeMs: 1500
    }
  },
  fae_symphony: {
    id: "fae_symphony",
    durationMs: 1700,
    renderSvg: () => `
      <style>
        @keyframes vttFaeGlow {
          0% { transform: scale(0.6); opacity: 0; }
          40% { transform: scale(1.3); opacity: 0.85; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <div style="position: absolute; width: 95px; height: 95px; border: 2px solid #facc15; border-radius: 50%; box-shadow: 0 0 20px #4ade80; animation: vttFaeGlow 1.5s ease-in-out forwards;"></div>
      </div>
    `,
    particles: {
      count: 45,
      colors: ["#facc15", "#4ade80", "#f472b6", "#38bdf8", "#ffffff"],
      speedRange: [50, 170],
      sizeRangePx: [6, 11],
      gravity: -60,
      shape: "note",
      lifeMs: 1600
    }
  },
  frost_nova: {
    id: "frost_nova",
    durationMs: 1400,
    renderSvg: () => `
      <style>
        @keyframes vttFrostShock {
          0% { transform: scale(0.2); opacity: 1; }
          70% { transform: scale(2.4); opacity: 0.9; }
          100% { transform: scale(3.2); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <div style="position: absolute; width: 85px; height: 85px; border: 3px solid #7dd3fc; border-radius: 50%; box-shadow: 0 0 22px #38bdf8; animation: vttFrostShock 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
      </div>
    `,
    particles: {
      count: 65,
      colors: ["#e0f2fe", "#7dd3fc", "#38bdf8", "#0284c7", "#ffffff"],
      speedRange: [160, 410],
      sizeRangePx: [5, 12],
      gravity: 100,
      shape: "splinter",
      lifeMs: 1300
    }
  },
  alchemical_blaze: {
    id: "alchemical_blaze",
    durationMs: 1500,
    renderSvg: () => `
      <style>
        @keyframes vttAcidBurst {
          0% { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(2.6); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <div style="position: absolute; width: 88px; height: 88px; border: 3px dashed #84cc16; border-radius: 50%; box-shadow: 0 0 20px #eab308; animation: vttAcidBurst 1.2s ease-out forwards;"></div>
      </div>
    `,
    particles: {
      count: 60,
      colors: ["#84cc16", "#eab308", "#a3e635", "#22c55e", "#facc15"],
      speedRange: [110, 320],
      sizeRangePx: [4, 12],
      gravity: 50,
      shape: "circle",
      lifeMs: 1400
    }
  },
  celestial_judgment: {
    id: "celestial_judgment",
    durationMs: 1900,
    renderSvg: () => `
      <style>
        @keyframes vttHolyStarfall {
          0% { transform: scale(0.4); opacity: 0; }
          30% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(2.8); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <div style="position: absolute; width: 105px; height: 105px; border: 2px solid #facc15; border-radius: 50%; box-shadow: 0 0 30px #f59e0b, inset 0 0 15px #fef08a; animation: vttHolyStarfall 1.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
      </div>
    `,
    particles: {
      count: 70,
      colors: ["#fef08a", "#facc15", "#f59e0b", "#ffffff", "#fed7aa"],
      speedRange: [120, 360],
      sizeRangePx: [5, 12],
      gravity: -30,
      shape: "sparkle",
      lifeMs: 1800
    }
  }
};
