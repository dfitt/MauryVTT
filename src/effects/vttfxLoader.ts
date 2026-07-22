import { registerEffect, ParticleConfig } from "./effectDefs.js";
import { registerCustomRollIcon } from "../ui/rollIcons.js";

export interface VttfxEffectItem {
  id: string;
  name: string;
  iconSvg?: string;
  durationMs: number;
  effectSvg: string;
  particles?: ParticleConfig;
  isCondition?: boolean;
}

export interface VttfxBundle {
  version: string;
  bundleName: string;
  effects: VttfxEffectItem[];
  isCondition?: boolean;
}

export function registerEffectFromVttfxItem(item: VttfxEffectItem): void {
  registerEffect({
    id: item.id,
    durationMs: item.durationMs,
    renderSvg: () => item.effectSvg,
    particles: item.particles,
    name: item.name,
    iconSvg: item.iconSvg,
    isCondition: item.isCondition
  });
  if (item.iconSvg && !item.isCondition) {
    registerCustomRollIcon(item.id, item.name, item.iconSvg);
  }
}

export function loadVttfxBundleFromBundle(bundle: VttfxBundle): void {
  if (!bundle || !Array.isArray(bundle.effects)) {
    console.warn("Invalid VttfxBundle provided.");
    return;
  }
  const isBundleCondition = bundle.isCondition || (bundle.bundleName && bundle.bundleName.startsWith("Condition:"));
  for (const item of bundle.effects) {
    if (isBundleCondition) {
      item.isCondition = true;
    }
    registerEffectFromVttfxItem(item);
  }
  console.log(`Loaded VTTFX Bundle '${bundle.bundleName}' (${bundle.effects.length} effects).`);
}

export async function loadVttfxBundleFromUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const bundle: VttfxBundle = await res.json();
    loadVttfxBundleFromBundle(bundle);
    return true;
  } catch (err) {
    console.error(`Failed to load VTTFX bundle from ${url}:`, err);
    return false;
  }
}

export function loadVttfxBundleFromText(jsonText: string): boolean {
  try {
    const bundle: VttfxBundle = JSON.parse(jsonText);
    loadVttfxBundleFromBundle(bundle);
    return true;
  } catch (err) {
    console.error("Failed to parse VTTFX JSON text:", err);
    return false;
  }
}

export async function loadVttfxManifestFromUrl(manifestUrl: string = "vttfx/manifest.json"): Promise<void> {
  try {
    const res = await fetch(manifestUrl);
    if (!res.ok) {
      await loadVttfxBundleFromUrl("vttfx/core.vttfx");
      return;
    }
    const manifest = await res.json();
    if (manifest && Array.isArray(manifest.bundles)) {
      for (const bundleName of manifest.bundles) {
        await loadVttfxBundleFromUrl(`vttfx/${bundleName}`);
      }
    } else {
      await loadVttfxBundleFromUrl("vttfx/core.vttfx");
    }
  } catch (err) {
    console.warn(`Could not load VTTFX manifest from ${manifestUrl}, falling back to core.vttfx:`, err);
    await loadVttfxBundleFromUrl("vttfx/core.vttfx");
  }
}

// Expose globally for runtime debugging and easy plugin drag-and-drop or console loading
if (typeof window !== "undefined") {
  (window as any).VTTFX = {
    loadFromUrl: loadVttfxBundleFromUrl,
    loadFromText: loadVttfxBundleFromText,
    loadFromBundle: loadVttfxBundleFromBundle,
    loadFromManifest: loadVttfxManifestFromUrl
  };
}

