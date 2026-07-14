import { CanvasEngine } from "../canvasEngine.js";
import { sessionManager } from "../../network/sessionManager.js";
import { docStore } from "../../state/documentStore.js";
import { LineEntity } from "../../types/vtt.js";

function snapToGridPoint(x: number, y: number, gridPx: number): [number, number] {
  const ix = Math.round(x / gridPx) * gridPx;
  const iy = Math.round(y / gridPx) * gridPx;
  const distI = Math.hypot(x - ix, y - iy);

  const cx = Math.floor(x / gridPx) * gridPx + gridPx / 2;
  const cy = Math.floor(y / gridPx) * gridPx + gridPx / 2;
  const distC = Math.hypot(x - cx, y - cy);

  if (distI <= distC) {
    return [ix, iy];
  } else {
    return [cx, cy];
  }
}

export function bindDrawTool(engine: CanvasEngine): void {
  let isDrawing = false;

  engine.onMouseDown((_e, worldX, worldY) => {
    if (engine.activeTool !== "draw" && engine.activeTool !== "line") return;
    isDrawing = true;
    if (engine.activeTool === "line") {
      const doc = docStore.getDocument();
      const gridPx = doc.canvasSettings.gridSizePx || 50;
      const snapped = snapToGridPoint(worldX, worldY, gridPx);
      engine.draftPoints = [snapped, snapped];
    } else {
      engine.draftPoints = [[worldX, worldY]];
    }
  });

  engine.onMouseMove((_e, worldX, worldY) => {
    if (!isDrawing || !engine.draftPoints) return;

    if (engine.activeTool === "draw") {
      engine.draftPoints.push([worldX, worldY]);
    } else if (engine.activeTool === "line") {
      const doc = docStore.getDocument();
      const gridPx = doc.canvasSettings.gridSizePx || 50;
      const snapped = snapToGridPoint(worldX, worldY, gridPx);
      engine.draftPoints = [engine.draftPoints[0], snapped];
    }
  });

  engine.onMouseUp(() => {
    if (!isDrawing || !engine.draftPoints || engine.draftPoints.length < 2) {
      isDrawing = false;
      engine.draftPoints = null;
      return;
    }

    const newEntity: LineEntity = {
      id: "line-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      type: "line",
      layerId: "drawings-layer",
      zIndex: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastModifiedBy: sessionManager.myPeerId || "local",
      locked: false,
      lineType: engine.activeTool === "draw" ? "freehand" : "straight",
      points: [...engine.draftPoints],
      strokeColor: engine.drawColor,
      strokeWidth: engine.drawWidth,
      strokeOpacity: 1.0,
      isClosed: false
    };

    sessionManager.dispatchOperation({
      opType: "CREATE_ENTITY",
      entity: newEntity
    });

    isDrawing = false;
    engine.draftPoints = null;
  });
}
