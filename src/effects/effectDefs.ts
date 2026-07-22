import { ConditionData } from "../types/vtt.js";

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
  name?: string;
  iconSvg?: string;
  isCondition?: boolean;
  conditionData?: ConditionData;
}

export const EFFECT_REGISTRY: Record<string, VttEffectDefinition> = {};

export function registerEffect(def: VttEffectDefinition): void {
  EFFECT_REGISTRY[def.id] = def;
}

export function registerCondition(data: ConditionData): void {
  const particles: ParticleConfig = {
    count: data.animation?.count || 25,
    colors: data.animation?.colors || ["#38bdf8", "#c084fc"],
    speedRange: data.animation?.speedRange || [20, 60],
    sizeRangePx: data.animation?.sizeRangePx || [3, 7],
    gravity: data.animation?.gravity || 0,
    shape: data.animation?.shape || "sparkle",
    lifeMs: data.animation?.lifeMs || 1400
  };

  registerEffect({
    id: data.id,
    durationMs: data.durationMs || 2000,
    renderSvg: () => data.animation?.effectSvg || (data as any).effectSvg || "",
    particles,
    name: data.name,
    iconSvg: data.iconSvg,
    isCondition: true,
    conditionData: data
  });
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
  for (const key of Object.keys(EFFECT_REGISTRY)) {
    const def = EFFECT_REGISTRY[key];
    if (def && ((def.iconSvg && icon.includes(def.iconSvg)) || icon.includes(key))) {
      return key;
    }
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
