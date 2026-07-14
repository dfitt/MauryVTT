import { CanvasEngine } from "../canvasEngine.js";
import { docStore } from "../../state/documentStore.js";
import { sessionManager } from "../../network/sessionManager.js";

export function bindHideTool(engine: CanvasEngine): void {
  let isDragging = false;
  const processedCellsInStroke = new Set<string>();

  function applyMaskAt(worldX: number, worldY: number): void {
    const doc = docStore.getDocument();
    const size = doc.canvasSettings.gridSizePx || 50;
    const gx = Math.floor(worldX / size) * size;
    const gy = Math.floor(worldY / size) * size;
    const cellKey = `${gx},${gy}`;

    if (processedCellsInStroke.has(cellKey)) return;
    processedCellsInStroke.add(cellKey);

    const existing = doc.gridCells?.[cellKey];
    const isAlreadyHidden = Boolean(existing?.fogHidden);

    if (engine.activeTool === "hide" && !isAlreadyHidden) {
      sessionManager.dispatchOperation({
        opType: "UPDATE_GRID_CELL",
        cellKey,
        patch: {
          fogHidden: true,
          fogCreator: sessionManager.myPeerId || "local"
        }
      });
    } else if (engine.activeTool === "unhide" && isAlreadyHidden) {
      sessionManager.dispatchOperation({
        opType: "UPDATE_GRID_CELL",
        cellKey,
        patch: {
          fogHidden: false
        }
      });
    }
  }

  engine.onMouseDown((_e, worldX, worldY) => {
    if (engine.activeTool !== "hide" && engine.activeTool !== "unhide") return;
    isDragging = true;
    processedCellsInStroke.clear();
    applyMaskAt(worldX, worldY);
  });

  engine.onMouseMove((_e, worldX, worldY) => {
    if (!isDragging || (engine.activeTool !== "hide" && engine.activeTool !== "unhide")) return;
    applyMaskAt(worldX, worldY);
  });

  engine.onMouseUp(() => {
    if (isDragging) {
      isDragging = false;
      processedCellsInStroke.clear();
    }
  });
}
