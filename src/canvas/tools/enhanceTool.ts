import { CanvasEngine } from "../canvasEngine.js";
import { openGeminiApiKeyModal, runGeminiMapEnhancement } from "../../ui/enhanceModal.js";

export function bindEnhanceTool(engine: CanvasEngine): void {
  let isSelecting = false;
  let startPt = { x: 0, y: 0 };

  engine.onMouseDown((_e, worldX, worldY) => {
    if (engine.activeTool !== "enhance") return;
    isSelecting = true;
    startPt = { x: worldX, y: worldY };
    engine.enhanceSelectionBox = { x1: startPt.x, y1: startPt.y, x2: startPt.x, y2: startPt.y };
  });

  engine.onMouseMove((_e, worldX, worldY) => {
    if (!isSelecting || engine.activeTool !== "enhance") return;
    engine.enhanceSelectionBox = {
      x1: Math.min(startPt.x, worldX),
      y1: Math.min(startPt.y, worldY),
      x2: Math.max(startPt.x, worldX),
      y2: Math.max(startPt.y, worldY)
    };
  });

  engine.onMouseUp(() => {
    if (!isSelecting || engine.activeTool !== "enhance") return;
    isSelecting = false;
    const box = engine.enhanceSelectionBox;
    engine.enhanceSelectionBox = null;
    if (!box) return;

    const width = box.x2 - box.x1;
    const height = box.y2 - box.y1;
    if (width < 20 || height < 20) {
      return; // too small
    }

    const apiKey = localStorage.getItem("gemini_api_key");
    const lastFailed = localStorage.getItem("gemini_enhance_last_failed") === "true";
    if (!apiKey || lastFailed) {
      openGeminiApiKeyModal(() => {
        runGeminiMapEnhancement(engine, { x: box.x1, y: box.y1, width, height });
      });
      return;
    }

    runGeminiMapEnhancement(engine, { x: box.x1, y: box.y1, width, height });
  });
}
