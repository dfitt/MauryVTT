import { CanvasEngine } from "../canvas/canvasEngine.js";
import { sessionManager } from "../network/sessionManager.js";
import { docStore } from "../state/documentStore.js";
import { assetStore } from "../state/idbAssetStore.js";
import { TokenEntity, ImageEntity } from "../types/vtt.js";
import { openGeminiApiKeyModal, checkOrFindProxyPeer, showEnhanceToast, getPeerUsername } from "./enhanceModal.js";

let imageGenProxyListenersSetup = false;

export async function openAiImageGenerateModal(
  engine: CanvasEngine,
  isProxy: boolean = false,
  proxyPeerId: string | null = null
): Promise<void> {
  const apiKey = localStorage.getItem("gemini_api_key");
  const lastFailed = localStorage.getItem("gemini_enhance_last_failed") === "true";

  if (!apiKey || lastFailed) {
    if (!isProxy) {
      const proxyId = await checkOrFindProxyPeer();
      if (proxyId) {
        openImageGenDescriptionModal(engine, true, proxyId);
        return;
      } else {
        openGeminiApiKeyModal(() => openImageGenDescriptionModal(engine, false, null));
        return;
      }
    }
  }

  openImageGenDescriptionModal(engine, isProxy, proxyPeerId);
}

export async function openImageGenDescriptionModal(
  engine: CanvasEngine,
  isProxy: boolean = false,
  proxyPeerId: string | null = null
): Promise<void> {
  let oldModal = document.getElementById("vtt-image-gen-modal");
  if (oldModal) oldModal.remove();

  const modal = document.createElement("div");
  modal.id = "vtt-image-gen-modal";
  modal.style.cssText = "position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 99999;";

  const savedDesc = localStorage.getItem("gemini_image_custom_prompt") || "";

  // Collect up to 15 unique non-blank tokens from the canvas
  const doc = docStore.getDocument();
  const tokenCandidates: TokenEntity[] = [];
  const seenNames = new Set<string>();

  for (const ent of Object.values(doc.entities)) {
    if (ent.type === "token" && ent.label && ent.label.trim() !== "") {
      const labelClean = ent.label.trim();
      if (!seenNames.has(labelClean.toLowerCase())) {
        seenNames.add(labelClean.toLowerCase());
        tokenCandidates.push(ent as TokenEntity);
      }
    }
  }
  let selectedTokens: TokenEntity[] = tokenCandidates.slice(0, 15);

  modal.innerHTML = `
    <div style="background: rgba(15, 23, 42, 0.96); border: 1px solid rgba(56, 189, 248, 0.6); border-radius: 14px; padding: 24px; max-width: 520px; width: 92%; box-shadow: 0 16px 48px rgba(0,0,0,0.85); color: #f8fafc; font-family: Outfit, sans-serif; display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 24px;">🎨</span>
        <div>
          <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #38bdf8;">AI Scene / Illustration Generator</h3>
          <span style="font-size: 11px; color: #94a3b8;">Create vivid art referencing character tokens right from your tabletop</span>
        </div>
      </div>

      <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
        Enter a description of the scene or illustration. You can refer directly to named tokens on the map (e.g., <i>"Jack shoots a green death ray at Robin"</i>).
        ${isProxy ? `<span style="display: block; margin-top: 6px; color: #c084fc; font-weight: 600;">🚀 Generating via proxy through ${getPeerUsername(proxyPeerId)}'s API key!</span>` : ""}
      </p>

      <div id="imagegen-tokens-container"></div>

      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label style="font-size: 12px; font-weight: 700; color: #38bdf8;">Scene Description & Action</label>
        <textarea id="gemini-imagegen-desc-textarea" rows="4" placeholder="e.g. Jack shoots a green death ray at Robin. Robin is disintegrated." style="padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.4); background: rgba(30, 41, 59, 0.8); color: #ffffff; font-size: 13px; outline: none; resize: vertical; font-family: inherit;"></textarea>
        <span style="font-size: 11px; color: #64748b; font-style: italic;">
          ✨ <b>Default Style:</b> Dark Fantasy Illustration (You can override this right in your prompt, e.g., "in a vibrant watercolor style" or "realistic oil painting").
        </span>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px;">
        <button id="btn-cancel-imagegen-desc" class="btn-glass" style="padding: 8px 16px; border-radius: 8px; cursor: pointer; color: #cbd5e1;">Cancel</button>
        <button id="btn-submit-imagegen-desc" class="btn-glass" style="padding: 8px 20px; border-radius: 8px; cursor: pointer; background: rgba(56, 189, 248, 0.35); border: 1px solid #38bdf8; color: #ffffff; font-weight: 700; box-shadow: 0 0 14px rgba(56, 189, 248, 0.4);">✨ Generate Image (~15-25s)</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const renderTokensList = () => {
    const container = modal.querySelector<HTMLElement>("#imagegen-tokens-container");
    if (!container) return;

    if (selectedTokens.length > 0) {
      container.innerHTML = `
        <div style="background: rgba(30, 41, 59, 0.65); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 6px; max-height: 120px; overflow-y: auto;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px;">Linked Character Reference Images (${selectedTokens.length}/15)</span>
            <span style="font-size: 10px; color: #94a3b8;">Left-click to insert • Right-click to remove</span>
          </div>
          <div id="imagegen-tokens-list" style="display: flex; flex-wrap: wrap; gap: 6px;"></div>
        </div>
      `;

      const listEl = container.querySelector<HTMLElement>("#imagegen-tokens-list");
      if (listEl) {
        for (const tok of selectedTokens) {
          const badge = document.createElement("span");
          badge.style.cssText = "background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 999px; padding: 2px 8px; font-size: 11px; color: #e2e8f0; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; user-select: none; transition: background 0.15s, border-color 0.15s;";
          badge.title = `Left-click to insert "${tok.label.trim()}" at cursor | Right-click to remove reference`;
          badge.innerHTML = `👤 ${tok.label.trim()}`;

          badge.addEventListener("mouseenter", () => {
            badge.style.background = "rgba(56, 189, 248, 0.3)";
            badge.style.borderColor = "#38bdf8";
          });
          badge.addEventListener("mouseleave", () => {
            badge.style.background = "rgba(56, 189, 248, 0.15)";
            badge.style.borderColor = "rgba(56, 189, 248, 0.4)";
          });

          badge.addEventListener("mousedown", (e) => {
            if (e.button === 0) {
              e.preventDefault();
            }
          });

          badge.addEventListener("click", (e) => {
            e.preventDefault();
            const textareaEl = modal.querySelector<HTMLTextAreaElement>("#gemini-imagegen-desc-textarea");
            if (!textareaEl) return;

            const name = tok.label.trim();
            const hasFocus = document.activeElement === textareaEl;
            const start = (hasFocus && textareaEl.selectionStart !== null) ? textareaEl.selectionStart : textareaEl.value.length;
            const end = (hasFocus && textareaEl.selectionEnd !== null) ? textareaEl.selectionEnd : textareaEl.value.length;

            const before = textareaEl.value.substring(0, start);
            const after = textareaEl.value.substring(end);

            let textToInsert = name;
            if (before.length > 0 && !/\s$/.test(before) && !/[\(\["']$/.test(before)) {
              textToInsert = " " + textToInsert;
            }
            if (after.length > 0 && !/^\s/.test(after) && !/^[,\.\?!\)\]"']/.test(after)) {
              textToInsert = textToInsert + " ";
            }

            textareaEl.value = before + textToInsert + after;
            const newCursorPos = before.length + textToInsert.length;
            textareaEl.focus();
            textareaEl.selectionStart = newCursorPos;
            textareaEl.selectionEnd = newCursorPos;
          });

          badge.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectedTokens = selectedTokens.filter((t) => t.id !== tok.id && t !== tok);
            renderTokensList();
          });

          listEl.appendChild(badge);
        }
      }
    } else {
      container.innerHTML = `
        <div style="background: rgba(30, 41, 59, 0.65); border: 1px dashed rgba(148, 163, 184, 0.35); border-radius: 8px; padding: 10px; font-size: 11px; color: #94a3b8; font-style: italic;">
          No named tokens selected for character reference. Generating scene using only your text description!
        </div>
      `;
    }
  };

  renderTokensList();

  const textareaEl = modal.querySelector<HTMLTextAreaElement>("#gemini-imagegen-desc-textarea")!;
  const cancelBtn = modal.querySelector<HTMLButtonElement>("#btn-cancel-imagegen-desc")!;
  const submitBtn = modal.querySelector<HTMLButtonElement>("#btn-submit-imagegen-desc")!;

  cancelBtn.addEventListener("click", () => modal.remove());

  submitBtn.addEventListener("click", async () => {
    const desc = textareaEl.value.trim();
    if (!desc) {
      showEnhanceToast("⚠️ Please enter a description for the image.", 4000);
      return;
    }
    localStorage.setItem("gemini_image_custom_prompt", desc);
    modal.remove();

    // Prepare reference base64 data for all selected tokens
    const doc = docStore.getDocument();
    const tokenRefs: { label: string; base64: string; mimeType: string; description?: string }[] = [];
    for (const tok of selectedTokens) {
      if (tok.assetHash) {
        const blob = await assetStore.getAsset(tok.assetHash);
        if (blob) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result as string;
              resolve(res.includes(",") ? res.split(",")[1] : res);
            };
            reader.readAsDataURL(blob);
          });

          // Check if token is claimed and has a character sheet description
          let description: string | undefined = undefined;
          let claimingUsername = tok.primaryOwnerUsername;
          if (!claimingUsername && doc.primaryTokens) {
            for (const [uname, tid] of Object.entries(doc.primaryTokens)) {
              if (tid === tok.id) {
                claimingUsername = uname;
                break;
              }
            }
          }
          if (!claimingUsername && doc.characterSheets) {
            const tokLabelLower = tok.label.trim().toLowerCase();
            for (const [uname, sheet] of Object.entries(doc.characterSheets)) {
              if (
                uname.toLowerCase() === tokLabelLower ||
                (sheet.characterName && sheet.characterName.trim().toLowerCase() === tokLabelLower)
              ) {
                claimingUsername = uname;
                break;
              }
            }
          }

          if (claimingUsername && doc.characterSheets?.[claimingUsername]) {
            const sheetDesc = doc.characterSheets[claimingUsername].description;
            if (sheetDesc && sheetDesc.trim()) {
              description = sheetDesc.trim();
            }
          }

          tokenRefs.push({
            label: tok.label.trim(),
            base64,
            mimeType: blob.type || "image/png",
            ...(description ? { description } : {})
          });
        }
      }
    }

    if (isProxy && proxyPeerId) {
      sendProxyImageGenRequest(desc, tokenRefs, proxyPeerId);
    } else {
      await runAiImageGeneration(engine, desc, tokenRefs);
    }
  });

  textareaEl.focus();
  textareaEl.selectionStart = textareaEl.value.length;
  textareaEl.selectionEnd = textareaEl.value.length;
}

export function sendProxyImageGenRequest(
  prompt: string,
  tokenRefs: { label: string; base64: string; mimeType: string; description?: string }[],
  proxyPeerId: string
): void {
  const myId = sessionManager.myPeerId || "local";
  const myUsername = sessionManager.myUsername || "Me";
  const reqId = "img-req-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
  const friendName = getPeerUsername(proxyPeerId);
  showEnhanceToast(`🚀 Requesting AI Scene Illustration generation by proxy through ${friendName}'s API key... (~15-25s)`, 35000);
  console.log(`[ImageGenProxy] Sending IMAGE_GEN_PROXY_REQ to proxyPeerId="${proxyPeerId}" (reqId="${reqId}", requester="${myUsername}" (${myId}))`);
  sessionManager.sendEphemeral({
    type: "IMAGE_GEN_PROXY_REQ",
    reqId,
    requesterPeerId: myId,
    requesterUsername: myUsername,
    proxyPeerId,
    prompt,
    tokenRefs
  } as any);
}

export async function runAiImageGeneration(
  engine: CanvasEngine,
  prompt: string,
  tokenRefs: { label: string; base64: string; mimeType: string; description?: string }[]
): Promise<void> {
  const apiKey = localStorage.getItem("gemini_api_key");
  const modelName = localStorage.getItem("gemini_enhance_model") || "gemini-3.1-flash-image";

  if (!apiKey) {
    showEnhanceToast("❌ No API key found. Please configure a Gemini API key.", 5000);
    return;
  }

  showEnhanceToast("✨ Generating AI Scene Illustration with Gemini... (~15-25s)", 35000);

  try {
    const resultBase64 = await callGeminiSceneImageGeneration(tokenRefs, apiKey, modelName, prompt);
    if (!resultBase64) {
      throw new Error("No image output returned by Gemini API.");
    }
    openImageGenPreviewModal(engine, resultBase64, prompt);
  } catch (err: any) {
    console.error("[ImageGen] Error during AI Scene Illustration Generation:", err);
    showEnhanceToast(`❌ AI Illustration Error: ${err.message || err}`, 10000);
  }
}

export function openImageGenPreviewModal(engine: CanvasEngine, base64Image: string, prompt: string): void {
  engine.setTool("select");
  let oldModal = document.getElementById("vtt-image-preview-modal");
  if (oldModal) oldModal.remove();

  const modal = document.createElement("div");
  modal.id = "vtt-image-preview-modal";
  modal.style.cssText = "position: fixed; inset: 0; background: rgba(0, 0, 0, 0.82); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 99999;";

  const imgUri = `data:image/png;base64,${base64Image}`;

  modal.innerHTML = `
    <div style="background: rgba(15, 23, 42, 0.96); border: 1px solid rgba(56, 189, 248, 0.6); border-radius: 16px; padding: 24px; max-width: 680px; width: 94%; max-height: 90vh; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.9); color: #f8fafc; font-family: Outfit, sans-serif;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 24px;">🖼️</span>
          <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #38bdf8;">AI Generated Illustration</h3>
        </div>
        <button id="btn-close-preview" style="background: transparent; border: none; color: #94a3b8; font-size: 20px; cursor: pointer;">✕</button>
      </div>

      <div style="overflow: hidden; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.3); display: flex; align-items: center; justify-content: center; background: #000; max-height: 520px;">
        <img src="${imgUri}" style="max-width: 100%; max-height: 520px; object-fit: contain;" />
      </div>

      <div style="font-size: 13px; color: #cbd5e1; background: rgba(30, 41, 59, 0.6); padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1); max-height: 60px; overflow-y: auto;">
        <b>Prompt:</b> ${prompt}
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 6px;">
        <button id="btn-retry-imagegen" class="btn-glass" style="padding: 10px 18px; border-radius: 8px; cursor: pointer; color: #cbd5e1; font-weight: 600;">🔄 Retry / New Prompt</button>
        <button id="btn-add-to-canvas" class="btn-glass" style="padding: 10px 24px; border-radius: 8px; cursor: pointer; background: rgba(34, 197, 94, 0.3); border: 1px solid #22c55e; color: #fff; font-weight: 700; box-shadow: 0 0 16px rgba(34, 197, 94, 0.4);">🟢 Add to Canvas (As Image)</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = modal.querySelector<HTMLButtonElement>("#btn-close-preview")!;
  const retryBtn = modal.querySelector<HTMLButtonElement>("#btn-retry-imagegen")!;
  const addBtn = modal.querySelector<HTMLButtonElement>("#btn-add-to-canvas")!;

  closeBtn.addEventListener("click", () => modal.remove());
  retryBtn.addEventListener("click", () => {
    modal.remove();
    openAiImageGenerateModal(engine);
  });

  addBtn.addEventListener("click", async () => {
    modal.remove();
    try {
      const byteString = atob(base64Image);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([uint8Array], { type: "image/png" });
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const assetHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      await assetStore.saveAsset(assetHash, blob);
      docStore.registerAssetManifest(assetHash, "image/png", blob.size, 1024, 1024);

      const center = engine.getViewportCenterInWorld();
      const allZ = Object.values(docStore.getDocument().entities).map((e) => e.zIndex);
      const maxZ = (allZ.length > 0 ? Math.max(...allZ) : 0) + 10;

      const newImg: ImageEntity = {
        id: "img_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        type: "image",
        layerId: "default",
        zIndex: maxZ,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: sessionManager.myPeerId || "local",
        locked: false,
        assetHash,
        position: { x: Math.round(center.x - 300), y: Math.round(center.y - 300) },
        size: { width: 600, height: 600 },
        rotation: 0,
        opacity: 1,
        isMap: false
      };

      sessionManager.dispatchOperation({ opType: "CREATE_ENTITY", entity: newImg });

      sessionManager.dispatchOperation({
        opType: "APPEND_CHAT_MESSAGE",
        message: {
          id: "msg_" + Date.now(),
          timestamp: Date.now(),
          senderPeerId: sessionManager.myPeerId || "local",
          senderUsername: sessionManager.myUsername || "AI System",
          content: `🎨 Generated and added new AI Scene Illustration to the canvas!`,
          type: "system"
        }
      });

      showEnhanceToast("✅ AI Scene Illustration added to canvas!", 5000);
    } catch (err: any) {
      console.error("[ImageGen] Error adding image to canvas:", err);
      showEnhanceToast(`❌ Error adding illustration: ${err.message || err}`, 8000);
    }
  });
}

export async function callGeminiSceneImageGeneration(
  tokenRefs: { label: string; base64: string; mimeType: string; description?: string }[],
  apiKey: string,
  modelName: string,
  promptText: string
): Promise<string> {
  const modelsToTry = [
    modelName,
    "gemini-3.1-flash-image",
    "gemini-3.0-flash",
    "gemini-2.5-flash",
    "imagen-3.0-generate-002"
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  const errorsCollected: string[] = [];

  const parts: any[] = [
    {
      text: `You are an expert digital fantasy artist generating a high quality scene illustration for our virtual tabletop roleplaying game.
Default Art Style: Dark Fantasy Illustration (unless explicitly overridden by instructions in the user prompt below).

${tokenRefs.length > 0 ? `We have provided ${tokenRefs.length} character reference image(s) below. Each image is explicitly labeled with the character's name. When the user's scene prompt mentions any of these character names, you MUST accurately depict their appearance, distinctive features, color palette, and attire from their reference image:` : ""}`
    }
  ];

  for (const ref of tokenRefs) {
    const safeFilename = ref.label.replace(/[^a-zA-Z0-9_-]/g, "_") + ".png";
    let textHeader = `\n[Character Reference Image: "${ref.label}" (Filename: ${safeFilename})]`;
    if (ref.description) {
      textHeader += `\n[Character Sheet Description for "${ref.label}":\n"${ref.description}"]`;
    }
    parts.push({ text: textHeader });
    parts.push({
      inline_data: {
        mime_type: ref.mimeType || "image/png",
        data: ref.base64
      }
    });
  }

  parts.push({
    text: `\nNow, generate a single new, complete high-quality Dark Fantasy Illustration according to the following user scene description:\n"${promptText}"\n\nGenerate and return ONLY the new image output.`
  });

  for (const model of modelsToTry) {
    console.group(`[ImageGen] Attempting generation with model: ${model}`);
    try {
      if (model.includes("imagen")) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${encodeURIComponent(apiKey)}`;
        const requestPayload = {
          instances: [{ prompt: `${promptText} (Style: Dark Fantasy Illustration)` }],
          parameters: { sampleCount: 1, aspectRatio: "1:1", sampleImageSize: "1024x1024" }
        };
        const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestPayload) });
        if (!resp.ok) {
          const errTxt = await resp.text();
          errorsCollected.push(`[${model}] HTTP ${resp.status}: ${errTxt.substring(0, 200)}`);
          console.groupEnd();
          continue;
        }
        const data = await resp.json();
        const base64Out = data.predictions?.[0]?.bytesBase64Encoded || data.predictions?.[0]?.mimeTypeBase64;
        if (base64Out) {
          console.groupEnd();
          return base64Out;
        }
      } else {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const basePayload = { contents: [{ parts }] };
        const configsToTry = [
          { responseModalities: ["IMAGE", "TEXT"], imageConfig: { imageSize: "1024x1024", aspectRatio: "1:1" } },
          { responseModalities: ["IMAGE"], imageConfig: { imageSize: "1024x1024", aspectRatio: "1:1" } },
          { responseModalities: ["IMAGE", "TEXT"] },
          { responseModalities: ["IMAGE"] },
          null
        ];

        let foundData: string | null = null;
        for (const genCfg of configsToTry) {
          const payload = genCfg ? { ...basePayload, generationConfig: genCfg } : basePayload;
          const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          if (!resp.ok) {
            const errTxt = await resp.text();
            errorsCollected.push(`[${model} | cfg: ${JSON.stringify(genCfg)}] HTTP ${resp.status}: ${errTxt.substring(0, 200)}`);
            continue;
          }
          const data = await resp.json();
          const respParts = data.candidates?.[0]?.content?.parts || [];
          for (const p of respParts) {
            if (p.inlineData?.data) { foundData = p.inlineData.data; break; }
            if (p.inline_data?.data) { foundData = p.inline_data.data; break; }
            if (p.text && p.text.includes("data:image/png;base64,")) {
              const m = p.text.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
              if (m) { foundData = m[1]; break; }
            }
          }
          if (foundData) break;
        }
        if (foundData) {
          console.groupEnd();
          return foundData;
        }
      }
    } catch (e: any) {
      errorsCollected.push(`[${model}] Exception: ${e.message || e}`);
    }
    console.groupEnd();
  }

  throw new Error(`All illustration generation models failed: ${errorsCollected.join("; ")}`);
}

export function setupImageGenProxyListeners(engine: CanvasEngine): void {
  if (imageGenProxyListenersSetup) return;
  imageGenProxyListenersSetup = true;

  sessionManager.onEphemeral(async (payload: any) => {
    if (!payload || typeof payload !== "object") return;
    const myId = sessionManager.myPeerId || "local";

    if (payload.type === "IMAGE_GEN_PROXY_REQ") {
      if (payload.proxyPeerId === myId || payload.proxyPeerId === "any") {
        console.group(`[ImageGenProxy] Handling proxy illustration request from ${payload.requesterUsername} (${payload.requesterPeerId})`);
        const apiKey = localStorage.getItem("gemini_api_key");
        if (!apiKey) {
          sessionManager.sendEphemeral({
            type: "IMAGE_GEN_PROXY_RES",
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
          const resultBase64 = await callGeminiSceneImageGeneration(payload.tokenRefs || [], apiKey, modelName, payload.prompt);
          if (!resultBase64) {
            throw new Error("No image output returned during proxy illustration generation.");
          }

          const byteString = atob(resultBase64);
          const arrayBuffer = new ArrayBuffer(byteString.length);
          const uint8Array = new Uint8Array(arrayBuffer);
          for (let i = 0; i < byteString.length; i++) {
            uint8Array[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([uint8Array], { type: "image/png" });
          const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const assetHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

          await assetStore.saveAsset(assetHash, blob);
          docStore.registerAssetManifest(assetHash, "image/png", blob.size, 1024, 1024);

          sessionManager.sendEphemeral({
            type: "IMAGE_GEN_PROXY_RES",
            reqId: payload.reqId,
            requesterPeerId: payload.requesterPeerId,
            proxyPeerId: myId,
            status: "success",
            assetManifestEntry: {
              assetHash,
              mimeType: "image/png",
              byteSize: blob.size,
              widthPx: 1024,
              heightPx: 1024
            },
            prompt: payload.prompt
          } as any);
        } catch (err: any) {
          console.error("[ImageGenProxy] Proxy illustration generation error:", err);
          sessionManager.sendEphemeral({
            type: "IMAGE_GEN_PROXY_RES",
            reqId: payload.reqId,
            requesterPeerId: payload.requesterPeerId,
            proxyPeerId: myId,
            status: "error",
            error: err.message || String(err)
          } as any);
        }
        console.groupEnd();
      }
    } else if (payload.type === "IMAGE_GEN_PROXY_RES") {
      if (payload.requesterPeerId === myId) {
        if (payload.status === "error") {
          showEnhanceToast(`❌ Illustration generation via proxy failed: ${payload.error}`, 8000);
        } else if (payload.status === "success" && payload.assetManifestEntry) {
          docStore.registerAssetManifest(
            payload.assetManifestEntry.assetHash,
            payload.assetManifestEntry.mimeType,
            payload.assetManifestEntry.byteSize,
            payload.assetManifestEntry.widthPx,
            payload.assetManifestEntry.heightPx
          );
          sessionManager.syncMissingAssets();
          showEnhanceToast("✨ AI Illustration generated! Transferring image art from proxy...", 4000);

          let attempts = 0;
          const checkTimer = setInterval(async () => {
            attempts++;
            const hasBlob = await assetStore.hasAsset(payload.assetManifestEntry.assetHash);
            if (hasBlob) {
              clearInterval(checkTimer);
              const blob = await assetStore.getAsset(payload.assetManifestEntry.assetHash);
              if (blob) {
                const base64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const res = reader.result as string;
                    resolve(res.includes(",") ? res.split(",")[1] : res);
                  };
                  reader.readAsDataURL(blob);
                });
                openImageGenPreviewModal(engine, base64, payload.prompt || "");
                showEnhanceToast("✅ AI Scene Illustration transferred from proxy!", 5000);
              }
            } else if (attempts > 80) {
              clearInterval(checkTimer);
              showEnhanceToast("⚠️ Illustration image transfer timed out from proxy.", 6000);
            }
          }, 250);
        }
      }
    }
  });
}
