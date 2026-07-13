import { CanvasEngine } from "../canvasEngine.js";
import { sessionManager } from "../../network/sessionManager.js";
import { LineEntity } from "../../types/vtt.js";

export function bindDrawTool(engine: CanvasEngine): void {
  let isDrawing = false;

  engine.onMouseDown((_e, worldX, worldY) => {
    if (engine.activeTool !== "draw" && engine.activeTool !== "line") return;
    isDrawing = true;
    engine.draftPoints = [[worldX, worldY]];
  });

  engine.onMouseMove((_e, worldX, worldY) => {
    if (!isDrawing || !engine.draftPoints) return;

    if (engine.activeTool === "draw") {
      engine.draftPoints.push([worldX, worldY]);
    } else if (engine.activeTool === "line") {
      engine.draftPoints = [engine.draftPoints[0], [worldX, worldY]];
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
