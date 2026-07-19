import { CanvasEngine } from "../canvas/canvasEngine.js";
import { ImageEntity, VTTDocument } from "../types/vtt.js";
import { docStore } from "../state/documentStore.js";
import { assetStore } from "../state/idbAssetStore.js";
import { sessionManager } from "../network/sessionManager.js";
import { processImageFile } from "../canvas/imageResizer.js";

export function openGeminiApiKeyModal(onSuccess?: () => void): void {
  let modalEl = document.getElementById("vtt-gemini-apikey-modal");
  if (!modalEl) {
    modalEl = document.createElement("div");
    modalEl.id = "vtt-gemini-apikey-modal";
    modalEl.style.cssText = "position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 99999;";
    document.body.appendChild(modalEl);
  }

  const currentKey = localStorage.getItem("gemini_api_key") || "";
  const currentModel = localStorage.getItem("gemini_enhance_model") || "gemini-3.1-flash-image";
  const currentCustomPrompt = localStorage.getItem("gemini_enhance_custom_prompt") || "";

  modalEl.innerHTML = `
    <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(192, 132, 252, 0.5); border-radius: 12px; padding: 24px; max-width: 480px; width: 90%; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.8); color: #f8fafc; font-family: sans-serif; display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 24px;">✨</span>
        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #c084fc;">AI Map Enhancement (/enhance)</h3>
      </div>
      <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
        To generate enhanced tabletop battlemaps from your sketches and fills, please verify your configuration below.
        <br/><br/>
        <strong style="color: #38bdf8;">Privacy Guarantee:</strong> Your key is stored exclusively in your browser's local storage (<code>localStorage</code>) and is <strong>NEVER</strong> transmitted over P2P connections or saved to any VTT document.
      </p>
      
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label style="font-size: 12px; font-weight: 600; color: #e2e8f0;">Gemini API Key</label>
        <input type="password" id="gemini-apikey-input" value="${currentKey}" placeholder="AIzaSy..." style="padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(192, 132, 252, 0.4); background: rgba(30, 41, 59, 0.8); color: #ffffff; font-size: 14px; outline: none;" />
      </div>

      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label style="font-size: 12px; font-weight: 600; color: #e2e8f0;">Map Description / Custom Prompt (Optional Override)</label>
        <textarea id="gemini-custom-prompt-input" rows="3" placeholder="e.g. A frozen dwarven tomb with icy pillars, glowing runes, and a chasm crossing the center..." style="padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(192, 132, 252, 0.4); background: rgba(30, 41, 59, 0.8); color: #ffffff; font-size: 13px; outline: none; resize: vertical;">${currentCustomPrompt}</textarea>
        <span style="font-size: 11px; color: #94a3b8;">If provided, your description overrides any conflicting defaults when generating the map.</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label style="font-size: 12px; font-weight: 600; color: #e2e8f0;">Model Identifier (Latest Gemini / Nano Banana 2)</label>
        <input type="text" id="gemini-model-input" value="${currentModel}" placeholder="gemini-3.1-flash-image" style="padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(192, 132, 252, 0.4); background: rgba(30, 41, 59, 0.8); color: #c084fc; font-size: 13px; outline: none;" />
        <span style="font-size: 11px; color: #94a3b8;">Default: <code>gemini-3.1-flash-image</code> (Latest Gemini / Nano Banana 2 multimodal image model)</span>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
        <button id="btn-cancel-gemini-apikey" class="btn-glass" style="padding: 8px 16px; border-radius: 8px; cursor: pointer; color: #cbd5e1;">Cancel</button>
        <button id="btn-save-gemini-apikey" class="btn-glass" style="padding: 8px 20px; border-radius: 8px; cursor: pointer; background: rgba(192, 132, 252, 0.3); border: 1px solid #c084fc; color: #ffffff; font-weight: 700; box-shadow: 0 0 12px rgba(192, 132, 252, 0.4);">Save & Activate</button>
      </div>
    </div>
  `;

  modalEl.style.display = "flex";

  const inputEl = modalEl.querySelector<HTMLInputElement>("#gemini-apikey-input")!;
  const promptInputEl = modalEl.querySelector<HTMLTextAreaElement>("#gemini-custom-prompt-input")!;
  const modelEl = modalEl.querySelector<HTMLInputElement>("#gemini-model-input")!;
  const cancelBtn = modalEl.querySelector<HTMLButtonElement>("#btn-cancel-gemini-apikey")!;
  const saveBtn = modalEl.querySelector<HTMLButtonElement>("#btn-save-gemini-apikey")!;

  cancelBtn.addEventListener("click", () => {
    modalEl?.remove();
  });

  saveBtn.addEventListener("click", () => {
    const keyVal = inputEl.value.trim();
    const modelVal = modelEl.value.trim() || "gemini-2.5-flash-image";
    const customPromptVal = promptInputEl.value.trim();
    if (!keyVal) {
      alert("Please enter a valid Gemini API Key.");
      return;
    }
    localStorage.setItem("gemini_api_key", keyVal);
    localStorage.setItem("gemini_enhance_model", modelVal);
    localStorage.setItem("gemini_enhance_custom_prompt", customPromptVal);
    localStorage.removeItem("gemini_enhance_last_failed");
    modalEl?.remove();
    if (onSuccess) onSuccess();
  });
}

export function showEnhanceToast(text: string, durationMs = 8000): void {
  let toastEl = document.getElementById("vtt-enhance-toast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "vtt-enhance-toast";
    toastEl.style.cssText = "position: fixed; top: 65px; left: 50%; transform: translateX(-50%); background: rgba(192, 132, 252, 0.95); color: #ffffff; padding: 10px 20px; border-radius: 9999px; font-size: 13px; font-weight: 700; z-index: 100000; box-shadow: 0 6px 24px rgba(192, 132, 252, 0.45); pointer-events: none; transition: opacity 0.3s ease; text-align: center; max-width: 80vw;";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = text;
  toastEl.style.opacity = "1";
  toastEl.style.display = "block";
  if ((showEnhanceToast as any).timer) clearTimeout((showEnhanceToast as any).timer);
  if (durationMs > 0) {
    (showEnhanceToast as any).timer = setTimeout(() => {
      if (toastEl) toastEl.style.opacity = "0";
    }, durationMs);
  }
}

async function callGeminiImageGeneration(base64Image: string, apiKey: string, modelName: string, overrideDesc?: string): Promise<string | null> {
  const modelsToTry = [
    modelName,
    "gemini-3.1-flash-image",
    "gemini-2.5-flash-image",
    "gemini-2.0-flash-exp",
    "imagen-3.0-generate-002"
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  const premadePrompt = "You are a master virtual tabletop RPG map designer specializing in classic old-school D&D cartography. Look at the provided top-down drawing and room fills as a layout guide and blueprint. Generate a high-resolution, top-down, overhead 2D tabletop RPG battlemap designed in an oldschool D&D, OSR (Old School Renaissance), and Dungeon Crawl Classics (DCC) art style. The map MUST be drawn with crisp black ink on a solid, stark white (#FFFFFF) background with classic crosshatching, hand-drawn ink line walls, stippling, and retro dungeon cartography textures while preserving the exact spatial boundaries, room layouts, pathways, and alignments shown in the sketch guide. Even if the reference sketch has a dark background, your generated map MUST have a solid, stark white (#FFFFFF) background with black ink lines. CRITICAL INSTRUCTIONS:\n1. Do NOT draw or include any square or hexagonal grid lines, floor tile grids, flagstone grids, floor patterns, map legends, text labels, titles, keys, or compass roses on the map itself.\n2. Floors MUST be mostly empty, plain, and stark white (#FFFFFF) except for important objects, furniture, debris, rubble, and decorations. Absolutely NO regular floor patterns, tiles, checkers, parquet, or grid textures are allowed on the floor because they conflict directly with the virtual tabletop software's built-in dynamic grid lines.";
  const customDesc = overrideDesc !== undefined ? overrideDesc.trim() : localStorage.getItem("gemini_enhance_custom_prompt")?.trim();
  const promptText = customDesc
    ? `${premadePrompt}\n\nCRITICAL USER OVERRIDE DESCRIPTION (Follow this user description strictly; if any instructions below or above conflict with this custom description, this user description takes overriding precedence):\n"${customDesc}"`
    : premadePrompt;

  console.group("[Enhance] Starting Gemini Image Generation Pipeline");
  console.log("Models queue in order:", modelsToTry);
  console.log("Input sketch size (base64 length):", base64Image.length);
  console.log("API Key present:", Boolean(apiKey), "Length:", apiKey ? apiKey.length : 0);

  const errorsCollected: string[] = [];

  for (const model of modelsToTry) {
    console.group(`[Enhance] Attempting model: ${model}`);
    try {
      if (model.includes("imagen")) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${encodeURIComponent(apiKey)}`;
        console.log(`Endpoint: https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`);
        const requestPayload = {
          instances: [
            {
              prompt: promptText,
              image: {
                bytesBase64Encoded: base64Image
              }
            }
          ],
          parameters: {
            sampleCount: 1
          }
        };

        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload)
        });

        console.log(`HTTP Status: ${resp.status} ${resp.statusText}`);
        if (!resp.ok) {
          const errTxt = await resp.text();
          console.warn(`[Enhance] HTTP Error from ${model}:`, errTxt);
          errorsCollected.push(`[${model}] HTTP ${resp.status}: ${errTxt.substring(0, 300)}`);
          console.groupEnd();
          continue;
        }

        const data = await resp.json();
        console.log(`[Enhance] Response JSON object from ${model}:`, data);

        const base64Out = data.predictions?.[0]?.bytesBase64Encoded || data.predictions?.[0]?.mimeTypeBase64;
        if (base64Out) {
          console.log(`[Enhance] Successfully extracted base64 image output from ${model} (${base64Out.length} chars)`);
          console.groupEnd();
          console.groupEnd();
          return base64Out;
        } else {
          const warnMsg = `No predictions[0].bytesBase64Encoded found in JSON response from ${model}`;
          console.warn(`[Enhance] ${warnMsg}`, data);
          errorsCollected.push(`[${model}] ${warnMsg}`);
        }
      } else {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        console.log(`Endpoint: https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
        
        const basePayload = {
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inline_data: {
                    mime_type: "image/png",
                    data: base64Image
                  }
                }
              ]
            }
          ]
        };

        const configsToTry = [
          { responseModalities: ["IMAGE", "TEXT"] },
          { responseModalities: ["IMAGE"] },
          null // try without generationConfig if model rejects responseModalities
        ];

        for (const genCfg of configsToTry) {
          const payload = genCfg ? { ...basePayload, generationConfig: genCfg } : basePayload;
          console.log(`[Enhance] Attempting ${model} with generationConfig:`, genCfg);
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          console.log(`HTTP Status (${model}, config: ${JSON.stringify(genCfg)}): ${resp.status} ${resp.statusText}`);
          if (!resp.ok) {
            const errTxt = await resp.text();
            console.warn(`[Enhance] HTTP Error from ${model} with config ${JSON.stringify(genCfg)}:`, errTxt);
            errorsCollected.push(`[${model} | cfg: ${JSON.stringify(genCfg)}] HTTP ${resp.status}: ${errTxt.substring(0, 200)}`);
            continue;
          }

          const data = await resp.json();
          console.log(`[Enhance] Response JSON object from ${model} (config: ${JSON.stringify(genCfg)}):`, data);

          const candidate = data.candidates?.[0];
          if (candidate?.finishReason && candidate.finishReason !== "STOP") {
            console.warn(`[Enhance] Candidate finishReason is not STOP (${candidate.finishReason}). Safety ratings or block summary:`, candidate);
          }

          const parts = candidate?.content?.parts || [];
          for (const p of parts) {
            if (p.inlineData?.data) {
              console.log(`[Enhance] Successfully extracted inlineData.data from ${model} (${p.inlineData.data.length} chars)`);
              console.groupEnd();
              console.groupEnd();
              return p.inlineData.data;
            }
            if (p.inline_data?.data) {
              console.log(`[Enhance] Successfully extracted inline_data.data from ${model} (${p.inline_data.data.length} chars)`);
              console.groupEnd();
              console.groupEnd();
              return p.inline_data.data;
            }
          }
          for (const p of parts) {
            if (p.text && p.text.includes("data:image/png;base64,")) {
              const m = p.text.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
              if (m) {
                console.log(`[Enhance] Successfully extracted base64 image from text part in ${model} (${m[1].length} chars)`);
                console.groupEnd();
                console.groupEnd();
                return m[1];
              }
            }
            if (p.text) {
              console.log(`[Enhance] Model ${model} returned text instead of image:`, p.text.substring(0, 500));
            }
          }

          const warnMsg = `200 OK received but response contained no valid image data. finishReason: ${candidate?.finishReason || "unknown"}`;
          console.warn(`[Enhance] ${warnMsg}`, candidate);
          errorsCollected.push(`[${model} | cfg: ${JSON.stringify(genCfg)}] ${warnMsg}`);
        }
      }
    } catch (e: any) {
      console.warn(`[Enhance] Exception during fetch with model ${model}:`, e);
      errorsCollected.push(`[${model}] Exception: ${e.message || e}`);
    }
    console.groupEnd();
  }

  console.groupEnd();
  console.error("[Enhance] All model generation attempts failed:", errorsCollected);
  const detailedErrorSummary = errorsCollected.length > 0 ? errorsCollected[0] : "No model succeeded.";
  throw new Error(`Generation failed. Details: ${detailedErrorSummary}`);
}

export async function runGeminiMapEnhancement(engine: CanvasEngine, box: { x: number; y: number; width: number; height: number }, overrideDesc?: string): Promise<void> {
  const apiKey = localStorage.getItem("gemini_api_key");
  const lastFailed = localStorage.getItem("gemini_enhance_last_failed") === "true";
  if (!apiKey || lastFailed) {
    const proxyId = await checkOrFindProxyPeer();
    if (proxyId) {
      openGeminiDescriptionModal(engine, box, true, proxyId);
    } else {
      openGeminiApiKeyModal(() => openGeminiDescriptionModal(engine, box, false, null));
    }
    return;
  }

  const modelName = localStorage.getItem("gemini_enhance_model") || "gemini-3.1-flash-image";
  showEnhanceToast("✨ Generating AI Overhead Map with Gemini (Nano Banana 2)... Please wait ~10-20s.", 0);

  try {
    const doc = docStore.getDocument();
    const maxDim = 1024;
    const scale = Math.min(maxDim / box.width, maxDim / box.height, 2.0);
    const canvasW = Math.max(64, Math.round(box.width * scale));
    const canvasH = Math.max(64, Math.round(box.height * scale));

    const offscreen = document.createElement("canvas");
    offscreen.width = canvasW;
    offscreen.height = canvasH;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) throw new Error("Could not create 2D canvas context");

    offCtx.fillStyle = doc.canvasSettings?.backgroundColor || "#0f172a";
    offCtx.fillRect(0, 0, canvasW, canvasH);

    offCtx.save();
    offCtx.scale(scale, scale);
    offCtx.translate(-box.x, -box.y);

    engine.drawAreaDrawingsAndFills(offCtx, doc, box);
    offCtx.restore();

    const dataUrl = offscreen.toDataURL("image/png");
    const base64Image = dataUrl.split(",")[1];

    console.log("[Enhance] Captured offscreen sketch area:", box, "size:", canvasW, canvasH);

    const resultBase64 = await callGeminiImageGeneration(base64Image, apiKey, modelName, overrideDesc);
    if (!resultBase64) {
      throw new Error("No image output returned by Gemini API.");
    }

    const byteString = atob(resultBase64);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([uint8Array], { type: "image/png" });
    const file = new File([blob], "gemini_enhanced_map.png", { type: "image/png" });

    const processed = await processImageFile(file, 4096);
    await assetStore.saveAsset(processed.assetHash, processed.blob);
    docStore.registerAssetManifest(
      processed.assetHash,
      processed.mimeType,
      processed.byteSize,
      processed.widthPx,
      processed.heightPx
    );

    const existingImages = Object.values(doc.entities).filter((e) => e.type === "image");
    let lowestZ = 0;
    for (const img of existingImages) {
      if (img.zIndex < lowestZ) lowestZ = img.zIndex;
    }

    const newMapImage: ImageEntity = {
      id: "img-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      type: "image",
      layerId: "map-layer",
      isMap: true,
      blendMode: "multiply" as any,
      zIndex: lowestZ - 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastModifiedBy: sessionManager.myPeerId || "local",
      locked: false,
      assetHash: processed.assetHash,
      position: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      size: { width: box.width, height: box.height },
      rotation: 0,
      opacity: 1.0
    };

    docStore.applyOperation({ opType: "CREATE_ENTITY", entity: newMapImage }, { incrementRevision: false });
    engine.setTool("select");
    localStorage.removeItem("gemini_enhance_last_failed");
    showEnhanceToast("✨ AI Map Enhancement complete! Review alignment below and Accept, Retry, or Abort.", 6000);
    showEnhanceConfirmationBar(engine, box, newMapImage);
  } catch (err: any) {
    console.error("[Enhance] Error during Gemini Map Enhancement:", err);
    localStorage.setItem("gemini_enhance_last_failed", "true");
    showEnhanceToast(`❌ Enhance Error: ${err.message || err}`, 14000);
  }
}

function showEnhanceConfirmationBar(
  engine: CanvasEngine,
  box: { x: number; y: number; width: number; height: number },
  newMapImage: ImageEntity,
  proxyPeerId?: string,
  proxyDescription?: string
): void {
  let oldBar = document.getElementById("vtt-enhance-confirm-bar");
  if (oldBar) oldBar.remove();

  const bar = document.createElement("div");
  bar.id = "vtt-enhance-confirm-bar";
  bar.style.cssText = "position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.95); border: 2px solid #c084fc; border-radius: 9999px; padding: 12px 24px; display: flex; align-items: center; gap: 16px; box-shadow: 0 12px 36px rgba(0,0,0,0.85); z-index: 100000; color: #f8fafc; font-family: sans-serif;";
  bar.innerHTML = `
    <span style="font-weight: 700; color: #c084fc; font-size: 14px;">✨ AI Map Imported!</span>
    <span style="font-size: 13px; color: #cbd5e1;">Review alignment on canvas below:</span>
    <div style="display: flex; gap: 10px;">
      <button id="btn-enhance-accept" style="padding: 6px 16px; border-radius: 9999px; background: #22c55e; border: none; color: #fff; font-weight: 700; cursor: pointer; box-shadow: 0 0 10px rgba(34, 197, 94, 0.4);">Accept & Clear Sketches</button>
      <button id="btn-enhance-retry" style="padding: 6px 16px; border-radius: 9999px; background: #eab308; border: none; color: #fff; font-weight: 700; cursor: pointer; box-shadow: 0 0 10px rgba(234, 179, 8, 0.4);">Retry</button>
      <button id="btn-enhance-abort" style="padding: 6px 16px; border-radius: 9999px; background: #ef4444; border: none; color: #fff; font-weight: 700; cursor: pointer; box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);">Abort</button>
    </div>
  `;
  document.body.appendChild(bar);

  const acceptBtn = bar.querySelector<HTMLButtonElement>("#btn-enhance-accept")!;
  const retryBtn = bar.querySelector<HTMLButtonElement>("#btn-enhance-retry")!;
  const abortBtn = bar.querySelector<HTMLButtonElement>("#btn-enhance-abort")!;

  acceptBtn.addEventListener("click", () => {
    bar.remove();
    const currentEnt = (docStore.getDocument().entities[newMapImage.id] as ImageEntity) || newMapImage;
    const lockedMapEntity: ImageEntity = {
      ...currentEnt,
      locked: true,
      updatedAt: Date.now(),
      lastModifiedBy: sessionManager.myPeerId || "local"
    };
    docStore.applyOperation({ opType: "UPDATE_ENTITY", id: lockedMapEntity.id, patch: { locked: true } }, { incrementRevision: false });
    sessionManager.dispatchOperation({ opType: "CREATE_ENTITY", entity: lockedMapEntity });
    if (proxyPeerId) {
      sessionManager.dispatchOperation({
        opType: "APPEND_CHAT_MESSAGE",
        message: {
          id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          timestamp: Date.now(),
          senderPeerId: sessionManager.myPeerId || "local",
          senderUsername: sessionManager.myUsername || "Requester",
          content: `✨ AI Map generated via proxy accepted and added to canvas!`,
          type: "system"
        }
      });
    }

    const doc = docStore.getDocument();
    const drawingsToDelete: string[] = [];
    for (const ent of Object.values(doc.entities)) {
      if (ent.type === "line") {
        const line = ent as any;
        if (line.points && line.points.length > 0) {
          const inside = line.points.some((p: any) => {
            const px = Array.isArray(p) ? p[0] : p?.x;
            const py = Array.isArray(p) ? p[1] : p?.y;
            return px !== undefined && py !== undefined && px >= box.x - 10 && px <= box.x + box.width + 10 && py >= box.y - 10 && py <= box.y + box.height + 10;
          });
          if (inside) {
            drawingsToDelete.push(ent.id);
          }
        }
      }
    }
    for (const id of drawingsToDelete) {
      sessionManager.dispatchOperation({ opType: "DELETE_ENTITY", id });
    }

    if (doc.gridCells) {
      const size = doc.canvasSettings?.gridSizePx || 50;
      for (const [key, cell] of Object.entries(doc.gridCells)) {
        if (!cell || !cell.fillColor || cell.fillColor === "fog" || cell.fogHidden) continue;
        const commaIdx = key.indexOf(",");
        if (commaIdx === -1) continue;
        const gx = Number(key.substring(0, commaIdx));
        const gy = Number(key.substring(commaIdx + 1));
        if (gx + size >= box.x && gx <= box.x + box.width && gy + size >= box.y && gy <= box.y + box.height) {
          sessionManager.dispatchOperation({
            opType: "UPDATE_GRID_CELL",
            cellKey: key,
            patch: { fillColor: undefined, fillCreator: undefined }
          });
        }
      }
    }
    showEnhanceToast("✅ AI Map Accepted and reference drawings cleared!", 4000);
  });

  retryBtn.addEventListener("click", () => {
    bar.remove();
    docStore.applyOperation({ opType: "DELETE_ENTITY", id: newMapImage.id }, { incrementRevision: false });
    showEnhanceToast("🔄 Retrying AI Map Generation...", 3000);
    if (proxyPeerId) {
      sendProxyEnhanceRequest(engine, box, proxyDescription || "", proxyPeerId);
    } else {
      runGeminiMapEnhancement(engine, box, proxyDescription);
    }
  });

  abortBtn.addEventListener("click", () => {
    bar.remove();
    docStore.applyOperation({ opType: "DELETE_ENTITY", id: newMapImage.id }, { incrementRevision: false });
    showEnhanceToast("🛑 AI Map Enhancement aborted.", 3000);
  });
}

const knownPeersWithApiKey = new Set<string>();
let proxyListenersSetup = false;

export function setupEnhanceProxyListeners(engine: CanvasEngine): void {
  if (proxyListenersSetup) return;
  proxyListenersSetup = true;
  console.log("[EnhanceProxy] setupEnhanceProxyListeners initialized.");

  sessionManager.onEphemeral(async (payload: any) => {
    if (!payload || typeof payload !== "object") return;
    const myId = sessionManager.myPeerId || "local";

    if (payload.type === "ENHANCE_CHECK_KEY_REQ") {
      console.log(`[EnhanceProxy] Received ENHANCE_CHECK_KEY_REQ from ${payload.requesterPeerId}. Checking local API key...`);
      const apiKey = localStorage.getItem("gemini_api_key");
      const lastFailed = localStorage.getItem("gemini_enhance_last_failed") === "true";
      const hasKey = Boolean(apiKey && apiKey.trim().length > 0) && !lastFailed;
      console.log(`[EnhanceProxy] My key status: hasKey=${hasKey} (keyLength=${apiKey ? apiKey.length : 0}, lastFailed=${lastFailed}, myId=${myId})`);
      if (hasKey && payload.requesterPeerId !== myId) {
        console.log(`[EnhanceProxy] Sending ENHANCE_CHECK_KEY_ACK to ${payload.requesterPeerId}...`);
        sessionManager.sendEphemeral({
          type: "ENHANCE_CHECK_KEY_ACK",
          peerId: myId,
          hasKey: true
        });
      }
    } else if (payload.type === "ENHANCE_CHECK_KEY_ACK") {
      console.log(`[EnhanceProxy] Received ENHANCE_CHECK_KEY_ACK from peer ${payload.peerId} (hasKey=${payload.hasKey}, myId=${myId})`);
      if (payload.hasKey && payload.peerId && payload.peerId !== myId) {
        knownPeersWithApiKey.add(payload.peerId);
        console.log(`[EnhanceProxy] Added ${payload.peerId} to knownPeersWithApiKey. Current set:`, Array.from(knownPeersWithApiKey));
      }
    } else if (payload.type === "ENHANCE_PROXY_REQ") {
      console.log(`[EnhanceProxy] Received ENHANCE_PROXY_REQ. targetProxyId=${payload.proxyPeerId}, myId=${myId}, requester=${payload.requesterUsername} (${payload.requesterPeerId})`);
      if (payload.proxyPeerId === myId || payload.proxyPeerId === "any") {
        console.group(`[EnhanceProxy] Handling proxy enhance request from ${payload.requesterUsername} (${payload.requesterPeerId})`);
        const apiKey = localStorage.getItem("gemini_api_key");
        const lastFailed = localStorage.getItem("gemini_enhance_last_failed") === "true";
        if (!apiKey || lastFailed) {
          console.warn("[EnhanceProxy] Cannot serve proxy request: no valid API key or lastFailed=true");
          console.groupEnd();
          sessionManager.sendEphemeral({
            type: "ENHANCE_PROXY_RES",
            reqId: payload.reqId,
            requesterPeerId: payload.requesterPeerId,
            proxyPeerId: myId,
            status: "error",
            error: "Proxy host no longer has a valid Gemini API key configured."
          });
          return;
        }
        await runGeminiMapEnhancementForProxy(engine, payload.box, payload.description, payload.requesterPeerId, payload.requesterUsername, payload.reqId);
        console.groupEnd();
      }
    } else if (payload.type === "ENHANCE_PROXY_RES") {
      console.log(`[EnhanceProxy] Received ENHANCE_PROXY_RES. status=${payload.status}, requester=${payload.requesterPeerId}, myId=${myId}`);
      if (payload.requesterPeerId === myId) {
        if (payload.status === "error") {
          console.error("[EnhanceProxy] Proxy returned error:", payload.error);
          showEnhanceToast(`❌ Proxy Generation Failed: ${payload.error || "Unknown error"}`, 8000);
        } else if (payload.status === "success" && payload.newMapImage && payload.box) {
          console.log("[EnhanceProxy] Proxy generation evaluation payload arrived! Registering asset manifest and applying entity locally ONLY while evaluating...");
          const ent = payload.newMapImage as ImageEntity;
          if (payload.assetManifestEntry) {
            docStore.registerAssetManifest(
              payload.assetManifestEntry.assetHash,
              payload.assetManifestEntry.mimeType,
              payload.assetManifestEntry.byteSize,
              payload.assetManifestEntry.widthPx,
              payload.assetManifestEntry.heightPx
            );
          }
          docStore.applyOperation({ opType: "CREATE_ENTITY", entity: ent }, { incrementRevision: false });
          sessionManager.syncMissingAssets();

          showEnhanceToast("✨ Proxy Map generation complete! Waiting for image data transfer...", 3000);
          let attempts = 0;
          const checkTimer = setInterval(async () => {
            attempts++;
            const hasBlob = await assetStore.hasAsset(ent.assetHash);
            if (hasBlob) {
              clearInterval(checkTimer);
              console.log("[EnhanceProxy] Map image blob arrived! Opening confirmation bar locally without sharing to other peers until accepted.");
              docStore.applyOperation({ opType: "CREATE_ENTITY", entity: ent }, { incrementRevision: false });
              showEnhanceConfirmationBar(engine, payload.box!, ent, payload.proxyPeerId, payload.description);
            } else if (attempts > 80) {
              clearInterval(checkTimer);
              console.warn("[EnhanceProxy] Timed out waiting for map image blob transfer from proxy.");
              showEnhanceToast("⚠️ Map image transfer timed out from proxy.", 6000);
            }
          }, 250);
        }
      }
    }
  });
}

export async function checkOrFindProxyPeer(): Promise<string | null> {
  const myId = sessionManager.myPeerId || "local";
  console.group("[EnhanceProxy] checkOrFindProxyPeer initiated");
  console.log("Current sessionManager role:", sessionManager.role, "myPeerId:", myId);
  console.log("Known peers with API key before check:", Array.from(knownPeersWithApiKey));

  if (sessionManager.role === "none") {
    console.log("[EnhanceProxy] Session role is 'none' (not connected to P2P room). Returning null.");
    console.groupEnd();
    return null;
  }

  const existingCandidate = Array.from(knownPeersWithApiKey).find((p) => p !== myId);
  if (existingCandidate) {
    console.log("[EnhanceProxy] Found existing candidate in knownPeersWithApiKey:", existingCandidate);
    console.groupEnd();
    return existingCandidate;
  }

  console.log("[EnhanceProxy] Broadcasting ENHANCE_CHECK_KEY_REQ and waiting up to 750ms for ACK...");
  sessionManager.sendEphemeral({
    type: "ENHANCE_CHECK_KEY_REQ",
    requesterPeerId: myId
  });

  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        const found = Array.from(knownPeersWithApiKey).find((p) => p !== myId) || null;
        console.log("[EnhanceProxy] 750ms discovery check completed. Found proxy peer:", found);
        console.groupEnd();
        resolve(found);
      }
    }, 750);

    const interval = setInterval(() => {
      if (resolved) {
        clearInterval(interval);
        return;
      }
      const found = Array.from(knownPeersWithApiKey).find((p) => p !== myId);
      if (found) {
        resolved = true;
        clearInterval(interval);
        clearTimeout(timer);
        console.log("[EnhanceProxy] ACK received early! Found proxy peer:", found);
        console.groupEnd();
        resolve(found);
      }
    }, 50);
  });
}

export function sendProxyEnhanceRequest(engine: CanvasEngine, box: { x: number; y: number; width: number; height: number }, description: string, proxyPeerId: string): void {
  const myId = sessionManager.myPeerId || "local";
  const myUsername = sessionManager.myUsername || "Me";
  const reqId = "req-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
  showEnhanceToast(`🚀 Sending AI Map request by proxy through friend's API key... (~10-20s)`, 0);
  console.log(`[EnhanceProxy] Sending ENHANCE_PROXY_REQ to proxyPeerId="${proxyPeerId}" (reqId="${reqId}", requester="${myUsername}" (${myId}))`);
  sessionManager.sendEphemeral({
    type: "ENHANCE_PROXY_REQ",
    reqId,
    requesterPeerId: myId,
    requesterUsername: myUsername,
    proxyPeerId,
    box,
    description
  });
}

async function runGeminiMapEnhancementForProxy(
  engine: CanvasEngine,
  box: { x: number; y: number; width: number; height: number },
  description: string,
  requesterPeerId: string,
  requesterUsername: string,
  reqId: string
): Promise<void> {
  const apiKey = localStorage.getItem("gemini_api_key");
  if (!apiKey) {
    console.warn("[EnhanceProxy] runGeminiMapEnhancementForProxy called but no apiKey in localStorage!");
    return;
  }
  const modelName = localStorage.getItem("gemini_enhance_model") || "gemini-3.1-flash-image";
  const myId = sessionManager.myPeerId || "local";

  try {
    console.log(`[EnhanceProxy] Executing proxy enhancement job for ${requesterUsername} (${requesterPeerId}). Box:`, box, "Desc:", description);
    const doc = docStore.getDocument();
    const maxDim = 1024;
    const scale = Math.min(maxDim / box.width, maxDim / box.height, 2.0);
    const canvasW = Math.max(64, Math.round(box.width * scale));
    const canvasH = Math.max(64, Math.round(box.height * scale));

    const offscreen = document.createElement("canvas");
    offscreen.width = canvasW;
    offscreen.height = canvasH;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) throw new Error("Could not create 2D canvas context");

    offCtx.fillStyle = doc.canvasSettings?.backgroundColor || "#0f172a";
    offCtx.fillRect(0, 0, canvasW, canvasH);

    offCtx.save();
    offCtx.scale(scale, scale);
    offCtx.translate(-box.x, -box.y);

    engine.drawAreaDrawingsAndFills(offCtx, doc, box);
    offCtx.restore();

    const dataUrl = offscreen.toDataURL("image/png");
    const base64Image = dataUrl.split(",")[1];

    console.log(`[EnhanceProxy] Calling Gemini API (model=${modelName})...`);
    const resultBase64 = await callGeminiImageGeneration(base64Image, apiKey, modelName, description);
    if (!resultBase64) {
      throw new Error("No image output returned by Gemini API during proxy request.");
    }
    console.log("[EnhanceProxy] Gemini returned image successfully! Processing image and saving to IDB...");

    const byteString = atob(resultBase64);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([uint8Array], { type: "image/png" });
    const file = new File([blob], "gemini_enhanced_map.png", { type: "image/png" });

    const processed = await processImageFile(file, 4096);
    await assetStore.saveAsset(processed.assetHash, processed.blob);
    docStore.registerAssetManifest(
      processed.assetHash,
      processed.mimeType,
      processed.byteSize,
      processed.widthPx,
      processed.heightPx
    );
    console.log("[EnhanceProxy] Asset saved to IDB with hash:", processed.assetHash, "Dispatching CREATE_ENTITY...");

    const existingImages = Object.values(doc.entities).filter((e) => e.type === "image");
    let lowestZ = 0;
    for (const img of existingImages) {
      if (img.zIndex < lowestZ) lowestZ = img.zIndex;
    }

    const newMapImage: ImageEntity = {
      id: "img-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      type: "image",
      layerId: "map-layer",
      isMap: true,
      blendMode: "multiply" as any,
      zIndex: lowestZ - 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastModifiedBy: requesterPeerId,
      locked: false,
      assetHash: processed.assetHash,
      position: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      size: { width: box.width, height: box.height },
      rotation: 0,
      opacity: 1.0
    };

    console.log("[EnhanceProxy] Sending ENHANCE_PROXY_RES success payload back to requester (without broadcasting entity):", requesterPeerId);
    sessionManager.sendEphemeral({
      type: "ENHANCE_PROXY_RES",
      reqId,
      requesterPeerId,
      proxyPeerId: myId,
      status: "success",
      box,
      newMapImageId: newMapImage.id,
      newMapImage,
      assetManifestEntry: doc.assetManifest[processed.assetHash] || {
        assetHash: processed.assetHash,
        mimeType: processed.mimeType,
        byteSize: processed.byteSize,
        widthPx: processed.widthPx,
        heightPx: processed.heightPx
      }
    });
  } catch (err: any) {
    console.error("[EnhanceProxy] Error during Gemini Map Enhancement proxy job:", err);
    sessionManager.sendEphemeral({
      type: "ENHANCE_PROXY_RES",
      reqId,
      requesterPeerId,
      proxyPeerId: myId,
      status: "error",
      error: err.message || String(err)
    });
  }
}

export function openGeminiDescriptionModal(
  engine: CanvasEngine,
  box: { x: number; y: number; width: number; height: number },
  isProxy: boolean = false,
  proxyPeerId: string | null = null
): void {
  let modalEl = document.getElementById("vtt-gemini-desc-modal");
  if (modalEl) modalEl.remove();

  modalEl = document.createElement("div");
  modalEl.id = "vtt-gemini-desc-modal";
  modalEl.style.cssText = "position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 99999;";
  document.body.appendChild(modalEl);

  const savedPrompt = localStorage.getItem("gemini_enhance_custom_prompt") || "";

  modalEl.innerHTML = `
    <div style="background: rgba(15, 23, 42, 0.96); border: 1px solid rgba(192, 132, 252, 0.6); border-radius: 14px; padding: 24px; max-width: 480px; width: 90%; box-shadow: 0 16px 48px rgba(0,0,0,0.85); color: #f8fafc; font-family: Outfit, sans-serif; display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 24px;">🎨</span>
        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #c084fc;">AI Map Description</h3>
      </div>
      <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
        Enter a text description for the map you want generated over your selection box.
        ${isProxy ? `<span style="display: block; margin-top: 6px; color: #38bdf8; font-weight: 600;">🚀 Generating via proxy through a connected friend's API key!</span>` : ""}
      </p>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label style="font-size: 12px; font-weight: 600; color: #e2e8f0;">Map Description / Details</label>
        <textarea id="gemini-desc-textarea" rows="4" placeholder="e.g. A gothic chapel with ancient altars, rubble, and glowing candles around the perimeter (keep floor mostly plain without grid patterns)..." style="padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(192, 132, 252, 0.4); background: rgba(30, 41, 59, 0.8); color: #ffffff; font-size: 13px; outline: none; resize: vertical;">${savedPrompt}</textarea>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px;">
        <button id="btn-cancel-desc" class="btn-glass" style="padding: 8px 16px; border-radius: 8px; cursor: pointer; color: #cbd5e1;">Cancel</button>
        <button id="btn-submit-desc" class="btn-glass" style="padding: 8px 20px; border-radius: 8px; cursor: pointer; background: rgba(192, 132, 252, 0.35); border: 1px solid #c084fc; color: #ffffff; font-weight: 700; box-shadow: 0 0 14px rgba(192, 132, 252, 0.4);">✨ Generate Map</button>
      </div>
    </div>
  `;

  const textareaEl = modalEl.querySelector<HTMLTextAreaElement>("#gemini-desc-textarea")!;
  const cancelBtn = modalEl.querySelector<HTMLButtonElement>("#btn-cancel-desc")!;
  const submitBtn = modalEl.querySelector<HTMLButtonElement>("#btn-submit-desc")!;

  cancelBtn.addEventListener("click", () => {
    modalEl?.remove();
  });

  submitBtn.addEventListener("click", () => {
    const desc = textareaEl.value.trim();
    if (!isProxy) {
      localStorage.setItem("gemini_enhance_custom_prompt", desc);
    }
    modalEl?.remove();

    if (isProxy && proxyPeerId) {
      sendProxyEnhanceRequest(engine, box, desc, proxyPeerId);
    } else {
      runGeminiMapEnhancement(engine, box, desc);
    }
  });

  textareaEl.focus();
}

