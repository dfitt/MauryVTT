import { CanvasEngine } from "../canvas/canvasEngine.js";
import { docStore } from "../state/documentStore.js";
import { openGeminiApiKeyModal } from "./enhanceModal.js";

export function openSettingsModal(engine: CanvasEngine): void {
  let modalEl = document.getElementById("vtt-settings-modal");
  if (modalEl) modalEl.remove();

  modalEl = document.createElement("div");
  modalEl.id = "vtt-settings-modal";
  modalEl.style.cssText = "position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 99999;";
  document.body.appendChild(modalEl);

  const doc = docStore.getDocument();
  const defaultBg = doc.canvasSettings.backgroundColor === "#13151b" ? "#475569" : (doc.canvasSettings.backgroundColor || "#475569");
  const currentPersonalBg = localStorage.getItem("vtt_personal_bg_color") || defaultBg;
  const isBgOverridden = Boolean(localStorage.getItem("vtt_personal_bg_color"));

  const currentGridColor = localStorage.getItem("vtt_personal_grid_color") || "#000000";
  const isGridOverridden = Boolean(localStorage.getItem("vtt_personal_grid_color"));

  const currentGridThickness = localStorage.getItem("vtt_personal_grid_thickness") || "0.5";
  const currentFpsLimit = localStorage.getItem("vtt_fps_limit") || "0";

  const allowLockedSelection = localStorage.getItem("vtt_allow_locked_image_selection") !== "false";

  modalEl.innerHTML = `
    <div style="background: rgba(15, 23, 42, 0.96); border: 1px solid rgba(192, 132, 252, 0.6); border-radius: 16px; padding: 24px; max-width: 520px; width: 92%; box-shadow: 0 20px 50px rgba(0,0,0,0.85); color: #f8fafc; font-family: Outfit, sans-serif; display: flex; flex-direction: column; gap: 20px; max-height: 90vh; overflow-y: auto;">
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 24px;">⚙️</span>
          <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #c084fc;">Client Settings & Preferences</h3>
        </div>
        <button id="btn-close-settings-top" style="background: transparent; border: none; color: #94a3b8; font-size: 20px; cursor: pointer;">✕</button>
      </div>

      <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
        These preferences are saved in your local browser storage (<code>localStorage</code>) and apply exclusively to your client.
      </p>

      <!-- Section 1: Canvas Colors -->
      <div style="display: flex; flex-direction: column; gap: 14px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px;">
        <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 6px;">
          🎨 Personal Canvas Colors
        </h4>

        <!-- Personal Background Color -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 13px; font-weight: 600; color: #e2e8f0;">Personal Background Color</label>
            ${isBgOverridden ? `<span style="font-size: 11px; color: #eab308; font-weight: 600;">(Override Active)</span>` : `<span style="font-size: 11px; color: #94a3b8;">(Using Document Default)</span>`}
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="color" id="setting-bg-color-picker" value="${currentPersonalBg}" style="width: 44px; height: 36px; border: none; border-radius: 6px; cursor: pointer; background: transparent;" />
            <input type="text" id="setting-bg-color-text" value="${currentPersonalBg}" style="flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(15, 23, 42, 0.8); color: #ffffff; font-size: 13px; outline: none; font-family: monospace;" />
            <button id="btn-reset-bg-color" class="btn-glass" style="padding: 8px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; color: #cbd5e1; white-space: nowrap;">Reset to Default</button>
          </div>
        </div>

        <!-- Personal Grid Line Color -->
        <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 13px; font-weight: 600; color: #e2e8f0;">Personal Grid Line Color</label>
            ${isGridOverridden ? `<span style="font-size: 11px; color: #eab308; font-weight: 600;">(Override Active)</span>` : `<span style="font-size: 11px; color: #94a3b8;">(Default: #000000)</span>`}
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="color" id="setting-grid-color-picker" value="${currentGridColor}" style="width: 44px; height: 36px; border: none; border-radius: 6px; cursor: pointer; background: transparent;" />
            <input type="text" id="setting-grid-color-text" value="${currentGridColor}" style="flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(15, 23, 42, 0.8); color: #ffffff; font-size: 13px; outline: none; font-family: monospace;" />
            <button id="btn-reset-grid-color" class="btn-glass" style="padding: 8px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; color: #cbd5e1; white-space: nowrap;">Reset to Black</button>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
            <span style="font-size: 11px; color: #94a3b8;">Presets:</span>
            <button class="grid-preset-btn" data-color="#000000" style="background: #000000; border: 1px solid #475569; width: 22px; height: 22px; border-radius: 4px; cursor: pointer;" title="Black"></button>
            <button class="grid-preset-btn" data-color="#ffffff" style="background: #ffffff; border: 1px solid #475569; width: 22px; height: 22px; border-radius: 4px; cursor: pointer;" title="White"></button>
            <button class="grid-preset-btn" data-color="#38bdf8" style="background: #38bdf8; border: 1px solid #475569; width: 22px; height: 22px; border-radius: 4px; cursor: pointer;" title="Cyan"></button>
            <button class="grid-preset-btn" data-color="#c084fc" style="background: #c084fc; border: 1px solid #475569; width: 22px; height: 22px; border-radius: 4px; cursor: pointer;" title="Purple"></button>
            <button class="grid-preset-btn" data-color="#eab308" style="background: #eab308; border: 1px solid #475569; width: 22px; height: 22px; border-radius: 4px; cursor: pointer;" title="Gold"></button>
            <button class="grid-preset-btn" data-color="#475569" style="background: #475569; border: 1px solid #64748b; width: 22px; height: 22px; border-radius: 4px; cursor: pointer;" title="Slate"></button>
          </div>
        </div>

        <!-- Grid Line Thickness -->
        <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 13px; font-weight: 600; color: #e2e8f0;">Grid Line Thickness</label>
            <span id="grid-thickness-val-txt" style="font-size: 12px; color: #38bdf8; font-weight: 700; font-family: monospace;">${currentGridThickness}px</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <input type="range" id="setting-grid-thickness-slider" min="0.25" max="3.0" step="0.25" value="${currentGridThickness}" style="flex: 1; accent-color: #c084fc; cursor: pointer;" />
            <button id="btn-reset-grid-thickness" class="btn-glass" style="padding: 6px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; color: #cbd5e1; white-space: nowrap;">Reset (0.5px)</button>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
            <span style="font-size: 11px; color: #94a3b8;">Presets:</span>
            <button class="grid-thickness-btn btn-glass btn-sm" data-val="0.5" style="padding: 2px 8px; font-size: 11px; border-radius: 4px; cursor: pointer;">0.5px (Default)</button>
            <button class="grid-thickness-btn btn-glass btn-sm" data-val="1" style="padding: 2px 8px; font-size: 11px; border-radius: 4px; cursor: pointer;">1.0px</button>
            <button class="grid-thickness-btn btn-glass btn-sm" data-val="1.5" style="padding: 2px 8px; font-size: 11px; border-radius: 4px; cursor: pointer;">1.5px</button>
            <button class="grid-thickness-btn btn-glass btn-sm" data-val="2" style="padding: 2px 8px; font-size: 11px; border-radius: 4px; cursor: pointer;">2.0px</button>
            <button class="grid-thickness-btn btn-glass btn-sm" data-val="3" style="padding: 2px 8px; font-size: 11px; border-radius: 4px; cursor: pointer;">3.0px</button>
          </div>
        </div>
      </div>

      <!-- Section 2: Interaction Settings -->
      <div style="display: flex; flex-direction: column; gap: 12px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px;">
        <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #e879f9; display: flex; align-items: center; gap: 6px;">
          🖱️ Canvas Interaction & Performance
        </h4>
        <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; user-select: none;">
          <input type="checkbox" id="setting-allow-locked-selection" ${allowLockedSelection ? "checked" : ""} style="width: 18px; height: 18px; margin-top: 2px; accent-color: #c084fc; cursor: pointer;" />
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 13px; font-weight: 600; color: #ffffff;">Allow locked image selection</span>
            <span style="font-size: 12px; color: #94a3b8; line-height: 1.4; margin-top: 2px;">
              If unchecked, locked images (like background maps and room decorations) cannot be clicked or selected, preventing UI clutter and accidental selection when dragging or pinging.
            </span>
          </div>
        </label>

        <!-- FPS Limit -->
        <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 13px; font-weight: 600; color: #e2e8f0;">Frame Rate (FPS) Limit</label>
            <span id="fps-val-txt" style="font-size: 12px; color: #e879f9; font-weight: 700; font-family: monospace;">${currentFpsLimit === "0" || !currentFpsLimit ? "60 FPS (Uncapped)" : currentFpsLimit + " FPS"}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="fps-preset-btn btn-glass ${currentFpsLimit === "0" || !currentFpsLimit ? "btn-primary" : ""}" data-val="0" style="flex: 1; padding: 6px 10px; font-size: 12px; border-radius: 8px; cursor: pointer;">60 FPS (Uncapped)</button>
            <button class="fps-preset-btn btn-glass ${currentFpsLimit === "30" ? "btn-primary" : ""}" data-val="30" style="flex: 1; padding: 6px 10px; font-size: 12px; border-radius: 8px; cursor: pointer;">30 FPS (Saver)</button>
            <button class="fps-preset-btn btn-glass ${currentFpsLimit === "20" ? "btn-primary" : ""}" data-val="20" style="flex: 1; padding: 6px 10px; font-size: 12px; border-radius: 8px; cursor: pointer;">20 FPS (Low)</button>
            <button class="fps-preset-btn btn-glass ${currentFpsLimit === "15" ? "btn-primary" : ""}" data-val="15" style="flex: 1; padding: 6px 10px; font-size: 12px; border-radius: 8px; cursor: pointer;">15 FPS (Min)</button>
          </div>
          <span style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Capping FPS reduces CPU/GPU load, fan noise, and battery drain on laptops.</span>
        </div>
      </div>

      <!-- Section 3: AI Configuration Shortcut -->
      <div style="display: flex; flex-direction: column; gap: 10px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 13px; font-weight: 600; color: #ffffff;">AI Map & Gemini API Key</span>
            <span style="font-size: 12px; color: #94a3b8;">Configure your personal Gemini API key and AI map generation overrides.</span>
          </div>
          <button id="btn-settings-open-ai" class="btn-glass" style="padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; color: #c084fc; border: 1px solid rgba(192, 132, 252, 0.4); cursor: pointer; white-space: nowrap;">Configure AI ✨</button>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px;">
        <button id="btn-close-settings" class="btn-glass" style="padding: 8px 24px; border-radius: 8px; cursor: pointer; background: rgba(192, 132, 252, 0.35); border: 1px solid #c084fc; color: #ffffff; font-weight: 700; box-shadow: 0 0 14px rgba(192, 132, 252, 0.4);">Done</button>
      </div>
    </div>
  `;

  const bgPicker = modalEl.querySelector<HTMLInputElement>("#setting-bg-color-picker")!;
  const bgText = modalEl.querySelector<HTMLInputElement>("#setting-bg-color-text")!;
  const bgResetBtn = modalEl.querySelector<HTMLButtonElement>("#btn-reset-bg-color")!;

  const gridPicker = modalEl.querySelector<HTMLInputElement>("#setting-grid-color-picker")!;
  const gridText = modalEl.querySelector<HTMLInputElement>("#setting-grid-color-text")!;
  const gridResetBtn = modalEl.querySelector<HTMLButtonElement>("#btn-reset-grid-color")!;
  const gridPresetBtns = modalEl.querySelectorAll<HTMLButtonElement>(".grid-preset-btn");

  const gridThicknessSlider = modalEl.querySelector<HTMLInputElement>("#setting-grid-thickness-slider")!;
  const gridThicknessTxt = modalEl.querySelector<HTMLElement>("#grid-thickness-val-txt")!;
  const gridThicknessResetBtn = modalEl.querySelector<HTMLButtonElement>("#btn-reset-grid-thickness")!;
  const gridThicknessBtns = modalEl.querySelectorAll<HTMLButtonElement>(".grid-thickness-btn");

  const lockedCheckbox = modalEl.querySelector<HTMLInputElement>("#setting-allow-locked-selection")!;
  const fpsTxt = modalEl.querySelector<HTMLElement>("#fps-val-txt")!;
  const fpsBtns = modalEl.querySelectorAll<HTMLButtonElement>(".fps-preset-btn");

  const aiBtn = modalEl.querySelector<HTMLButtonElement>("#btn-settings-open-ai")!;
  const closeBtn = modalEl.querySelector<HTMLButtonElement>("#btn-close-settings")!;
  const closeTopBtn = modalEl.querySelector<HTMLButtonElement>("#btn-close-settings-top")!;

  // Background color handlers
  bgPicker.addEventListener("input", () => {
    const val = bgPicker.value;
    bgText.value = val;
    localStorage.setItem("vtt_personal_bg_color", val);
  });
  bgText.addEventListener("input", () => {
    const val = bgText.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(val) || /^#[0-9A-Fa-f]{3}$/.test(val)) {
      bgPicker.value = val;
    }
    localStorage.setItem("vtt_personal_bg_color", val);
  });
  bgResetBtn.addEventListener("click", () => {
    localStorage.removeItem("vtt_personal_bg_color");
    bgPicker.value = defaultBg.length === 7 && defaultBg.startsWith("#") ? defaultBg : "#475569";
    bgText.value = defaultBg;
  });

  // Grid color handlers
  gridPicker.addEventListener("input", () => {
    const val = gridPicker.value;
    gridText.value = val;
    localStorage.setItem("vtt_personal_grid_color", val);
  });
  gridText.addEventListener("input", () => {
    const val = gridText.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(val) || /^#[0-9A-Fa-f]{3}$/.test(val)) {
      gridPicker.value = val;
    }
    localStorage.setItem("vtt_personal_grid_color", val);
  });
  gridResetBtn.addEventListener("click", () => {
    localStorage.removeItem("vtt_personal_grid_color");
    gridPicker.value = "#000000";
    gridText.value = "#000000";
  });
  gridPresetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const color = btn.getAttribute("data-color") || "#000000";
      gridPicker.value = color;
      gridText.value = color;
      localStorage.setItem("vtt_personal_grid_color", color);
    });
  });

  // Grid line thickness handlers
  const updateGridThickness = (val: string) => {
    gridThicknessSlider.value = val;
    gridThicknessTxt.textContent = `${val}px`;
    localStorage.setItem("vtt_personal_grid_thickness", val);
  };
  gridThicknessSlider.addEventListener("input", () => {
    updateGridThickness(gridThicknessSlider.value);
  });
  gridThicknessResetBtn.addEventListener("click", () => {
    localStorage.removeItem("vtt_personal_grid_thickness");
    gridThicknessSlider.value = "0.5";
    gridThicknessTxt.textContent = "0.5px";
  });
  gridThicknessBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-val") || "0.5";
      updateGridThickness(val);
    });
  });

  // Locked selection checkbox handler
  lockedCheckbox.addEventListener("change", () => {
    const checked = lockedCheckbox.checked;
    localStorage.setItem("vtt_allow_locked_image_selection", checked ? "true" : "false");
    if (!checked && engine.selectedEntityId) {
      const selectedEnt = docStore.getDocument().entities[engine.selectedEntityId];
      if (selectedEnt && selectedEnt.locked && selectedEnt.type === "image") {
        engine.selectedEntityId = null;
      }
    }
  });

  // FPS limit handlers
  fpsBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-val") || "0";
      localStorage.setItem("vtt_fps_limit", val);
      fpsTxt.textContent = val === "0" ? "60 FPS (Uncapped)" : `${val} FPS`;
      fpsBtns.forEach((b) => b.classList.remove("btn-primary"));
      btn.classList.add("btn-primary");
    });
  });

  // AI configuration button handler
  aiBtn.addEventListener("click", () => {
    modalEl?.remove();
    openGeminiApiKeyModal();
  });

  const closeModal = () => {
    modalEl?.remove();
  };

  closeBtn.addEventListener("click", closeModal);
  closeTopBtn.addEventListener("click", closeModal);
}
