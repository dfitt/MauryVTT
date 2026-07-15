export interface ParticleConfig {
  count: number;
  colors: string[];
  speedRange: [number, number]; // px per second
  sizeRangePx: [number, number];
  gravity: number; // px per second^2 (negative for rising, positive for falling)
  shape: "circle" | "sparkle" | "ember" | "splinter";
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
  return null;
}

export const EFFECT_REGISTRY: Record<string, VttEffectDefinition> = {
  sword_slash: {
    id: "sword_slash",
    durationMs: 800,
    renderSvg: () => `
      <style>
        @keyframes vttSwordSlash {
          0% { transform: translate(120%, -120%) rotate(-45deg) scale(0.8); opacity: 0; }
          30% { transform: translate(0%, 0%) rotate(-135deg) scale(1.3); opacity: 1; }
          70% { transform: translate(-120%, 120%) rotate(-180deg) scale(1.1); opacity: 0.8; }
          100% { transform: translate(-150%, 150%) rotate(-200deg) scale(0.5); opacity: 0; }
        }
        @keyframes vttSlashCutLine {
          0% { transform: scaleX(0) rotate(-45deg); opacity: 0; }
          35% { transform: scaleX(1.4) rotate(-45deg); opacity: 1; }
          80% { transform: scaleX(1.8) rotate(-45deg); opacity: 0; }
          100% { transform: scaleX(2) rotate(-45deg); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Diagonal Glowing Cut Line -->
        <div style="position: absolute; width: 180%; height: 4px; background: linear-gradient(90deg, transparent, #ffffff, #38bdf8, transparent); box-shadow: 0 0 12px #38bdf8, 0 0 24px #ffffff; animation: vttSlashCutLine 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
        <!-- Sweeping Sword SVG -->
        <svg viewBox="0 0 64 64" width="84" height="84" style="animation: vttSwordSlash 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards; filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.8));">
          <path d="M54 10 L14 50 L10 54 L6 50 L10 46 L50 6 Z" fill="url(#swordGrad)" stroke="#ffffff" stroke-width="1.5" />
          <path d="M14 50 L6 58 L10 62 L18 54 Z" fill="#64748b" />
          <circle cx="8" cy="60" r="3" fill="#fbbf24" />
          <defs>
            <linearGradient id="swordGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" />
              <stop offset="50%" stop-color="#38bdf8" />
              <stop offset="100%" stop-color="#0284c7" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,
    particles: {
      count: 18,
      colors: ["#ffffff", "#38bdf8", "#7dd3fc", "#e0f2fe"],
      speedRange: [70, 160],
      sizeRangePx: [2, 5],
      gravity: 140,
      shape: "sparkle",
      spreadAngleRange: [Math.PI * 0.1, Math.PI * 0.9],
      lifeMs: 550
    }
  },

  arrow_hit: {
    id: "arrow_hit",
    durationMs: 750,
    renderSvg: () => `
      <style>
        @keyframes vttArrowZoom {
          0% { transform: translate(180%, -180%) rotate(-45deg) scale(2.2); opacity: 0; }
          25% { transform: translate(0%, 0%) rotate(-45deg) scale(1); opacity: 1; }
          45% { transform: translate(-4%, 4%) rotate(-55deg) scale(1); opacity: 1; }
          65% { transform: translate(2%, -2%) rotate(-38deg) scale(1); opacity: 1; }
          85% { transform: translate(0%, 0%) rotate(-45deg) scale(1); opacity: 0.9; }
          100% { transform: translate(0%, 0%) rotate(-45deg) scale(1); opacity: 0; }
        }
        @keyframes vttArrowRing {
          0% { transform: scale(0.2); opacity: 1; }
          40% { transform: scale(1.6); opacity: 0.8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Impact Ring -->
        <div style="position: absolute; width: 60px; height: 60px; border: 3px solid #f59e0b; border-radius: 50%; animation: vttArrowRing 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.18s; opacity: 0;"></div>
        <!-- Arrow SVG -->
        <svg viewBox="0 0 64 64" width="76" height="76" style="animation: vttArrowZoom 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6));">
          <path d="M58 6 L20 44 L16 48 L12 44 L16 40 L54 2 Z" fill="#d97706" stroke="#78350f" stroke-width="1.5" />
          <path d="M58 6 L58 18 L50 14 L46 6 Z" fill="#ef4444" />
          <path d="M58 6 L46 6 L50 14 L58 18 Z" fill="#dc2626" />
          <path d="M16 48 L6 58 L10 62 L20 52 Z" fill="#94a3b8" />
        </svg>
      </div>
    `,
    particles: {
      count: 14,
      colors: ["#d97706", "#b45309", "#92400e", "#fef3c7", "#f59e0b"],
      speedRange: [50, 130],
      sizeRangePx: [2, 4],
      gravity: 200,
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
          0% { transform: scale(0.1); opacity: 1; }
          40% { transform: scale(1.8); opacity: 1; filter: blur(0px); }
          80% { transform: scale(2.4); opacity: 0.6; filter: blur(4px); }
          100% { transform: scale(3); opacity: 0; filter: blur(8px); }
        }
        @keyframes vttShockwave {
          0% { transform: scale(0.3); opacity: 1; border-width: 8px; }
          60% { transform: scale(2.2); opacity: 0.7; border-width: 3px; }
          100% { transform: scale(3.2); opacity: 0; border-width: 1px; }
        }
      </style>
      <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Expanding Shockwave -->
        <div style="position: absolute; width: 70px; height: 70px; border: 6px solid #f97316; border-radius: 50%; box-shadow: 0 0 20px #ef4444, inset 0 0 20px #eab308; animation: vttShockwave 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;"></div>
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
  }
};
