import JSZip from "jszip";
import { docStore } from "../state/documentStore.js";
import { assetStore } from "../state/idbAssetStore.js";
import { VTTDocument } from "../types/vtt.js";
import { sessionManager } from "../network/sessionManager.js";

export let lastVTTDocSaveTime: number = Date.now();

export function updateLastVTTDocSaveTime(time: number = Date.now()): void {
  lastVTTDocSaveTime = time;
}

export function setupUnloadSavePrompt(): void {
  window.addEventListener("beforeunload", (e) => {
    // Only remind host users to save the VTT document
    const isHost = sessionManager.role === "host" || (sessionManager.myPeerId && sessionManager.myPeerId === docStore.getDocument().documentId);
    if (!isHost) return;

    if (Date.now() - lastVTTDocSaveTime > 60_000) {
      const msg = "It has been more than 1 minute since you last saved the VTT document (.vttdoc). Would you like to save before leaving?";
      e.preventDefault();
      e.returnValue = msg;

      setTimeout(async () => {
        if (confirm("It has been more than 1 minute since you last saved the VTT document (.vttdoc). Would you like to save and download it right now?")) {
          try {
            await exportVTTDocArchive();
            lastVTTDocSaveTime = Date.now();
          } catch (err) {
            console.error("[vttdocArchive] Error auto-saving document on unload:", err);
          }
        }
      }, 100);

      return msg;
    }
  });
}

export async function exportVTTDocArchive(): Promise<void> {
  const doc = docStore.getDocument();
  const zip = new JSZip();

  // 1. Find all active asset hashes referenced by entities in this document
  const activeHashes = new Set<string>();
  for (const ent of Object.values(doc.entities)) {
    if (("assetHash" in ent) && (ent as any).assetHash) {
      activeHashes.add((ent as any).assetHash);
    }
  }

  // 2. Build clean document snapshot containing ONLY active asset hashes in assetManifest
  const cleanDoc: VTTDocument = JSON.parse(JSON.stringify(doc));
  cleanDoc.assetManifest = {};
  for (const hash of activeHashes) {
    if (doc.assetManifest[hash]) {
      cleanDoc.assetManifest[hash] = doc.assetManifest[hash];
    }
  }

  // 3. Write JSON manifest
  zip.file("document.json", JSON.stringify(cleanDoc, null, 2));

  // 4. Write ONLY assets needed for this VTT instance
  const assetsFolder = zip.folder("assets");
  if (assetsFolder) {
    for (const hash of activeHashes) {
      const blob = await assetStore.getAsset(hash);
      if (blob) {
        assetsFolder.file(hash, blob);
      } else {
        console.warn(`[exportVTTDocArchive] Asset ${hash} referenced by entity but not found in IDB assetStore`);
      }
    }
  }

  // 3. Generate ZIP buffer
  const zipBlob = await zip.generateAsync({ type: "blob" });

  // 4. Trigger download
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vtt-session-${new Date().toISOString().slice(0, 10)}.vttdoc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  updateLastVTTDocSaveTime(Date.now());
}

export async function importVTTDocArchive(file: File): Promise<void> {
  const zip = await JSZip.loadAsync(file);

  const docFile = zip.file("document.json");
  if (!docFile) {
    throw new Error("Invalid .vttdoc archive: missing document.json manifest.");
  }

  const jsonStr = await docFile.async("string");
  const parsedDoc: VTTDocument = JSON.parse(jsonStr);

  // Unpack assets into local IndexedDB store
  const assetsFolder = zip.folder("assets");
  if (assetsFolder) {
    const files: Promise<void>[] = [];
    assetsFolder.forEach((relativePath, fileObj) => {
      if (!fileObj.dir) {
        files.push(
          fileObj.async("blob").then(async (blob) => {
            const hash = relativePath.split("/").pop() || relativePath;
            await assetStore.saveAsset(hash, blob);
          })
        );
      }
    });
    await Promise.all(files);
  }

  docStore.loadSnapshot(parsedDoc);
  if (sessionManager.role === "host") {
    console.log("[vttdocArchive] Host imported .vttdoc; forcing resync to all connected clients...");
    await sessionManager.resyncState();
  }
  updateLastVTTDocSaveTime(Date.now());
}

