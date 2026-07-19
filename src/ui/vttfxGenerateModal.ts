import { sessionManager } from "../network/sessionManager.js";
import { VttfxEffectItem, VttfxBundle, registerEffectFromVttfxItem } from "../effects/vttfxLoader.js";
import { openGeminiApiKeyModal, checkOrFindProxyPeer, showEnhanceToast } from "./enhanceModal.js";
import { ChatMessage } from "../types/vtt.js";

export async function openVttfxGenerateModal(): Promise<void> {
  const apiKey = localStorage.getItem("gemini_api_key");
  const lastFailed = localStorage.getItem("gemini_enhance_last_failed") === "true";

  if (!apiKey || lastFailed) {
    const proxyId = await checkOrFindProxyPeer();
    if (proxyId) {
      openVttfxGenerateDescriptionModal(true, proxyId);
    } else {
      openGeminiApiKeyModal(() => openVttfxGenerateDescriptionModal(false, null));
    }
  } else {
    openVttfxGenerateDescriptionModal(false, null);
  }
}

function openVttfxGenerateDescriptionModal(hasProxy: boolean, proxyPeerId: string | null): void {
  let oldModal = document.getElementById("vttfx-generate-desc-modal");
  if (oldModal) oldModal.remove();

  const modal = document.createElement("div");
  modal.id = "vttfx-generate-desc-modal";
  modal.style.cssText = "position: fixed; inset: 0; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 100000; font-family: sans-serif;";

  const windowEl = document.createElement("div");
  windowEl.style.cssText = "background: rgba(30, 41, 59, 0.98); border: 2px solid #c084fc; border-radius: 16px; width: 480px; max-width: 92vw; padding: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); color: #f8fafc; display: flex; flex-direction: column; gap: 16px;";

  const title = document.createElement("div");
  title.style.cssText = "font-size: 1.3em; font-weight: 800; color: #c084fc; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(192, 132, 252, 0.3); padding-bottom: 10px;";
  title.innerHTML = `✨ Generate AI VTTFX ${hasProxy ? '<span style="font-size: 0.7em; color: #38bdf8; background: rgba(56, 189, 248, 0.15); padding: 2px 8px; border-radius: 9999px;">Via Proxy Host</span>' : ''}`;

  const descTxt = document.createElement("div");
  descTxt.style.cssText = "font-size: 0.9em; color: #cbd5e1; line-height: 1.4;";
  descTxt.textContent = "Describe the icon and animation effect you want. Note: generation can take up to 30 seconds.";

  const iconLabel = document.createElement("label");
  iconLabel.style.cssText = "font-weight: 700; font-size: 0.85em; color: #38bdf8; display: flex; flex-direction: column; gap: 4px;";
  iconLabel.innerHTML = `Icon Description (or leave empty):`;
  const iconInput = document.createElement("textarea");
  iconInput.rows = 2;
  iconInput.placeholder = "e.g. A glowing magical blue fireball icon, or a golden shield with runes...";
  iconInput.style.cssText = "width: 100%; box-sizing: border-box; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 8px; padding: 10px; color: #fff; font-size: 0.95em; resize: vertical;";
  iconLabel.appendChild(iconInput);

  const animLabel = document.createElement("label");
  animLabel.style.cssText = "font-weight: 700; font-size: 0.85em; color: #e879f9; display: flex; flex-direction: column; gap: 4px;";
  animLabel.innerHTML = `Animation Description (or leave empty):`;
  const animInput = document.createElement("textarea");
  animInput.rows = 3;
  animInput.placeholder = "e.g. Expands outward and fades out while emitting golden sparkles, or spins rapidly while pulsing purple...";
  animInput.style.cssText = "width: 100%; box-sizing: border-box; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(232, 121, 249, 0.4); border-radius: 8px; padding: 10px; color: #fff; font-size: 0.95em; resize: vertical;";
  animLabel.appendChild(animInput);

  const buttons = document.createElement("div");
  buttons.style.cssText = "display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.cssText = "padding: 8px 16px; border-radius: 9999px; background: rgba(255,255,255,0.1); border: none; color: #cbd5e1; font-weight: 600; cursor: pointer;";
  cancelBtn.addEventListener("click", () => modal.remove());

  const generateBtn = document.createElement("button");
  generateBtn.textContent = "🚀 Generate VTTFX";
  generateBtn.style.cssText = "padding: 8px 20px; border-radius: 9999px; background: linear-gradient(135deg, #c084fc, #38bdf8); border: none; color: #0f172a; font-weight: 800; cursor: pointer; box-shadow: 0 0 15px rgba(192, 132, 252, 0.4);";
  
  generateBtn.addEventListener("click", async () => {
    const iconDesc = iconInput.value.trim();
    const animDesc = animInput.value.trim();
    modal.remove();

    if (hasProxy && proxyPeerId) {
      const reqId = "vttfx-req-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
      console.log(`[VttfxProxy] Sending VTTFX_PROXY_REQ. Request ID: ${reqId}, proxyPeerId: ${proxyPeerId}`);
      showEnhanceToast("✨ Requesting VTTFX generation from proxy... (Note: this can take up to 30 seconds)", 30000);
      sessionManager.sendEphemeral({
        type: "VTTFX_PROXY_REQ",
        reqId,
        requesterPeerId: sessionManager.myPeerId || "client",
        requesterUsername: sessionManager.myUsername || "Requester",
        proxyPeerId,
        iconDesc,
        animDesc
      });
    } else {
      const apiKey = localStorage.getItem("gemini_api_key");
      if (!apiKey) {
        showEnhanceToast("❌ No API key found. Please configure an API key.", 5000);
        return;
      }
      showEnhanceToast("✨ Generating VTTFX icon & animation... (Note: this can take up to 30 seconds)", 30000);
      try {
        const item = await callGeminiVttfxGeneration(apiKey, iconDesc, animDesc);
        openVttfxPreviewModal(item, iconDesc, animDesc, null);
      } catch (err: any) {
        console.error("[VttfxGen] Generation failed:", err);
        showEnhanceToast(`❌ VTTFX Generation failed: ${err.message || err}`, 8000);
      }
    }
  });

  buttons.appendChild(cancelBtn);
  buttons.appendChild(generateBtn);

  windowEl.appendChild(title);
  windowEl.appendChild(descTxt);
  windowEl.appendChild(iconLabel);
  windowEl.appendChild(animLabel);
  windowEl.appendChild(buttons);
  modal.appendChild(windowEl);
  document.body.appendChild(modal);
}

export function openVttfxPreviewModal(vttfxItem: VttfxEffectItem, iconDesc: string, animDesc: string, proxyPeerId: string | null): void {
  let oldModal = document.getElementById("vttfx-preview-modal");
  if (oldModal) oldModal.remove();

  const modal = document.createElement("div");
  modal.id = "vttfx-preview-modal";
  modal.style.cssText = "position: fixed; inset: 0; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 100000; font-family: sans-serif;";

  const windowEl = document.createElement("div");
  windowEl.style.cssText = "background: rgba(30, 41, 59, 0.98); border: 2px solid #38bdf8; border-radius: 16px; width: 500px; max-width: 94vw; padding: 24px; box-shadow: 0 24px 60px rgba(0,0,0,0.85); color: #f8fafc; display: flex; flex-direction: column; gap: 16px; align-items: center;";

  const title = document.createElement("div");
  title.style.cssText = "font-size: 1.3em; font-weight: 800; color: #38bdf8; width: 100%; border-bottom: 1px solid rgba(56, 189, 248, 0.3); padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center;";
  title.innerHTML = `<span>✨ VTTFX Preview: ${vttfxItem.name || "Custom Effect"}</span>`;

  // Icon preview card
  const iconCard = document.createElement("div");
  iconCard.style.cssText = "display: flex; align-items: center; gap: 16px; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(192, 132, 252, 0.5); border-radius: 12px; padding: 12px 20px; width: 100%; box-sizing: border-box;";
  iconCard.innerHTML = `
    <div style="font-size: 38px; display: flex; align-items: center; justify-content: center; width: 48px; height: 48px;">
      ${vttfxItem.iconSvg || "✨"}
    </div>
    <div style="display: flex; flex-direction: column; gap: 2px;">
      <span style="font-weight: 800; font-size: 1.1em; color: #f8fafc;">${vttfxItem.name || "Custom Effect"}</span>
      <span style="font-size: 0.8em; color: #94a3b8;">Duration: ${vttfxItem.durationMs || 800}ms | ID: <code>${vttfxItem.id}</code></span>
    </div>
  `;

  // Live animation looping stage
  const stageWrapper = document.createElement("div");
  stageWrapper.style.cssText = "display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%;";
  stageWrapper.innerHTML = `<span style="font-size: 0.8em; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Live Looping Animation Stage</span>`;

  const stage = document.createElement("div");
  stage.id = "vttfx-preview-stage";
  stage.style.cssText = "position: relative; width: 280px; height: 240px; background: radial-gradient(circle, #1e293b 0%, #0f172a 100%); border: 2px solid #c084fc; border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 20px rgba(0,0,0,0.8);";

  const fxContainer = document.createElement("div");
  fxContainer.style.cssText = "position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none;";
  stage.appendChild(fxContainer);
  stageWrapper.appendChild(stage);

  let animationTimer: any = null;
  const triggerAnimationLoop = () => {
    fxContainer.innerHTML = vttfxItem.effectSvg || "";
    // If particles are present, spawn mini DOM particles inside fxContainer
    if (vttfxItem.particles) {
      const p = vttfxItem.particles;
      const count = Math.min(p.count || 12, 30);
      for (let i = 0; i < count; i++) {
        const pEl = document.createElement("div");
        const color = p.colors?.[i % p.colors.length] || "#38bdf8";
        const size = (p.sizeRangePx?.[0] || 3) + Math.random() * ((p.sizeRangePx?.[1] || 6) - (p.sizeRangePx?.[0] || 3));
        const angle = Math.random() * Math.PI * 2;
        const dist = 10 + Math.random() * 80;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        pEl.style.cssText = `position: absolute; width: ${size}px; height: ${size}px; background: ${color}; border-radius: ${p.shape === 'circle' || p.shape === 'sparkle' ? '50%' : '2px'}; box-shadow: 0 0 8px ${color}; opacity: 1; transition: transform ${p.lifeMs || 600}ms ease-out, opacity ${p.lifeMs || 600}ms ease-out;`;
        fxContainer.appendChild(pEl);
        requestAnimationFrame(() => {
          pEl.style.transform = `translate(${dx}px, ${dy}px) scale(0.2)`;
          pEl.style.opacity = "0";
        });
      }
    }
  };

  triggerAnimationLoop();
  const loopInterval = (vttfxItem.durationMs || 800) + 400;
  animationTimer = setInterval(triggerAnimationLoop, loopInterval);

  // Buttons bar
  const buttonsBar = document.createElement("div");
  buttonsBar.style.cssText = "display: flex; justify-content: center; gap: 14px; width: 100%; margin-top: 8px;";

  const importBtn = document.createElement("button");
  importBtn.innerHTML = `🟢 Import`;
  importBtn.style.cssText = "padding: 8px 24px; border-radius: 9999px; background: #22c55e; border: none; color: #fff; font-weight: 800; font-size: 1em; cursor: pointer; box-shadow: 0 0 16px rgba(34, 197, 94, 0.4);";
  importBtn.addEventListener("click", () => {
    if (animationTimer) clearInterval(animationTimer);
    modal.remove();

    const finalBundle: VttfxBundle = {
      version: "1.0",
      bundleName: `AI VFX: ${vttfxItem.name}`,
      effects: [vttfxItem]
    };

    sessionManager.dispatchOperation({
      opType: "REGISTER_VTTFX_BUNDLE",
      bundle: finalBundle
    } as any);

    const newMsg: ChatMessage = {
      id: "sys-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      senderPeerId: sessionManager.myPeerId || "local",
      senderUsername: sessionManager.myUsername || "System",
      content: `✨ Imported AI-Generated VFX <strong>${vttfxItem.name}</strong> into session!`,
      type: "system"
    };
    sessionManager.dispatchOperation({ opType: "APPEND_CHAT_MESSAGE", message: newMsg });
    showEnhanceToast(`✅ VTTFX '${vttfxItem.name}' imported and available to all users!`, 5000);
  });

  const retryBtn = document.createElement("button");
  retryBtn.innerHTML = `🟡 Retry`;
  retryBtn.style.cssText = "padding: 8px 24px; border-radius: 9999px; background: #eab308; border: none; color: #fff; font-weight: 800; font-size: 1em; cursor: pointer; box-shadow: 0 0 16px rgba(234, 179, 8, 0.4);";
  retryBtn.addEventListener("click", () => {
    if (animationTimer) clearInterval(animationTimer);
    modal.remove();

    if (proxyPeerId) {
      const reqId = "vttfx-req-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
      console.log(`[VttfxProxy] Retrying request by proxy. Request ID: ${reqId}, Proxy Peer ID: ${proxyPeerId}`);
      showEnhanceToast("🔄 Retrying VTTFX generation via proxy... (Note: this can take up to 30 seconds)", 30000);
      sessionManager.sendEphemeral({
        type: "VTTFX_PROXY_REQ",
        reqId,
        requesterPeerId: sessionManager.myPeerId || "client",
        requesterUsername: sessionManager.myUsername || "Requester",
        proxyPeerId,
        iconDesc,
        animDesc
      });
    } else {
      const apiKey = localStorage.getItem("gemini_api_key");
      if (apiKey) {
        showEnhanceToast("🔄 Retrying VTTFX generation... (Note: this can take up to 30 seconds)", 30000);
        callGeminiVttfxGeneration(apiKey, iconDesc, animDesc)
          .then((item) => openVttfxPreviewModal(item, iconDesc, animDesc, null))
          .catch((err) => showEnhanceToast(`❌ Retry failed: ${err.message || err}`, 8000));
      }
    }
  });

  const abortBtn = document.createElement("button");
  abortBtn.innerHTML = `🔴 Abort`;
  abortBtn.style.cssText = "padding: 8px 24px; border-radius: 9999px; background: #ef4444; border: none; color: #fff; font-weight: 800; font-size: 1em; cursor: pointer; box-shadow: 0 0 16px rgba(239, 68, 68, 0.4);";
  abortBtn.addEventListener("click", () => {
    if (animationTimer) clearInterval(animationTimer);
    modal.remove();
    showEnhanceToast("🛑 VTTFX Generation aborted.", 3000);
  });

  buttonsBar.appendChild(importBtn);
  buttonsBar.appendChild(retryBtn);
  buttonsBar.appendChild(abortBtn);

  windowEl.appendChild(title);
  windowEl.appendChild(iconCard);
  windowEl.appendChild(stageWrapper);
  windowEl.appendChild(buttonsBar);
  modal.appendChild(windowEl);
  document.body.appendChild(modal);
}

export function setupVttfxProxyListeners(): void {
  sessionManager.onEphemeral(async (payload) => {
    const myId = sessionManager.myPeerId;
    if (!myId) return;

    if (payload.type === "VTTFX_PROXY_REQ") {
      if (payload.proxyPeerId === myId) {
        console.log(`[VttfxProxy] Received VTTFX_PROXY_REQ from: ${payload.requesterUsername} (${payload.requesterPeerId}). Request ID: ${payload.reqId}`);
        const apiKey = localStorage.getItem("gemini_api_key");
        if (!apiKey) {
          console.warn("[VttfxProxy] Denied VTTFX_PROXY_REQ: Local machine (proxy host) lacks API key configured in local storage.");
          sessionManager.sendEphemeral({
            type: "VTTFX_PROXY_RES",
            reqId: payload.reqId,
            requesterPeerId: payload.requesterPeerId,
            proxyPeerId: myId,
            status: "error",
            error: "Proxy host no longer has a valid API key configured in local storage."
          });
          return;
        }

        console.log(`[VttfxProxy] Local machine is processing VTTFX proxy generation via API...`);
        try {
          const item = await callGeminiVttfxGeneration(apiKey, payload.iconDesc, payload.animDesc);
          console.log(`[VttfxProxy] Proxy generation succeeded. Dispatching VTTFX_PROXY_RES for ID: ${payload.reqId}`);
          sessionManager.sendEphemeral({
            type: "VTTFX_PROXY_RES",
            reqId: payload.reqId,
            requesterPeerId: payload.requesterPeerId,
            proxyPeerId: myId,
            status: "success",
            vttfxItem: item,
            iconDesc: payload.iconDesc,
            animDesc: payload.animDesc
          });
        } catch (err: any) {
          const errMsg = err.message || String(err);
          console.error(`[VttfxProxy] Proxy generation failed for request ${payload.reqId} with error:`, errMsg);
          sessionManager.sendEphemeral({
            type: "VTTFX_PROXY_RES",
            reqId: payload.reqId,
            requesterPeerId: payload.requesterPeerId,
            proxyPeerId: myId,
            status: "error",
            error: errMsg
          });
        }
      }
    } else if (payload.type === "VTTFX_PROXY_RES") {
      if (payload.requesterPeerId === myId) {
        console.log(`[VttfxProxy] Received VTTFX_PROXY_RES for request ID: ${payload.reqId}. Status: ${payload.status}`);
        if (payload.status === "error") {
          console.error(`[VttfxProxy] Proxy reported error: ${payload.error}`);
          showEnhanceToast(`❌ Proxy VTTFX Generation Error: ${payload.error}`, 10000);
        } else if (payload.status === "success" && payload.vttfxItem) {
          console.log(`[VttfxProxy] Proxy reported success. Opening preview modal for generated VTTFX: ${payload.vttfxItem.name}`);
          openVttfxPreviewModal(payload.vttfxItem, payload.iconDesc || "", payload.animDesc || "", payload.proxyPeerId);
        }
      }
    }
  });
}

export async function callGeminiVttfxGeneration(apiKey: string, iconDesc: string, animDesc: string): Promise<VttfxEffectItem> {
  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-3.0-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash"
  ];

  const instructions = `You are a master SVG icon designer and CSS animation engineer for a dark-fantasy Virtual Tabletop (VTT).
Your task is to generate exactly ONE single VTTFX item consisting of 1 clean SVG icon and 1 looping CSS animation effect.
You MUST output a single valid JSON object strictly adhering to the following structure:
{
  "id": "unique_snake_case_effect_id",
  "name": "Short Display Name",
  "iconSvg": "<svg viewBox='0 0 64 64' width='1.25em' height='1.25em' data-vtt-icon='unique_snake_case_effect_id' style='vertical-align:-0.25em; display:inline-block; filter:drop-shadow(0 1px 3px rgba(0,0,0,0.85));'>...</svg>",
  "durationMs": 850,
  "effectSvg": "<style>@keyframes vttGenAnimName { ... }</style><div style='position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;'><svg viewBox='0 0 100 100' width='90' height='90' style='position: absolute; animation: vttGenAnimName 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;'>...</svg></div>",
  "particles": {
    "count": 24,
    "colors": ["#38bdf8", "#c084fc", "#ffffff"],
    "speedRange": [50, 150],
    "sizeRangePx": [2, 6],
    "gravity": -40,
    "shape": "sparkle",
    "lifeMs": 700
  }
}

CRITICAL RULES:
1. "id" must be a clean, unique snake_case string.
2. "iconSvg": Must be a high-quality 64x64 SVG (viewBox="0 0 64 64") suitable for dark backgrounds. Must contain data-vtt-icon="unique_snake_case_effect_id".
3. "effectSvg": Must contain a <style> block with custom @keyframes prefixed with vttGen, followed by a centered wrapper <div> containing animated <svg> or <div> shockwaves/rings. The effect must begin at 0% scale/opacity, reach dynamic full impact around 25%-45%, and smoothly fade out by 100%.
4. "durationMs": Between 650 and 1100.
5. "particles": Optional particle configuration where shape can be "circle", "sparkle", "ember", "splinter", or "note".
6. User Icon Request: "${iconDesc || 'A dynamic fantasy RPG icon'}"
7. User Animation Request: "${animDesc || 'A magical animated burst and glowing aura'}"

Return ONLY valid JSON without any markdown formatting or commentary.`;

  const errorsCollected: string[] = [];
  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: instructions }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!resp.ok) {
        const errTxt = await resp.text();
        errorsCollected.push(`[${model}] HTTP ${resp.status}: ${errTxt.substring(0, 150)}`);
        continue;
      }

      const data = await resp.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        errorsCollected.push(`[${model}] No text returned.`);
        continue;
      }

      let cleanJson = rawText.trim();
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.substring(7);
      } else if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.substring(3);
      }
      if (cleanJson.endsWith("```")) {
        cleanJson = cleanJson.substring(0, cleanJson.length - 3);
      }
      cleanJson = cleanJson.trim();

      const item: VttfxEffectItem = JSON.parse(cleanJson);
      if (!item.id || !item.name || !item.iconSvg || !item.effectSvg) {
        errorsCollected.push(`[${model}] Missing required properties in generated item.`);
        continue;
      }
      if (!item.durationMs || typeof item.durationMs !== "number") {
        item.durationMs = 850;
      }
      return item;
    } catch (err: any) {
      errorsCollected.push(`[${model}] Exception: ${err.message || err}`);
    }
  }

  throw new Error(`All models failed: ${errorsCollected.join("; ")}`);
}
