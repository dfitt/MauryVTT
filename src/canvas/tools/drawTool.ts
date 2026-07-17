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
  let startPt: [number, number] = [0, 0];

  engine.onMouseDown((_e, worldX, worldY) => {
    if (engine.activeTool !== "draw" && engine.activeTool !== "line") return;
    isDrawing = true;
    if (engine.activeTool === "line") {
      const doc = docStore.getDocument();
      const gridPx = doc.canvasSettings.gridSizePx || 50;
      const snapped = snapToGridPoint(worldX, worldY, gridPx);
      startPt = snapped;
      engine.draftPoints = [snapped, snapped];

      if (["circle", "cone", "rectangle", "arrow"].includes(engine.lineShape)) {
        engine.localMeasurement = {
          measureId: "shape-meas-" + Math.random().toString(36).substring(2, 7),
          peerId: sessionManager.myPeerId || "local",
          username: sessionManager.myUsername || "Me",
          startPoint: { x: snapped[0], y: snapped[1] },
          endPoint: { x: snapped[0], y: snapped[1] },
          color: engine.drawColor || "#38bdf8",
          unitLabel: "0 ft",
          showCircle: engine.lineShape === "circle"
        };
      }
    } else {
      startPt = [worldX, worldY];
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
      const x1 = startPt[0];
      const y1 = startPt[1];
      const x2 = snapped[0];
      const y2 = snapped[1];
      const shape = engine.lineShape;
      let pts: [number, number][] = [];

      if (shape === "straight") {
        pts = [[x1, y1], [x2, y2]];
      } else if (shape === "rectangle") {
        pts = [[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]];
      } else if (shape === "circle") {
        const r = Math.hypot(x2 - x1, y2 - y1);
        for (let i = 0; i <= 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          pts.push([x1 + Math.cos(a) * r, y1 + Math.sin(a) * r]);
        }
      } else if (shape === "cone") {
        const L = Math.hypot(x2 - x1, y2 - y1);
        if (L < 2) {
          pts = [[x1, y1], [x2, y2]];
        } else {
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const halfSpread = Math.atan(0.5);
          pts = [[x1, y1]];
          for (let i = 0; i <= 12; i++) {
            const a = (angle - halfSpread) + (i / 12) * (halfSpread * 2);
            pts.push([x1 + Math.cos(a) * L, y1 + Math.sin(a) * L]);
          }
          pts.push([x1, y1]);
        }
      } else if (shape === "hexagon") {
        const r = Math.hypot(x2 - x1, y2 - y1);
        for (let i = 0; i <= 6; i++) {
          const a = (i * Math.PI) / 3;
          pts.push([x1 + Math.cos(a) * r, y1 + Math.sin(a) * r]);
        }
      } else if (shape === "spiral") {
        const maxR = Math.hypot(x2 - x1, y2 - y1);
        const startAngle = Math.atan2(y2 - y1, x2 - x1);
        for (let i = 0; i <= 72; i++) {
          const t = i / 72;
          const angle = startAngle + t * 3 * Math.PI * 2;
          const r = t * maxR;
          pts.push([x1 + Math.cos(angle) * r, y1 + Math.sin(angle) * r]);
        }
      } else if (shape === "arrow") {
        const L = Math.hypot(x2 - x1, y2 - y1);
        if (L < 2) {
          pts = [[x1, y1], [x2, y2]];
        } else {
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const barbLen = Math.min(40, Math.max(15, L * 0.25));
          const barbAngle = Math.PI / 6;
          const leftBarb: [number, number] = [x2 - Math.cos(angle - barbAngle) * barbLen, y2 - Math.sin(angle - barbAngle) * barbLen];
          const rightBarb: [number, number] = [x2 - Math.cos(angle + barbAngle) * barbLen, y2 - Math.sin(angle + barbAngle) * barbLen];
          pts = [[x1, y1], [x2, y2], leftBarb, [x2, y2], rightBarb];
        }
      } else {
        pts = [[x1, y1], [x2, y2]];
      }

      engine.draftPoints = pts;

      if (engine.localMeasurement) {
        const distPx = Math.hypot(x2 - x1, y2 - y1);
        const rawFeet = (distPx / gridPx) * 5;
        const feet = Math.round(rawFeet / 5) * 5;
        engine.localMeasurement.endPoint = { x: x2, y: y2 };
        engine.localMeasurement.unitLabel = `${feet} ft`;
      }
    }
  });

  engine.onMouseUp(() => {
    if (!isDrawing || !engine.draftPoints || engine.draftPoints.length < 2) {
      isDrawing = false;
      engine.draftPoints = null;
      engine.localMeasurement = null;
      return;
    }

    const isClosedShape = engine.activeTool === "line" && ["rectangle", "circle", "cone", "hexagon"].includes(engine.lineShape);
    const newEntity: LineEntity = {
      id: "line-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      type: "line",
      layerId: "drawings-layer",
      zIndex: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastModifiedBy: sessionManager.myPeerId || "local",
      locked: false,
      lineType: engine.activeTool === "draw" ? "freehand" : engine.lineShape,
      points: [...engine.draftPoints],
      strokeColor: engine.drawColor,
      strokeWidth: engine.drawWidth,
      strokeOpacity: 1.0,
      isClosed: isClosedShape
    };

    sessionManager.dispatchOperation({
      opType: "CREATE_ENTITY",
      entity: newEntity
    });

    isDrawing = false;
    engine.draftPoints = null;
    engine.localMeasurement = null;
  });
}
