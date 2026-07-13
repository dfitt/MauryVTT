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
import { setupSelectionBarUI } from "./ui/selectionBarUI.js";
import { setupChatPanel } from "./ui/chatPanel.js";
import { renderJoinModal } from "./ui/joinModal.js";
import { sessionManager } from "./network/sessionManager.js";

function bootstrap(): void {
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
    setupChatPanel();

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
