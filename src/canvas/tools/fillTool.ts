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

    if (engine.fillBucket) {
      const startKey = `${gx},${gy}`;
      if (visitedCells.has(startKey)) return;
      const startCell = doc.gridCells?.[startKey];
      const targetColor = startCell?.fillColor;
      if (targetColor === engine.drawColor) return;

      const queue = [{ x: gx, y: gy }];
      const bfsVisited = new Set<string>();
      while (queue.length > 0 && bfsVisited.size < 600) {
        const curr = queue.shift()!;
        const currKey = `${curr.x},${curr.y}`;
        if (bfsVisited.has(currKey)) continue;
        bfsVisited.add(currKey);
        visitedCells.add(currKey);

        const currCell = doc.gridCells?.[currKey];
        const currColor = currCell?.fillColor;
        if (currColor !== targetColor) continue;

        sessionManager.dispatchOperation({
          opType: "UPDATE_GRID_CELL",
          cellKey: currKey,
          patch: {
            fillColor: engine.drawColor,
            fillCreator: sessionManager.myUsername || sessionManager.myPeerId || "local"
          }
        });

        queue.push(
          { x: curr.x + size, y: curr.y },
          { x: curr.x - size, y: curr.y },
          { x: curr.x, y: curr.y + size },
          { x: curr.x, y: curr.y - size }
        );
      }
      return;
    }

    const span = engine.fillSize || 1;
    const fillGx = Math.round((worldX - (size * span) / 2) / size) * size;
    const fillGy = Math.round((worldY - (size * span) / 2) / size) * size;
    for (let dx = 0; dx < span; dx++) {
      for (let dy = 0; dy < span; dy++) {
        const cx = fillGx + dx * size;
        const cy = fillGy + dy * size;
        const cellKey = `${cx},${cy}`;
        if (visitedCells.has(cellKey)) continue;
        visitedCells.add(cellKey);

        sessionManager.dispatchOperation({
          opType: "UPDATE_GRID_CELL",
          cellKey,
          patch: {
            fillColor: engine.drawColor,
            fillCreator: sessionManager.myUsername || sessionManager.myPeerId || "local"
          }
        });
      }
    }
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
