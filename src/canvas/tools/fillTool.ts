import { CanvasEngine } from "../canvasEngine.js";
import { docStore } from "../../state/documentStore.js";
import { sessionManager } from "../../network/sessionManager.js";
import { LineEntity } from "../../types/vtt.js";

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

    const square: LineEntity = {
      id: "fill-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      type: "line",
      layerId: "drawings-layer",
      zIndex: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastModifiedBy: sessionManager.myPeerId || "local",
      locked: false,
      lineType: "straight",
      points: [
        [gx, gy],
        [gx + size, gy],
        [gx + size, gy + size],
        [gx, gy + size]
      ],
      strokeColor: engine.drawColor,
      strokeWidth: 1.5,
      strokeOpacity: 0.15,
      fillColor: engine.drawColor,
      isClosed: true
    };

    sessionManager.dispatchOperation({
      opType: "CREATE_ENTITY",
      entity: square
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
