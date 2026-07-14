import { CanvasEngine } from "../canvasEngine.js";
import { docStore } from "../../state/documentStore.js";
import { sessionManager } from "../../network/sessionManager.js";

export function bindFillTool(engine: CanvasEngine): void {
  let isFilling = false;
  const visitedCells = new Set<string>();

  function fillGridCellAt(worldX: number, worldY: number): void {
    const doc = docStore.getDocument();
    const size = doc.canvasSettings.gridSizePx || 50;
    const gx = Math.floor(worldX / size) * size;
    const gy = Math.floor(worldY / size) * size;
    const cellKey = `${gx},${gy}`;

    if (visitedCells.has(cellKey)) return;
    visitedCells.add(cellKey);

    sessionManager.dispatchOperation({
      opType: "UPDATE_GRID_CELL",
      cellKey,
      patch: {
        fillColor: engine.drawColor,
        fillCreator: sessionManager.myPeerId || "local"
      }
    });
  }

  engine.onMouseDown((_e, worldX, worldY) => {
    if (engine.activeTool !== "fill") return;
    isFilling = true;
    visitedCells.clear();
    fillGridCellAt(worldX, worldY);
  });

  engine.onMouseMove((_e, worldX, worldY) => {
    if (!isFilling || engine.activeTool !== "fill") return;
    fillGridCellAt(worldX, worldY);
  });

  engine.onMouseUp(() => {
    if (isFilling) {
      isFilling = false;
      visitedCells.clear();
    }
  });
}
