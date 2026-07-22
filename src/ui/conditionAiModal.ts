import { sessionManager } from "../network/sessionManager.js";
import { docStore } from "../state/documentStore.js";
import { VttfxEffectItem, VttfxBundle } from "../effects/vttfxLoader.js";
import { openGeminiApiKeyModal, checkOrFindProxyPeer, showEnhanceToast, getPeerUsername } from "./enhanceModal.js";
import { callGeminiConditionGeneration } from "./vttfxGenerateModal.js";
import { ChatMessage, TokenEntity } from "../types/vtt.js";

export async function openConditionGenerateModal(): Promise<void> {
  const apiKey = localStorage.getItem("gemini_api_key");
  const lastFailed = localStorage.getItem("gemini_enhance_last_failed") === "true";

  if (!apiKey || lastFailed) {
    const proxyId = await checkOrFindProxyPeer();
    if (proxyId) {
      openConditionGenerateDescriptionModal(true, proxyId);
    } else {
      openGeminiApiKeyModal(() => openConditionGenerateDescriptionModal(false, null));
    }
  } else {
    openConditionGenerateDescriptionModal(false, null);
  }
}

function openConditionGenerateDescriptionModal(hasProxy: boolean, proxyPeerId: string | null): void {
  let oldModal = document.getElementById("condition-generate-desc-modal");
  if (oldModal) oldModal.remove();

  const modal = document.createElement("div");
  modal.id = "condition-generate-desc-modal";
  modal.style.cssText = "position: fixed; inset: 0; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 100000; font-family: sans-serif;";

  const windowEl = document.createElement("div");
  windowEl.style.cssText = "background: rgba(30, 41, 59, 0.98); border: 2px solid #38bdf8; border-radius: 16px; width: 500px; max-width: 92vw; padding: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); color: #f8fafc; display: flex; flex-direction: column; gap: 16px;";

  const title = document.createElement("div");
  title.style.cssText = "font-size: 1.3em; font-weight: 800; color: #38bdf8; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(56, 189, 248, 0.3); padding-bottom: 10px;";
  title.innerHTML = `<span>🏷️ Generate AI Token Condition</span>${hasProxy ? `<span style="font-size: 0.65em; color: #38bdf8; background: rgba(56, 189, 248, 0.15); padding: 2px 8px; border-radius: 9999px;">Via Proxy Host (${getPeerUsername(proxyPeerId)})</span>` : ''}`;

  const descTxt = document.createElement("div");
  descTxt.style.cssText = "font-size: 0.9em; color: #cbd5e1; line-height: 1.4;";
  descTxt.textContent = "Describe a new Token Condition. The AI will generate a matching status badge icon, condition name, and visual particle animation saved with your session!";

  const descLabel = document.createElement("label");
  descLabel.style.cssText = "font-weight: 700; font-size: 0.85em; color: #38bdf8; display: flex; flex-direction: column; gap: 6px;";
  descLabel.innerHTML = `Condition Description:`;

  const descInput = document.createElement("textarea");
  descInput.rows = 3;
  descInput.placeholder = "e.g. Encased in ice with falling snow crystals, or Corrupted by swirling void tentacles, or Enraged with red lightning...";
  descInput.style.cssText = "width: 100%; box-sizing: border-box; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(56, 189, 248, 0.5); border-radius: 8px; padding: 12px; color: #fff; font-size: 0.95em; resize: vertical;";
  descLabel.appendChild(descInput);

  // Inspiration Chips
  const chipsSection = document.createElement("div");
  chipsSection.style.cssText = "display: flex; flex-direction: column; gap: 6px;";
  const chipsLabel = document.createElement("div");
  chipsLabel.style.cssText = "font-size: 0.75em; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;";
  chipsLabel.textContent = "💡 Quick Preset Ideas:";
  chipsSection.appendChild(chipsLabel);

  const chipsGrid = document.createElement("div");
  chipsGrid.style.cssText = "display: flex; flex-wrap: wrap; gap: 6px;";
  const presets = [
    { label: "🧊 Frozen Solid", text: "Frozen solid in clear ice block with sparkling frost and cold mist" },
    { label: "⚡ Electrified", text: "Crackling electric aura with blue lightning sparks orbiting around target" },
    { label: "🌑 Void Shadow", text: "Corrupted by swirling void shadow tendrils and dark purple energy" },
    { label: "🔥 Burning Hellfire", text: "Engulfed in fiery red flames with rising embers and smoke" },
    { label: "🌿 Overgrown Vines", text: "Entangled by thorned green vines and blooming nature magic" },
    { label: "🌸 Fairy Glamour", text: "Charmed with floating pink hearts, glittering fairy dust, and soft glow" }
  ];

  presets.forEach((p) => {
    const chip = document.createElement("button");
    chip.textContent = p.label;
    chip.style.cssText = "padding: 4px 10px; border-radius: 9999px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); color: #f8fafc; font-size: 0.8em; cursor: pointer; transition: all 0.15s ease;";
    chip.addEventListener("mouseenter", () => {
      chip.style.background = "rgba(56, 189, 248, 0.25)";
      chip.style.borderColor = "#38bdf8";
    });
    chip.addEventListener("mouseleave", () => {
      chip.style.background = "rgba(56, 189, 248, 0.12)";
      chip.style.borderColor = "rgba(56, 189, 248, 0.3)";
    });
    chip.addEventListener("click", () => {
      descInput.value = p.text;
      descInput.focus();
    });
    chipsGrid.appendChild(chip);
  });
  chipsSection.appendChild(chipsGrid);

  const buttons = document.createElement("div");
  buttons.style.cssText = "display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.cssText = "padding: 8px 16px; border-radius: 9999px; background: rgba(255,255,255,0.1); border: none; color: #cbd5e1; font-weight: 600; cursor: pointer;";
  cancelBtn.addEventListener("click", () => modal.remove());

  const generateBtn = document.createElement("button");
  generateBtn.textContent = "🚀 Generate Condition";
  generateBtn.style.cssText = "padding: 8px 20px; border-radius: 9999px; background: linear-gradient(135deg, #38bdf8, #c084fc); border: none; color: #0f172a; font-weight: 800; cursor: pointer; box-shadow: 0 0 15px rgba(56, 189, 248, 0.4);";

  generateBtn.addEventListener("click", async () => {
    const desc = descInput.value.trim();
    if (!desc) {
      showEnhanceToast("⚠️ Please enter a description for the condition.", 4000);
      return;
    }
    modal.remove();

    const conditionPrompt = `Token Condition Status Effect: ${desc}. Generate a matching status icon, clean condition name, and multi-layered token aura particle animation.`;

    if (hasProxy && proxyPeerId) {
      const friendName = getPeerUsername(proxyPeerId);
      const reqId = "cond-req-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
      console.log(`[ConditionProxy] Sending VTTFX_PROXY_REQ for condition. Request ID: ${reqId}, proxyPeerId: ${proxyPeerId}`);
      showEnhanceToast(`✨ Requesting Condition generation using ${friendName}'s API key... (~15-25s)`, 30000);
      sessionManager.sendEphemeral({
        type: "VTTFX_PROXY_REQ",
        reqId,
        requesterPeerId: sessionManager.myPeerId || "client",
        requesterUsername: sessionManager.myUsername || "Requester",
        proxyPeerId,
        iconDesc: conditionPrompt,
        animDesc: conditionPrompt,
        isCondition: true
      } as any);
    } else {
      const apiKey = localStorage.getItem("gemini_api_key");
      if (!apiKey) {
        showEnhanceToast("❌ No API key found. Please configure an API key.", 5000);
        return;
      }
      showEnhanceToast("✨ Generating AI Token Condition & animation... (~15-25s)", 30000);
      try {
        const item = await callGeminiConditionGeneration(apiKey, conditionPrompt, conditionPrompt);
        item.isCondition = true;
        openConditionPreviewModal(item, conditionPrompt, null);
      } catch (err: any) {
        console.error("[ConditionGen] Generation failed:", err);
        showEnhanceToast(`❌ Condition Generation failed: ${err.message || err}`, 8000);
      }
    }
  });

  buttons.appendChild(cancelBtn);
  buttons.appendChild(generateBtn);

  windowEl.appendChild(title);
  windowEl.appendChild(descTxt);
  windowEl.appendChild(descLabel);
  windowEl.appendChild(chipsSection);
  windowEl.appendChild(buttons);
  modal.appendChild(windowEl);
  document.body.appendChild(modal);
}

export function openConditionPreviewModal(vttfxItem: VttfxEffectItem, origPrompt: string, proxyPeerId: string | null): void {
  vttfxItem.isCondition = true;
  let oldModal = document.getElementById("condition-preview-modal");
  if (oldModal) oldModal.remove();

  const modal = document.createElement("div");
  modal.id = "condition-preview-modal";
  modal.style.cssText = "position: fixed; inset: 0; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 100000; font-family: sans-serif;";

  const windowEl = document.createElement("div");
  windowEl.style.cssText = "background: rgba(30, 41, 59, 0.98); border: 2px solid #38bdf8; border-radius: 16px; width: 480px; max-width: 94vw; padding: 24px; box-shadow: 0 24px 60px rgba(0,0,0,0.85); color: #f8fafc; display: flex; flex-direction: column; gap: 16px; align-items: center;";

  const title = document.createElement("div");
  title.style.cssText = "font-size: 1.3em; font-weight: 800; color: #38bdf8; width: 100%; border-bottom: 1px solid rgba(56, 189, 248, 0.3); padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center;";
  title.innerHTML = `<span>✨ Condition Preview: ${vttfxItem.name || "Custom Condition"}</span>`;

  // Condition Badge Card
  const iconCard = document.createElement("div");
  iconCard.style.cssText = "display: flex; align-items: center; gap: 16px; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(56, 189, 248, 0.5); border-radius: 12px; padding: 12px 20px; width: 100%; box-sizing: border-box;";
  iconCard.innerHTML = `
    <div style="font-size: 38px; display: flex; align-items: center; justify-content: center; width: 48px; height: 48px;">
      ${vttfxItem.iconSvg || "🏷️"}
    </div>
    <div style="display: flex; flex-direction: column; gap: 2px;">
      <span style="font-weight: 800; font-size: 1.1em; color: #f8fafc;">${vttfxItem.name || "Custom Condition"}</span>
      <span style="font-size: 0.8em; color: #94a3b8;">Condition ID: <code>${vttfxItem.id}</code> (Saved with .vttdoc)</span>
    </div>
  `;

  // Live Looping Stage
  const stageWrapper = document.createElement("div");
  stageWrapper.style.cssText = "display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%;";
  stageWrapper.innerHTML = `<span style="font-size: 0.8em; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Token Aura Animation Stage</span>`;

  const stage = document.createElement("div");
  stage.style.cssText = "position: relative; width: 260px; height: 220px; background: radial-gradient(circle, #1e293b 0%, #0f172a 100%); border: 2px solid #38bdf8; border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 20px rgba(0,0,0,0.8);";

  // Mock token avatar in center
  const mockToken = document.createElement("div");
  mockToken.style.cssText = "width: 70px; height: 70px; border-radius: 50%; border: 3px solid #38bdf8; background: #334155; display: flex; align-items: center; justify-content: center; font-size: 32px; z-index: 2; box-shadow: 0 4px 12px rgba(0,0,0,0.5);";
  mockToken.textContent = "♟️";
  stage.appendChild(mockToken);

  const fxContainer = document.createElement("div");
  fxContainer.style.cssText = "position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 3;";
  stage.appendChild(fxContainer);
  stageWrapper.appendChild(stage);

  let animationTimer: any = null;
  const triggerAnimationLoop = () => {
    fxContainer.innerHTML = vttfxItem.effectSvg || "";
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
  importBtn.innerHTML = `🟢 Save & Apply Condition`;
  importBtn.style.cssText = "padding: 8px 24px; border-radius: 9999px; background: #22c55e; border: none; color: #fff; font-weight: 800; font-size: 1em; cursor: pointer; box-shadow: 0 0 16px rgba(34, 197, 94, 0.4);";
  importBtn.addEventListener("click", () => {
    if (animationTimer) clearInterval(animationTimer);
    modal.remove();

    vttfxItem.isCondition = true;
    const finalBundle: VttfxBundle = {
      version: "1.0",
      bundleName: `Condition: ${vttfxItem.name}`,
      isCondition: true,
      effects: [vttfxItem]
    };

    // Save bundle in document store (synced across P2P and saved with .vttdoc)
    sessionManager.dispatchOperation({
      opType: "REGISTER_VTTFX_BUNDLE",
      bundle: finalBundle
    } as any);

    // Broadcast system message
    const newMsg: ChatMessage = {
      id: "sys-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      senderPeerId: sessionManager.myPeerId || "local",
      senderUsername: sessionManager.myUsername || "System",
      content: `🏷️ Generated & Saved new Token Condition <strong>${vttfxItem.name}</strong> to session!`,
      type: "system"
    };
    sessionManager.dispatchOperation({ opType: "APPEND_CHAT_MESSAGE", message: newMsg });

    showEnhanceToast(`✅ Condition '${vttfxItem.name}' saved to session and available to all players!`, 6000);
  });

  const retryBtn = document.createElement("button");
  retryBtn.innerHTML = `🟡 Retry`;
  retryBtn.style.cssText = "padding: 8px 24px; border-radius: 9999px; background: #eab308; border: none; color: #fff; font-weight: 800; font-size: 1em; cursor: pointer; box-shadow: 0 0 16px rgba(234, 179, 8, 0.4);";
  retryBtn.addEventListener("click", () => {
    if (animationTimer) clearInterval(animationTimer);
    modal.remove();

    if (proxyPeerId) {
      const friendName = getPeerUsername(proxyPeerId);
      const reqId = "cond-req-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
      showEnhanceToast(`🔄 Retrying Condition generation via ${friendName}'s API key... (~15-25s)`, 30000);
      sessionManager.sendEphemeral({
        type: "VTTFX_PROXY_REQ",
        reqId,
        requesterPeerId: sessionManager.myPeerId || "client",
        requesterUsername: sessionManager.myUsername || "Requester",
        proxyPeerId,
        iconDesc: origPrompt,
        animDesc: origPrompt,
        isCondition: true
      } as any);
    } else {
      const apiKey = localStorage.getItem("gemini_api_key");
      if (apiKey) {
        showEnhanceToast("🔄 Retrying Condition generation... (~15-25s)", 30000);
        callGeminiConditionGeneration(apiKey, origPrompt, origPrompt)
          .then((item) => {
            item.isCondition = true;
            openConditionPreviewModal(item, origPrompt, null);
          })
          .catch((err) => showEnhanceToast(`❌ Retry failed: ${err.message || err}`, 8000));
      }
    }
  });

  const abortBtn = document.createElement("button");
  abortBtn.innerHTML = `🔴 Cancel`;
  abortBtn.style.cssText = "padding: 8px 24px; border-radius: 9999px; background: #ef4444; border: none; color: #fff; font-weight: 800; font-size: 1em; cursor: pointer; box-shadow: 0 0 16px rgba(239, 68, 68, 0.4);";
  abortBtn.addEventListener("click", () => {
    if (animationTimer) clearInterval(animationTimer);
    modal.remove();
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
