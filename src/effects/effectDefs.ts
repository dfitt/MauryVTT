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
  if (icon.includes("⚔️")) return "sword_slash";
  if (icon.includes("🏹")) return "arrow_hit";
  if (icon.includes("🔥")) return "fireball_explosion";
  if (icon.includes("✨") || icon.includes("💖")) return "pink_sparkles";
  if (icon.includes("🗡️")) return "dagger_twirl";
  if (icon.includes("☀️") || icon.includes("✝️")) return "holy_healing";
  if (icon.includes("📿") || icon.includes("🧿") || icon.includes("⚰️")) return "turn_undead";
  if (icon.includes("🪕") || icon.includes("circle cx=\"26\" cy=\"42\" r=\"16\" fill=\"#92400e\"") || icon.includes("🎸") || icon.includes("🪈")) return "lute_music";
  if (icon.includes("⚡")) return "lightning_strikes";
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
  if (icon.includes("📯") || icon.includes("📢") || icon.includes("thunder_wave")) return "thunder_wave";
  if (icon.includes("🐺") || icon.includes("beast_shape")) return "beast_shape";
  if (icon.includes("🦋") || icon.includes("🧚") || icon.includes("fairy_glamour")) return "fairy_glamour";
  if (icon.includes("🗿") || icon.includes("🪨") || icon.includes("rune_ward")) return "rune_ward";
  if (icon.includes("🪵") || icon.includes("campfire_rest")) return "campfire_rest";
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

  thunder_wave: {
    id: "thunder_wave",
    durationMs: 800,
    renderSvg: () => `
      <style>
        @keyframes vttHornBlast {
          0% { transform: scale(0.4) rotate(-30deg); opacity: 0; }
          25% { transform: scale(1.25) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 20px #38bdf8); }
          65% { transform: scale(1.1) rotate(5deg); opacity: 0.95; }
          100% { transform: scale(1.4) rotate(15deg); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttSonicRipple {
          0% { transform: scale(0.1); opacity: 1; border-width: 5px; }
          60% { transform: scale(2.6); opacity: 0.8; border-width: 2px; }
          100% { transform: scale(3.8); opacity: 0; border-width: 1px; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Concussive Sonic Shockwaves -->
        <div style="position: absolute; width: 80px; height: 80px; border: 4px solid #38bdf8; border-radius: 50%; box-shadow: 0 0 18px #0284c7; animation: vttSonicRipple 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <div style="position: absolute; width: 80px; height: 80px; border: 3px solid #bae6fd; border-radius: 50%; animation: vttSonicRipple 0.78s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.12s; opacity: 0;"></div>
        <!-- Hunting Horn / Sonic Blast -->
        <svg viewBox="0 0 64 64" width="86" height="86" style="position: absolute; animation: vttHornBlast 0.78s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <path d="M14 42 C14 26 28 16 44 16 L54 12 C54 22 46 28 44 28 C34 28 26 34 26 42 C26 48 30 52 36 52" fill="none" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" />
          <polygon points="50,10 58,6 58,22 50,18" fill="#fbbf24" stroke="#d97706" stroke-width="1.5" />
          <circle cx="14" cy="42" r="4" fill="#78350f" />
        </svg>
      </div>
    `,
    particles: {
      count: 30,
      colors: ["#38bdf8", "#bae6fd", "#ffffff", "#0284c7"],
      speedRange: [100, 230],
      sizeRangePx: [2, 5],
      gravity: 0,
      shape: "note",
      lifeMs: 650
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

  rune_ward: {
    id: "rune_ward",
    durationMs: 850,
    renderSvg: () => `
      <style>
        @keyframes vttMegalithRaise {
          0% { transform: translateY(40px) scale(0.4); opacity: 0; }
          25% { transform: translateY(0px) scale(1.2); opacity: 1; filter: drop-shadow(0 0 18px #38bdf8); }
          65% { transform: translateY(-4px) scale(1.1); opacity: 0.95; }
          100% { transform: translateY(-16px) scale(1.4); opacity: 0; filter: blur(6px); }
        }
        @keyframes vttRunePulse {
          0% { transform: scale(0.2) rotate(0deg); opacity: 1; }
          60% { transform: scale(2.4) rotate(90deg); opacity: 0.8; }
          100% { transform: scale(3.5) rotate(180deg); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Ley Line Rune Circle -->
        <div style="position: absolute; width: 80px; height: 80px; border: 3px solid #38bdf8; border-radius: 50%; box-shadow: 0 0 16px #f59e0b; animation: vttRunePulse 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Ancient Standing Megalith Stone -->
        <svg viewBox="0 0 64 64" width="84" height="84" style="position: absolute; animation: vttMegalithRaise 0.82s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <polygon points="20,12 44,12 48,54 16,54" fill="#475569" stroke="#94a3b8" stroke-width="2" />
          <!-- Glowing Cyan Rune -->
          <path d="M32 20 L32 46 M24 28 L40 28 M26 38 L38 38" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" filter="drop-shadow(0 0 6px #38bdf8)" />
          <circle cx="32" cy="20" r="3" fill="#facc15" />
        </svg>
      </div>
    `,
    particles: {
      count: 30,
      colors: ["#38bdf8", "#f59e0b", "#64748b", "#cbd5e1"],
      speedRange: [50, 140],
      sizeRangePx: [2, 5],
      gravity: 40,
      shape: "splinter",
      lifeMs: 750
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
  }
};
