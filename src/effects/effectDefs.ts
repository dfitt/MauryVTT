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
  if (icon.includes("🪓") || icon.includes("M14 50 L50 14") || icon.includes("massive_axe")) return "massive_axe";
  if (icon.includes("🛡️") || icon.includes("arcane_shield")) return "arcane_shield";
  if (icon.includes("❄️") || icon.includes("🧊") || icon.includes("ice_spike")) return "ice_spike";
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

  massive_axe: {
    id: "massive_axe",
    durationMs: 850,
    renderSvg: () => `
      <style>
        @keyframes vttAxeSlam {
          0% { transform: translate(60%, -140%) rotate(-75deg) scale(1.4); opacity: 0; }
          15% { opacity: 1; }
          35% { transform: translate(0%, 10%) rotate(15deg) scale(1.55); opacity: 1; filter: drop-shadow(0 4px 14px rgba(0,0,0,0.9)); }
          75% { transform: translate(0%, 10%) rotate(15deg) scale(1.55); opacity: 1; filter: drop-shadow(0 4px 14px rgba(0,0,0,0.9)); }
          100% { transform: translate(0%, 10%) rotate(15deg) scale(1.2); opacity: 0; }
        }
        @keyframes vttAxeShock {
          0% { transform: scaleX(0.1) scaleY(0.4); opacity: 1; }
          40% { transform: scaleX(2.2) scaleY(1.3); opacity: 0.85; }
          100% { transform: scaleX(3.4) scaleY(1.6); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Ground Slam Shockwave -->
        <div style="position: absolute; width: 90px; height: 36px; border: 4px solid #f59e0b; border-radius: 50%; box-shadow: 0 0 16px #78350f; animation: vttAxeShock 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.28s; opacity: 0;"></div>
        <!-- Double-Sided Barbarian Battleaxe SVG -->
        <svg viewBox="0 0 64 64" width="96" height="96" style="position: absolute; animation: vttAxeSlam 0.82s cubic-bezier(0.25, 1, 0.5, 1) forwards;">
          <!-- Central Haft / Handle -->
          <path d="M12 52 L52 12" stroke="#78350f" stroke-width="4.5" stroke-linecap="round" />
          <path d="M14 50 L50 14" stroke="#92400e" stroke-width="2" stroke-linecap="round" />
          <!-- Right Symmetrical Barbarian Crescent Blade -->
          <path d="M38 12 L56 22 C62 14 62 6 56 0 C50 -6 42 -6 38 12 Z" fill="#94a3b8" stroke="#475569" stroke-width="1.5" />
          <path d="M42 16 L50 24 C54 18 54 12 50 8 C46 4 42 8 42 16 Z" fill="#e2e8f0" />
          <!-- Left Symmetrical Barbarian Crescent Blade -->
          <path d="M26 24 L44 42 C52 48 52 56 44 62 C36 68 28 68 26 52 Z" fill="#94a3b8" stroke="#475569" stroke-width="1.5" />
          <path d="M30 28 L38 36 C42 40 42 46 38 50 C34 54 30 50 30 42 Z" fill="#e2e8f0" />
          <!-- Central Haft Binding -->
          <circle cx="32" cy="32" r="4.5" fill="#f59e0b" stroke="#78350f" stroke-width="1" />
        </svg>
      </div>
    `,
    particles: {
      count: 24,
      colors: ["#94a3b8", "#64748b", "#cbd5e1", "#78350f", "#f59e0b"],
      speedRange: [60, 160],
      sizeRangePx: [3, 6],
      gravity: 220,
      shape: "splinter",
      lifeMs: 550
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
  }
};
