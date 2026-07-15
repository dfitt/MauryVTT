import JSZip from "jszip";
import { docStore } from "../state/documentStore.js";
import { assetStore } from "../state/idbAssetStore.js";
import { VTTDocument } from "../types/vtt.js";

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
}
