import "./style.css";
import { CanvasEngine } from "./canvas/canvasEngine.js";
import { bindSelectTool } from "./canvas/tools/selectTool.js";
import { bindDrawTool } from "./canvas/tools/drawTool.js";
import { bindFillTool } from "./canvas/tools/fillTool.js";
import { bindEraseTool } from "./canvas/tools/eraseTool.js";
import { bindHideTool } from "./canvas/tools/hideTool.js";
import { bindMeasureTool } from "./canvas/tools/measureTool.js";
import { bindPingTool } from "./canvas/tools/pingTool.js";
import { setupHeaderUI } from "./ui/userListUI.js";
import { setupToolbarUI } from "./ui/toolbarUI.js";
import { setupSelectionBarUI, syncPrimaryTokenOwnership } from "./ui/selectionBarUI.js";
import { setupChatPanel } from "./ui/chatPanel.js";
import { renderJoinModal } from "./ui/joinModal.js";
import { sessionManager } from "./network/sessionManager.js";
import { registerTroubleshootingUtilities } from "./utils/troubleshooting.js";
import { loadVttfxManifestFromUrl } from "./effects/vttfxLoader.js";

function bootstrap(): void {
  registerTroubleshootingUtilities();
  loadVttfxManifestFromUrl("vttfx/manifest.json");



  // Global mobile/touch haptic feedback (using capturing listeners so e.stopPropagation() never blocks it)
  let lastVibrateTime = 0;
  const triggerHaptic = (e: Event) => {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    const isMobileOrTouch = navigator.maxTouchPoints > 0 || /iPhone|iPod|Android.*Mobile/i.test(navigator.userAgent);
    if (!isMobileOrTouch) return;

    const target = (e.target as HTMLElement)?.closest(
      "button, input[type='button'], input[type='submit'], .tool-btn, .btn-glass, .dice-icon-btn, .toolbar-color-swatch, .brand-icon, .copy-btn, .chat-toggle-btn, .user-pill"
    );
    if (!target) return;

    const now = Date.now();
    if (now - lastVibrateTime < 80) return;
    lastVibrateTime = now;

    try {
      // 35ms produces a crisp, noticeable tactile pulse on phones (12ms was often below threshold)
      if (!navigator.vibrate([35])) {
        navigator.vibrate(35);
      }
    } catch (err) {
      // Ignore if unsupported
    }
  };

  window.addEventListener("pointerdown", triggerHaptic, { capture: true, passive: true });
  window.addEventListener("click", triggerHaptic, { capture: true, passive: true });

  const canvas = document.getElementById("vtt-canvas") as HTMLCanvasElement;
  if (!canvas) throw new Error("Canvas element not found");

  const engine = new CanvasEngine(canvas);

  const resize = () => engine.resizeCanvas();
  window.addEventListener("resize", resize);
  resize();

  // Bind tools
  bindSelectTool(engine);
  bindDrawTool(engine);
  bindFillTool(engine);
  bindEraseTool(engine);
  bindHideTool(engine);
  bindMeasureTool(engine);
  bindPingTool(engine);

  // Show Welcome / Join Modal first (before displaying gameplay UI)
  renderJoinModal(() => {
    // Setup UI components after joining or hosting
    setupHeaderUI();
    setupToolbarUI(engine);
    setupSelectionBarUI(engine);
    setupChatPanel(engine);
    syncPrimaryTokenOwnership();

    if (sessionManager.myColor) {
      engine.drawColor = sessionManager.myColor;
      document.querySelectorAll<HTMLElement>(".toolbar-color-swatch").forEach((swatch) => {
        const bg = swatch.style.backgroundColor;
        swatch.classList.toggle("active", bg === sessionManager.myColor);
      });
    }
  });
}

window.addEventListener("DOMContentLoaded", bootstrap);
