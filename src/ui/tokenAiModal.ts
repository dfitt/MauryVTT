import { CanvasEngine } from "../canvas/canvasEngine.js";
import { sessionManager } from "../network/sessionManager.js";
import { docStore } from "../state/documentStore.js";
import { assetStore } from "../state/idbAssetStore.js";
import { processTokenImageFile, ProcessedImageResult } from "../canvas/imageResizer.js";
import { openGeminiApiKeyModal, checkOrFindProxyPeer, showEnhanceToast, getPeerUsername } from "./enhanceModal.js";

let tokenProxyListenersSetup = false;

export async function openAiTokenGenerateModal(
  engine: CanvasEngine,
  createAndDispatchToken: (processed: ProcessedImageResult) => Promise<void>
): Promise<void> {
  const apiKey = localStorage.getItem("gemini_api_key");
  const lastFailed = localStorage.getItem("gemini_enhance_last_failed") === "true";

  if (!apiKey || lastFailed) {
    const proxyId = await checkOrFindProxyPeer();
    if (proxyId) {
      openAiTokenDescriptionModal(engine, createAndDispatchToken, true, proxyId);
    } else {
      openGeminiApiKeyModal(() => openAiTokenDescriptionModal(engine, createAndDispatchToken, false, null));
    }
  } else {
    openAiTokenDescriptionModal(engine, createAndDispatchToken, false, null);
  }
}

export function openAiTokenDescriptionModal(
  engine: CanvasEngine,
  createAndDispatchToken: (processed: ProcessedImageResult) => Promise<void>,
  isProxy: boolean = false,
  proxyPeerId: string | null = null
): void {
  let oldModal = document.getElementById("vtt-token-ai-modal");
  if (oldModal) oldModal.remove();

  const modal = document.createElement("div");
  modal.id = "vtt-token-ai-modal";
  modal.style.cssText = "position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 99999;";

  const savedDesc = localStorage.getItem("gemini_token_custom_prompt") || "";

  modal.innerHTML = `
    <div style="background: rgba(15, 23, 42, 0.96); border: 1px solid rgba(56, 189, 248, 0.6); border-radius: 14px; padding: 24px; max-width: 480px; width: 92%; box-shadow: 0 16px 48px rgba(0,0,0,0.85); color: #f8fafc; font-family: Outfit, sans-serif; display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 24px;">🤖</span>
        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #38bdf8;">AI Token Generator</h3>
      </div>
      <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
        Describe the character, creature, or monster you want to generate as a top-down VTT token.
        ${isProxy ? `<span style="display: block; margin-top: 6px; color: #c084fc; font-weight: 600;">🚀 Generating via proxy through ${getPeerUsername(proxyPeerId)}'s API key!</span>` : ""}
      </p>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label style="font-size: 12px; font-weight: 700; color: #38bdf8;">Character / Monster Description</label>
        <textarea id="gemini-token-desc-textarea" rows="4" placeholder="e.g. A fierce dwarven paladin wielding a glowing warhammer, golden armor, flowing red beard, clean top-down view..." style="padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.4); background: rgba(30, 41, 59, 0.8); color: #ffffff; font-size: 13px; outline: none; resize: vertical;">${savedDesc}</textarea>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px;">
        <button id="btn-cancel-token-desc" class="btn-glass" style="padding: 8px 16px; border-radius: 8px; cursor: pointer; color: #cbd5e1;">Cancel</button>
        <button id="btn-submit-token-desc" class="btn-glass" style="padding: 8px 20px; border-radius: 8px; cursor: pointer; background: rgba(56, 189, 248, 0.35); border: 1px solid #38bdf8; color: #ffffff; font-weight: 700; box-shadow: 0 0 14px rgba(56, 189, 248, 0.4);">✨ Generate Token</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const textareaEl = modal.querySelector<HTMLTextAreaElement>("#gemini-token-desc-textarea")!;
  const cancelBtn = modal.querySelector<HTMLButtonElement>("#btn-cancel-token-desc")!;
  const submitBtn = modal.querySelector<HTMLButtonElement>("#btn-submit-token-desc")!;

  cancelBtn.addEventListener("click", () => modal.remove());

  submitBtn.addEventListener("click", async () => {
    const desc = textareaEl.value.trim();
    if (!desc) {
      showEnhanceToast("⚠️ Please enter a description for the token.", 4000);
      return;
    }
    localStorage.setItem("gemini_token_custom_prompt", desc);
    modal.remove();

    if (isProxy && proxyPeerId) {
      sendProxyTokenRequest(engine, desc, proxyPeerId);
    } else {
      await runAiTokenGeneration(engine, desc, engine.drawColor, createAndDispatchToken);
    }
  });

  textareaEl.focus();
}

export function sendProxyTokenRequest(engine: CanvasEngine, description: string, proxyPeerId: string): void {
  const myId = sessionManager.myPeerId || "local";
  const myUsername = sessionManager.myUsername || "Me";
  const reqId = "tok-req-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
  const friendName = getPeerUsername(proxyPeerId);
  showEnhanceToast(`🚀 Requesting AI Token generation by proxy through ${friendName}'s API key... (~10-20s)`, 30000);
  console.log(`[TokenAiProxy] Sending TOKEN_PROXY_REQ to proxyPeerId="${proxyPeerId}" (reqId="${reqId}", requester="${myUsername}" (${myId}))`);
  sessionManager.sendEphemeral({
    type: "TOKEN_PROXY_REQ",
    reqId,
    requesterPeerId: myId,
    requesterUsername: myUsername,
    proxyPeerId,
    description,
    ringColor: engine.drawColor
  } as any);
}

export async function runAiTokenGeneration(
  engine: CanvasEngine,
  description: string,
  ringColor: string,
  createAndDispatchToken: (processed: ProcessedImageResult) => Promise<void>
): Promise<void> {
  const apiKey = localStorage.getItem("gemini_api_key");
  const modelName = localStorage.getItem("gemini_enhance_model") || "gemini-3.1-flash-image";

  if (!apiKey) {
    showEnhanceToast("❌ No API key found. Please configure an API key.", 5000);
    return;
  }

  showEnhanceToast("✨ Generating AI Token art with Gemini... (~10-20s)", 30000);

  try {
    const resultBase64 = await callGeminiTokenImageGeneration(apiKey, description, modelName);
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
    const file = new File([blob], "gemini_ai_token.png", { type: "image/png" });

    const processed = await processTokenImageFile(file, ringColor || engine.drawColor);
    await createAndDispatchToken(processed);
    engine.setTool("select");

    showEnhanceToast("✅ AI Token generated and added to canvas!", 5000);
  } catch (err: any) {
    console.error("[TokenAiGen] Error during AI Token Generation:", err);
    showEnhanceToast(`❌ AI Token Error: ${err.message || err}`, 10000);
  }
}

export async function callGeminiTokenImageGeneration(apiKey: string, description: string, modelName: string): Promise<string | null> {
  const modelsToTry = [
    modelName,
    "gemini-3.1-flash-image",
    "gemini-2.5-flash-image",
    "gemini-2.0-flash-exp",
    "imagen-3.0-generate-002"
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  const promptText = `You are a master virtual tabletop RPG character and monster token artist. Generate a high-resolution, top-down or 3/4 top-down tabletop RPG character/creature illustration suitable for a circular digital VTT token.
The character or creature MUST be centered, clearly defined, vibrant, and drawn with clean outlines and rich shading.
The background surrounding the character/creature MUST be completely stark white (#FFFFFF) so it can be neatly cropped into a circle.
Do NOT include any text, stats, titles, UI elements, or floor grids.
Character/Creature Description:
"${description}"`;

  const errorsCollected: string[] = [];

  for (const model of modelsToTry) {
    try {
      if (model.includes("imagen")) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${encodeURIComponent(apiKey)}`;
        const requestPayload = {
          instances: [{ prompt: promptText }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            sampleImageSize: "512x512",
            imageSize: "512x512"
          }
        };

        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload)
        });

        if (!resp.ok) {
          const errTxt = await resp.text();
          errorsCollected.push(`[${model}] HTTP ${resp.status}: ${errTxt.substring(0, 200)}`);
          continue;
        }

        const data = await resp.json();
        const base64Out = data.predictions?.[0]?.bytesBase64Encoded || data.predictions?.[0]?.mimeTypeBase64;
        if (base64Out) return base64Out;
      } else {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const basePayload = {
          contents: [{ parts: [{ text: promptText }] }]
        };

        const configsToTry = [
          { responseModalities: ["IMAGE", "TEXT"], imageConfig: { imageSize: "512x512", aspectRatio: "1:1" } },
          { responseModalities: ["IMAGE"], imageConfig: { imageSize: "512x512", aspectRatio: "1:1" } },
          { responseModalities: ["IMAGE", "TEXT"] },
          { responseModalities: ["IMAGE"] },
          null
        ];

        let foundData: string | null = null;
        for (const genCfg of configsToTry) {
          const payload = genCfg ? { ...basePayload, generationConfig: genCfg } : basePayload;
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          if (!resp.ok) {
            const errTxt = await resp.text();
            errorsCollected.push(`[${model} | cfg: ${JSON.stringify(genCfg)}] HTTP ${resp.status}: ${errTxt.substring(0, 200)}`);
            continue;
          }

          const data = await resp.json();
          const parts = data.candidates?.[0]?.content?.parts || [];
          for (const p of parts) {
            if (p.inlineData?.data) { foundData = p.inlineData.data; break; }
            if (p.inline_data?.data) { foundData = p.inline_data.data; break; }
            if (p.text && p.text.includes("data:image/png;base64,")) {
              const m = p.text.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
              if (m) { foundData = m[1]; break; }
            }
          }
          if (foundData) break;
        }
        if (foundData) return foundData;
      }
    } catch (e: any) {
      errorsCollected.push(`[${model}] Exception: ${e.message || e}`);
    }
  }

  throw new Error(`All token image generation models failed: ${errorsCollected.join("; ")}`);
}

export function setupTokenProxyListeners(
  engine: CanvasEngine,
  createAndDispatchToken: (processed: ProcessedImageResult) => Promise<void>
): void {
  if (tokenProxyListenersSetup) return;
  tokenProxyListenersSetup = true;

  sessionManager.onEphemeral(async (payload: any) => {
    if (!payload || typeof payload !== "object") return;
    const myId = sessionManager.myPeerId || "local";

    if (payload.type === "TOKEN_PROXY_REQ") {
      if (payload.proxyPeerId === myId || payload.proxyPeerId === "any") {
        console.group(`[TokenAiProxy] Handling proxy token request from ${payload.requesterUsername} (${payload.requesterPeerId})`);
        const apiKey = localStorage.getItem("gemini_api_key");
        if (!apiKey) {
          sessionManager.sendEphemeral({
            type: "TOKEN_PROXY_RES",
            reqId: payload.reqId,
            requesterPeerId: payload.requesterPeerId,
            proxyPeerId: myId,
            status: "error",
            error: "Proxy host does not have a valid Gemini API key configured."
          } as any);
          console.groupEnd();
          return;
        }

        try {
          const modelName = localStorage.getItem("gemini_enhance_model") || "gemini-3.1-flash-image";
          const resultBase64 = await callGeminiTokenImageGeneration(apiKey, payload.description, modelName);
          if (!resultBase64) {
            throw new Error("No image output returned during proxy token generation.");
          }

          const byteString = atob(resultBase64);
          const arrayBuffer = new ArrayBuffer(byteString.length);
          const uint8Array = new Uint8Array(arrayBuffer);
          for (let i = 0; i < byteString.length; i++) {
            uint8Array[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([uint8Array], { type: "image/png" });
          const file = new File([blob], "gemini_ai_token_proxy.png", { type: "image/png" });

          const processed = await processTokenImageFile(file, payload.ringColor || "#38bdf8");
          await assetStore.saveAsset(processed.assetHash, processed.blob);
          docStore.registerAssetManifest(
            processed.assetHash,
            processed.mimeType,
            processed.byteSize,
            processed.widthPx,
            processed.heightPx
          );

          sessionManager.sendEphemeral({
            type: "TOKEN_PROXY_RES",
            reqId: payload.reqId,
            requesterPeerId: payload.requesterPeerId,
            proxyPeerId: myId,
            status: "success",
            assetManifestEntry: {
              assetHash: processed.assetHash,
              mimeType: processed.mimeType,
              byteSize: processed.byteSize,
              widthPx: processed.widthPx,
              heightPx: processed.heightPx
            },
            description: payload.description,
            ringColor: payload.ringColor
          } as any);
        } catch (err: any) {
          console.error("[TokenAiProxy] Proxy token generation error:", err);
          sessionManager.sendEphemeral({
            type: "TOKEN_PROXY_RES",
            reqId: payload.reqId,
            requesterPeerId: payload.requesterPeerId,
            proxyPeerId: myId,
            status: "error",
            error: err.message || String(err)
          } as any);
        }
        console.groupEnd();
      }
    } else if (payload.type === "TOKEN_PROXY_RES") {
      if (payload.requesterPeerId === myId) {
        if (payload.status === "error") {
          showEnhanceToast(`❌ Token generation via proxy failed: ${payload.error}`, 8000);
        } else if (payload.status === "success" && payload.assetManifestEntry) {
          docStore.registerAssetManifest(
            payload.assetManifestEntry.assetHash,
            payload.assetManifestEntry.mimeType,
            payload.assetManifestEntry.byteSize,
            payload.assetManifestEntry.widthPx,
            payload.assetManifestEntry.heightPx
          );
          sessionManager.syncMissingAssets();
          showEnhanceToast("✨ AI Token generated! Transferring token art from proxy...", 4000);

          let attempts = 0;
          const checkTimer = setInterval(async () => {
            attempts++;
            const hasBlob = await assetStore.hasAsset(payload.assetManifestEntry.assetHash);
            if (hasBlob) {
              clearInterval(checkTimer);
              const blob = await assetStore.getAsset(payload.assetManifestEntry.assetHash);
              if (blob) {
                const processed: ProcessedImageResult = {
                  assetHash: payload.assetManifestEntry.assetHash,
                  blob,
                  mimeType: payload.assetManifestEntry.mimeType,
                  byteSize: payload.assetManifestEntry.byteSize,
                  widthPx: payload.assetManifestEntry.widthPx,
                  heightPx: payload.assetManifestEntry.heightPx
                };
                await createAndDispatchToken(processed);
                engine.setTool("select");
                showEnhanceToast("✅ AI Token generated via proxy and added to canvas!", 5000);
              }
            } else if (attempts > 80) {
              clearInterval(checkTimer);
              showEnhanceToast("⚠️ Token image transfer timed out from proxy.", 6000);
            }
          }, 250);
        }
      }
    }
  });
}
