import { CanvasEngine } from "../canvasEngine.js";
import { openGeminiApiKeyModal, openGeminiDescriptionModal, setupEnhanceProxyListeners, checkOrFindProxyPeer } from "../../ui/enhanceModal.js";

export function bindEnhanceTool(engine: CanvasEngine): void {
  setupEnhanceProxyListeners(engine);

  let isSelecting = false;
  let startPt = { x: 0, y: 0 };

  const isEnhanceActive = () => engine.activeTool === "enhance" || (engine.activeTool === "map" && engine.mapTool === "enhance") || (engine.activeTool === "ai" && engine.aiTool === "enhance");

  engine.onMouseDown((_e, worldX, worldY) => {
    if (!isEnhanceActive()) return;
    isSelecting = true;
    startPt = { x: worldX, y: worldY };
    engine.enhanceSelectionBox = { x1: startPt.x, y1: startPt.y, x2: startPt.x, y2: startPt.y };
  });

  engine.onMouseMove((_e, worldX, worldY) => {
    if (!isSelecting || !isEnhanceActive()) return;
    engine.enhanceSelectionBox = {
      x1: Math.min(startPt.x, worldX),
      y1: Math.min(startPt.y, worldY),
      x2: Math.max(startPt.x, worldX),
      y2: Math.max(startPt.y, worldY)
    };
  });

  engine.onMouseUp(() => {
    if (!isSelecting || !isEnhanceActive()) return;
    isSelecting = false;
    const box = engine.enhanceSelectionBox;
    engine.enhanceSelectionBox = null;
    if (!box) return;

    const width = box.x2 - box.x1;
    const height = box.y2 - box.y1;
    if (width < 20 || height < 20) {
      return; // too small
    }

    const selectionBox = { x: box.x1, y: box.y1, width, height };
    const apiKey = localStorage.getItem("gemini_api_key");
    const lastFailed = localStorage.getItem("gemini_enhance_last_failed") === "true";

    if (!apiKey || lastFailed) {
      checkOrFindProxyPeer().then((proxyId) => {
        if (proxyId) {
          openGeminiDescriptionModal(engine, selectionBox, true, proxyId);
        } else {
          openGeminiApiKeyModal(() => {
            openGeminiDescriptionModal(engine, selectionBox, false, null);
          });
        }
      });
      return;
    }

    openGeminiDescriptionModal(engine, selectionBox, false, null);
  });
}

