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

  modalEl.innerHTML = `
    <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(192, 132, 252, 0.5); border-radius: 12px; padding: 24px; max-width: 480px; width: 90%; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.8); color: #f8fafc; font-family: sans-serif; display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 24px;">✨</span>
        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #c084fc;">AI Map Enhancement (/enhance)</h3>
      </div>
      <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
        To generate enhanced tabletop battlemaps from your sketches and fills, please enter your Google Gemini API Key.
        <br/><br/>
        <strong style="color: #38bdf8;">Privacy Guarantee:</strong> Your key is stored exclusively in your browser's local storage (<code>localStorage</code>) and is <strong>NEVER</strong> transmitted over P2P connections or saved to any VTT document.
      </p>
      
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label style="font-size: 12px; font-weight: 600; color: #e2e8f0;">Gemini API Key</label>
        <input type="password" id="gemini-apikey-input" value="${currentKey}" placeholder="AIzaSy..." style="padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(192, 132, 252, 0.4); background: rgba(30, 41, 59, 0.8); color: #ffffff; font-size: 14px; outline: none;" />
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
  const modelEl = modalEl.querySelector<HTMLInputElement>("#gemini-model-input")!;
  const cancelBtn = modalEl.querySelector<HTMLButtonElement>("#btn-cancel-gemini-apikey")!;
  const saveBtn = modalEl.querySelector<HTMLButtonElement>("#btn-save-gemini-apikey")!;

  cancelBtn.addEventListener("click", () => {
    modalEl?.remove();
  });

  saveBtn.addEventListener("click", () => {
    const keyVal = inputEl.value.trim();
    const modelVal = modelEl.value.trim() || "gemini-2.5-flash-image";
    if (!keyVal) {
      alert("Please enter a valid Gemini API Key.");
      return;
    }
    localStorage.setItem("gemini_api_key", keyVal);
    localStorage.setItem("gemini_enhance_model", modelVal);
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

async function callGeminiImageGeneration(base64Image: string, apiKey: string, modelName: string): Promise<string | null> {
  const modelsToTry = [
    modelName,
    "gemini-3.1-flash-image",
    "gemini-2.5-flash-image",
    "gemini-2.0-flash-exp",
    "imagen-3.0-generate-002"
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  const promptText = "You are a master virtual tabletop RPG map designer specializing in classic old-school D&D cartography. Look at the provided top-down drawing and room fills as a layout guide and blueprint. Generate a high-resolution, top-down, overhead 2D tabletop RPG battlemap designed in an oldschool D&D, OSR (Old School Renaissance), and Dungeon Crawl Classics (DCC) art style. The map MUST be drawn in crisp black and white ink with classic crosshatching, hand-drawn ink line walls, stippling, and retro dungeon cartography textures while preserving the exact spatial boundaries, room layouts, pathways, and alignments shown in the sketch guide.";

  for (const model of modelsToTry) {
    console.log(`[Enhance] Attempting map generation with model: ${model}`);
    try {
      if (model.includes("imagen")) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${encodeURIComponent(apiKey)}`;
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
          })
        });
        if (!resp.ok) {
          const errTxt = await resp.text();
          console.warn(`[Enhance] Model ${model} returned ${resp.status}: ${errTxt}`);
          continue;
        }
        const data = await resp.json();
        const base64Out = data.predictions?.[0]?.bytesBase64Encoded || data.predictions?.[0]?.mimeTypeBase64;
        if (base64Out) return base64Out;
      } else {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
            ],
            generationConfig: {
              responseMimeType: "image/png"
            }
          })
        });
        if (!resp.ok) {
          const errTxt = await resp.text();
          console.warn(`[Enhance] Model ${model} returned ${resp.status}: ${errTxt}`);
          continue;
        }
        const data = await resp.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        for (const p of parts) {
          if (p.inlineData?.data) return p.inlineData.data;
          if (p.inline_data?.data) return p.inline_data.data;
        }
        for (const p of parts) {
          if (p.text && p.text.includes("data:image/png;base64,")) {
            const m = p.text.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
            if (m) return m[1];
          }
        }
      }
    } catch (e) {
      console.warn(`[Enhance] Exception during fetch with model ${model}:`, e);
    }
  }

  throw new Error("Could not generate image output with Gemini API. Verify your API key and permissions.");
}

export async function runGeminiMapEnhancement(engine: CanvasEngine, box: { x: number; y: number; width: number; height: number }): Promise<void> {
  const apiKey = localStorage.getItem("gemini_api_key");
  const lastFailed = localStorage.getItem("gemini_enhance_last_failed") === "true";
  if (!apiKey || lastFailed) {
    openGeminiApiKeyModal(() => runGeminiMapEnhancement(engine, box));
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

    const resultBase64 = await callGeminiImageGeneration(base64Image, apiKey, modelName);
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
      zIndex: lowestZ - 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastModifiedBy: sessionManager.myPeerId || "local",
      locked: false,
      assetHash: processed.assetHash,
      position: { x: box.x, y: box.y },
      size: { width: box.width, height: box.height },
      rotation: 0,
      opacity: 1.0
    };

    sessionManager.dispatchOperation({ opType: "CREATE_ENTITY", entity: newMapImage });
    engine.setTool("select");
    localStorage.removeItem("gemini_enhance_last_failed");
    showEnhanceToast("✨ AI Map Enhancement complete! Map placed aligned underneath your drawings.", 6000);
  } catch (err: any) {
    console.error("[Enhance] Error during Gemini Map Enhancement:", err);
    localStorage.setItem("gemini_enhance_last_failed", "true");
    showEnhanceToast(`❌ Enhance Error: ${err.message || err}`, 8000);
  }
}
