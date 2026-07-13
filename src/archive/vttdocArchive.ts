import JSZip from "jszip";
import { docStore } from "../state/documentStore.js";
import { assetStore } from "../state/idbAssetStore.js";
import { VTTDocument } from "../types/vtt.js";

export async function exportVTTDocArchive(): Promise<void> {
  const doc = docStore.getDocument();
  const zip = new JSZip();

  // 1. Write JSON manifest
  zip.file("document.json", JSON.stringify(doc, null, 2));

  // 2. Write all assets referenced in assetManifest
  const assetsFolder = zip.folder("assets");
  if (assetsFolder) {
    const allAssets = await assetStore.getAllAssetsMap();
    for (const [hash, blob] of Object.entries(allAssets)) {
      assetsFolder.file(hash, blob);
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
