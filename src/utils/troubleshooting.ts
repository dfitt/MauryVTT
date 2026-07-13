import { docStore } from "../state/documentStore.js";
import { assetStore } from "../state/idbAssetStore.js";
import { sessionManager } from "../network/sessionManager.js";
import { ImageEntity, TokenEntity } from "../types/vtt.js";

declare global {
  interface Window {
    __vttTroubleshootAssets?: () => Promise<any>;
  }
}

export function registerTroubleshootingUtilities(): void {
  window.__vttTroubleshootAssets = async () => {
    console.group("=== [Maury VTT] Troubleshooting Asset & Image Diagnostics ===");
    const doc = docStore.getDocument();
    const manifestHashes = Object.keys(doc.assetManifest);
    const entityHashes = new Set<string>();

    for (const ent of Object.values(doc.entities)) {
      if (ent.type === "image" || ent.type === "token") {
        entityHashes.add((ent as ImageEntity | TokenEntity).assetHash);
      }
    }

    const allHashes = Array.from(new Set([...manifestHashes, ...entityHashes]));
    console.log(`Total Unique Assets referenced in document: ${allHashes.length}`);
    console.log(`Manifest entries: ${manifestHashes.length}, Image/Token Entities: ${entityHashes.size}`);

    const report: Array<{
      assetHash: string;
      inManifest: boolean;
      inIDBStore: boolean;
      mimeType?: string;
      byteSize?: number;
    }> = [];

    const missingHashes: string[] = [];

    for (const hash of allHashes) {
      const inManifest = Boolean(doc.assetManifest[hash]);
      const hasBlob = await assetStore.hasAsset(hash);
      const manifestEntry = doc.assetManifest[hash];

      report.push({
        assetHash: hash,
        inManifest,
        inIDBStore: hasBlob,
        mimeType: manifestEntry?.mimeType,
        byteSize: manifestEntry?.byteSize
      });

      if (!hasBlob) {
        missingHashes.push(hash);
      }
    }

    if (report.length > 0) {
      console.table(report);
    } else {
      console.log("No images or tokens are currently on the canvas.");
    }

    if (missingHashes.length > 0) {
      console.warn(`[Troubleshoot] Found ${missingHashes.length} missing asset(s) locally:`, missingHashes);
      console.log("[Troubleshoot] Triggering syncMissingAssets() to request missing assets from host/peers...");
      await sessionManager.syncMissingAssets();
    } else {
      console.log("[Troubleshoot] All referenced assets are present in the local IndexedDB assetStore!");
    }

    console.groupEnd();
    return {
      totalReferenced: allHashes.length,
      manifestCount: manifestHashes.length,
      entityCount: entityHashes.size,
      missingHashes,
      report
    };
  };

  console.log("[Maury VTT] Diagnostics loaded. Run window.__vttTroubleshootAssets() in the console anytime to diagnose image synchronization.");
}
