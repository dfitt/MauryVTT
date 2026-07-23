import JSZip from "jszip";
import { docStore } from "../state/documentStore.js";
import { assetStore } from "../state/idbAssetStore.js";
import { VTTDocument } from "../types/vtt.js";
import { sessionManager } from "../network/sessionManager.js";

export const LAST_SAVED_PATH_KEY = "vtt_last_saved_doc_path";
export const LAST_SAVED_BLOB_KEY = "vtt_last_saved_doc_archive";

export let lastVTTDocSaveTime: number = Date.now();

export function updateLastVTTDocSaveTime(time: number = Date.now()): void {
  lastVTTDocSaveTime = time;
}

export function getTimestampWithSeconds(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const mins = pad(now.getMinutes());
  const secs = pad(now.getSeconds());
  return `${year}-${month}-${day}_${hours}-${mins}-${secs}`;
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

export async function exportVTTDocArchive(): Promise<string> {
  const doc = docStore.getDocument();
  const zip = new JSZip();

  // 1. Find all active asset hashes referenced by entities in this document
  const activeHashes = new Set<string>();
  for (const ent of Object.values(doc.entities)) {
    if (("assetHash" in ent) && (ent as any).assetHash) {
      activeHashes.add((ent as any).assetHash);
    }
  }

  // 2. Build clean document snapshot containing ONLY active asset hashes in assetManifest and excluding system notifications
  const cleanDoc: VTTDocument = JSON.parse(JSON.stringify(doc));
  cleanDoc.assetManifest = {};
  for (const hash of activeHashes) {
    if (doc.assetManifest[hash]) {
      cleanDoc.assetManifest[hash] = doc.assetManifest[hash];
    }
  }
  cleanDoc.chatHistory = (cleanDoc.chatHistory || []).filter((msg) => msg.type !== "system");

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

  // 5. Generate ZIP buffer
  const zipBlob = await zip.generateAsync({ type: "blob" });

  // 6. Generate filename: room name + timestamp with minute & second
  const roomName = sessionManager.hostRoomId || cleanDoc.documentId || "vtt-room";
  const filename = `${roomName}_${getTimestampWithSeconds()}.vttdoc`;

  // 7. Save filename/path and archive blob into local storage & IDB
  try {
    localStorage.setItem(LAST_SAVED_PATH_KEY, filename);
    await assetStore.saveAsset(LAST_SAVED_BLOB_KEY, zipBlob);
    console.log(`[vttdocArchive] Saved last-saved vttdoc path: ${filename}`);
  } catch (err) {
    console.warn("[vttdocArchive] Error saving last vttdoc to local storage/IDB:", err);
  }

  // 8. Trigger download
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  updateLastVTTDocSaveTime(Date.now());

  return filename;
}

export async function importVTTDocArchive(file: File | Blob, filename?: string): Promise<void> {
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

  // Record as last-saved vttdoc if a filename or File object is provided
  const saveName = filename || (file instanceof File ? file.name : undefined);
  if (saveName) {
    try {
      localStorage.setItem(LAST_SAVED_PATH_KEY, saveName);
      await assetStore.saveAsset(LAST_SAVED_BLOB_KEY, file);
      console.log(`[vttdocArchive] Updated last-saved vttdoc path from import: ${saveName}`);
    } catch (err) {
      console.warn("[vttdocArchive] Error caching imported vttdoc:", err);
    }
  }

  updateLastVTTDocSaveTime(Date.now());
}

export async function autoLoadLastSavedVTTDocForRoom(roomName: string): Promise<boolean> {
  if (!roomName) return false;
  const lastSavedPath = localStorage.getItem(LAST_SAVED_PATH_KEY);
  if (!lastSavedPath) return false;

  const basename = lastSavedPath.split(/[/\\]/).pop() || lastSavedPath;
  const matchesRoom =
    basename.toLowerCase().startsWith(roomName.toLowerCase()) ||
    lastSavedPath.toLowerCase().startsWith(roomName.toLowerCase());

  if (matchesRoom) {
    console.log(`[vttdocArchive] Auto-loading vttdoc '${basename}' for room '${roomName}'`);
    try {
      const savedBlob = await assetStore.getAsset(LAST_SAVED_BLOB_KEY);
      if (savedBlob) {
        await importVTTDocArchive(savedBlob, basename);
        console.log(`[vttdocArchive] Auto-loaded vttdoc successfully for room '${roomName}'`);
        return true;
      } else {
        console.warn(`[vttdocArchive] Last-saved vttdoc path matches '${roomName}' but blob not found in IDB.`);
      }
    } catch (err) {
      console.error(`[vttdocArchive] Failed auto-loading vttdoc for room '${roomName}':`, err);
    }
  }
  return false;
}


