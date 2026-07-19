import { VttfxBundle, VttfxEffectItem } from "../effects/vttfxLoader.js";
import { EffectEngine } from "../effects/effectEngine.js";
import { sessionManager } from "../network/sessionManager.js";
import { ChatMessage } from "../types/vtt.js";

export function openImportVttfxModal(bundle: VttfxBundle, defaultBundleName?: string): void {
  // Remove existing modal if open
  const existing = document.getElementById("vttfx-import-modal");
  if (existing) existing.remove();

  const selectedIndices = new Set<number>();
  for (let i = 0; i < bundle.effects.length; i++) {
    selectedIndices.add(i);
  }

  let currentPage = 0;
  const pageSize = 9;
  const totalPages = Math.ceil(bundle.effects.length / pageSize);

  const activeTimers: number[] = [];
  const cleanupTimers = () => {
    for (const t of activeTimers) {
      clearInterval(t);
      clearTimeout(t);
    }
    activeTimers.length = 0;
  };

  const modal = document.createElement("div");
  modal.id = "vttfx-import-modal";
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(15, 23, 42, 0.94);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    font-family: Outfit, sans-serif;
    color: #f8fafc;
  `;

  // Inject responsive style sheet for mobile phone fullscreen
  if (!document.getElementById("vttfx-modal-style")) {
    const style = document.createElement("style");
    style.id = "vttfx-modal-style";
    style.textContent = `
      @media (max-width: 640px) {
        .vttfx-import-window {
          width: 100vw !important;
          height: 100vh !important;
          max-width: none !important;
          max-height: none !important;
          border-radius: 0 !important;
          border: none !important;
        }
        .vttfx-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }
      @media (max-width: 420px) {
        .vttfx-grid {
          grid-template-columns: 1fr !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const windowEl = document.createElement("div");
  windowEl.className = "vttfx-import-window";
  windowEl.style.cssText = `
    width: 100%;
    max-width: 820px;
    max-height: 90vh;
    background: rgba(30, 41, 59, 0.98);
    border: 1px solid rgba(56, 189, 248, 0.45);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
  `;
  modal.appendChild(windowEl);

  // Header
  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: rgba(15, 23, 42, 0.9);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  `;
  const title = document.createElement("div");
  title.style.cssText = "font-size: 1.25em; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 8px;";
  title.innerHTML = `<span>✨ Import VTTFX Bundle:</span> <span style="color: #ffffff;">${bundle.bundleName || defaultBundleName || "VFX Bundle"}</span>`;
  header.appendChild(title);

  const selectAllBtn = document.createElement("button");
  selectAllBtn.className = "btn-glass";
  selectAllBtn.style.cssText = "padding: 4px 12px; font-size: 0.85em; cursor: pointer; border-radius: 6px; color: #cbd5e1;";
  selectAllBtn.textContent = "Select All";
  selectAllBtn.addEventListener("click", () => {
    if (selectedIndices.size === bundle.effects.length) {
      selectedIndices.clear();
      selectAllBtn.textContent = "Select All";
    } else {
      for (let i = 0; i < bundle.effects.length; i++) {
        selectedIndices.add(i);
      }
      selectAllBtn.textContent = "Deselect All";
    }
    renderGrid();
  });
  header.appendChild(selectAllBtn);
  windowEl.appendChild(header);

  // Grid container
  const gridEl = document.createElement("div");
  gridEl.className = "vttfx-grid";
  gridEl.style.cssText = `
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    padding: 18px;
    overflow-y: auto;
    flex: 1;
  `;
  windowEl.appendChild(gridEl);

  // Footer bar
  const footer = document.createElement("div");
  footer.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: rgba(15, 23, 42, 0.95);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  `;

  const pageNavEl = document.createElement("div");
  pageNavEl.style.cssText = "display: flex; align-items: center; gap: 10px;";
  footer.appendChild(pageNavEl);

  const buttonsEl = document.createElement("div");
  buttonsEl.style.cssText = "display: flex; align-items: center; gap: 12px;";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn-glass";
  cancelBtn.style.cssText = "padding: 8px 18px; cursor: pointer; border-radius: 8px; color: #94a3b8; font-weight: 600;";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => {
    cleanupTimers();
    modal.remove();
  });
  buttonsEl.appendChild(cancelBtn);

  const importBtn = document.createElement("button");
  importBtn.className = "btn-glass";
  importBtn.style.cssText = "padding: 8px 20px; cursor: pointer; border-radius: 8px; background: rgba(56, 189, 248, 0.25); border-color: #38bdf8; color: #38bdf8; font-weight: 700;";
  importBtn.textContent = `Import Selected (${selectedIndices.size})`;
  importBtn.addEventListener("click", () => {
    const selectedEffects = bundle.effects.filter((_, i) => selectedIndices.has(i));
    if (selectedEffects.length === 0) {
      alert("Please select at least one VFX effect to import.");
      return;
    }

    const finalBundle: VttfxBundle = {
      ...bundle,
      bundleName: bundle.bundleName || defaultBundleName || "Imported VFX Bundle",
      effects: selectedEffects
    };

    cleanupTimers();
    modal.remove();

    sessionManager.dispatchOperation({
      opType: "REGISTER_VTTFX_BUNDLE",
      bundle: finalBundle
    } as any);

    const newMsg: ChatMessage = {
      id: "sys-" + Date.now(),
      timestamp: Date.now(),
      senderPeerId: sessionManager.myPeerId || "local",
      senderUsername: sessionManager.myUsername || "System",
      content: `✨ Imported VFX bundle <strong>${finalBundle.bundleName}</strong> (${selectedEffects.length} effects) into session!`,
      type: "system"
    };
    sessionManager.dispatchOperation({ opType: "APPEND_CHAT_MESSAGE", message: newMsg });
  });
  buttonsEl.appendChild(importBtn);
  footer.appendChild(buttonsEl);
  windowEl.appendChild(footer);

  const renderGrid = () => {
    cleanupTimers();
    gridEl.innerHTML = "";
    importBtn.textContent = `Import Selected (${selectedIndices.size})`;

    const startIdx = currentPage * pageSize;
    const endIdx = Math.min(bundle.effects.length, startIdx + pageSize);

    for (let i = startIdx; i < endIdx; i++) {
      const item: VttfxEffectItem = bundle.effects[i];
      const isSelected = selectedIndices.has(i);

      const card = document.createElement("div");
      card.style.cssText = `
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid ${isSelected ? "rgba(56, 189, 248, 0.7)" : "rgba(255, 255, 255, 0.08)"};
        border-radius: 10px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
      `;

      card.addEventListener("click", (e) => {
        // Toggle selection
        if ((e.target as HTMLElement).tagName !== "INPUT") {
          if (selectedIndices.has(i)) {
            selectedIndices.delete(i);
          } else {
            selectedIndices.add(i);
          }
          renderGrid();
        }
      });

      // Preview box
      const previewBox = document.createElement("div");
      previewBox.style.cssText = `
        position: relative;
        height: 120px;
        background: rgba(0, 0, 0, 0.45);
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255, 255, 255, 0.05);
      `;

      // Checkbox in top-right corner
      const cbContainer = document.createElement("div");
      cbContainer.style.cssText = "position: absolute; top: 8px; right: 8px; z-index: 10; display: flex; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.75); border-radius: 4px; padding: 4px;";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = isSelected;
      cb.style.cssText = "cursor: pointer; width: 16px; height: 16px; accent-color: #38bdf8; margin: 0;";
      cb.addEventListener("change", () => {
        if (cb.checked) selectedIndices.add(i);
        else selectedIndices.delete(i);
        renderGrid();
      });
      cbContainer.appendChild(cb);
      previewBox.appendChild(cbContainer);

      // Background looping animation container
      const loopBg = document.createElement("div");
      loopBg.style.cssText = "position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; overflow: hidden;";
      previewBox.appendChild(loopBg);

      const pCanvas = document.createElement("canvas");
      pCanvas.style.cssText = "position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;";
      if (item.particles) {
        previewBox.appendChild(pCanvas);
      }

      // Foreground icon overlay
      const iconOverlay = document.createElement("div");
      iconOverlay.style.cssText = `
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(15, 23, 42, 0.7);
        padding: 10px;
        border-radius: 50%;
        border: 1px solid rgba(56, 189, 248, 0.4);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.75);
      `;
      iconOverlay.innerHTML = item.iconSvg || `<svg viewBox="0 0 64 64" width="1.5em" height="1.5em"><circle cx="32" cy="32" r="28" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/><text x="32" y="41" text-anchor="middle" fill="#38bdf8" font-size="24" font-weight="bold">✨</text></svg>`;
      previewBox.appendChild(iconOverlay);
      card.appendChild(previewBox);
      gridEl.appendChild(card);

      // Animation loop runner
      const runAnimLoop = () => {
        loopBg.innerHTML = item.effectSvg || "";
        if (item.particles && pCanvas) {
          EffectEngine.runParticleSystem(pCanvas, item.particles, item.durationMs || 1000);
        }
      };

      runAnimLoop();
      const interval = window.setInterval(runAnimLoop, (item.durationMs || 1000) + 350);
      activeTimers.push(interval);
    }

    // Render pagination
    pageNavEl.innerHTML = "";
    if (totalPages > 1) {
      const prevBtn = document.createElement("button");
      prevBtn.className = "btn-glass";
      prevBtn.style.cssText = "padding: 4px 10px; cursor: pointer; border-radius: 6px; font-weight: bold;";
      prevBtn.textContent = "◀ Prev";
      prevBtn.disabled = currentPage === 0;
      if (currentPage === 0) prevBtn.style.opacity = "0.4";
      prevBtn.addEventListener("click", () => {
        if (currentPage > 0) {
          currentPage--;
          renderGrid();
        }
      });
      pageNavEl.appendChild(prevBtn);

      const pageLabel = document.createElement("span");
      pageLabel.style.cssText = "font-size: 0.9em; color: #cbd5e1; font-weight: 600;";
      pageLabel.textContent = `Page ${currentPage + 1} of ${totalPages}`;
      pageNavEl.appendChild(pageLabel);

      const nextBtn = document.createElement("button");
      nextBtn.className = "btn-glass";
      nextBtn.style.cssText = "padding: 4px 10px; cursor: pointer; border-radius: 6px; font-weight: bold;";
      nextBtn.textContent = "Next ▶";
      nextBtn.disabled = currentPage >= totalPages - 1;
      if (currentPage >= totalPages - 1) nextBtn.style.opacity = "0.4";
      nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages - 1) {
          currentPage++;
          renderGrid();
        }
      });
      pageNavEl.appendChild(nextBtn);
    }
  };

  renderGrid();
  document.body.appendChild(modal);
}
