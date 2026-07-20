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

function snapshotSelectedPoints(engine: CanvasEngine): Map<string, [number, number][]> {
  const doc = docStore.getDocument();
  const map = new Map<string, [number, number][]>();
  for (const id of engine.selectedDrawingIds) {
    const ent = doc.entities[id];
    if (ent && ent.type === "line") {
      const l = ent as LineEntity;
      map.set(id, l.points.map(([px, py]) => [px, py]));
    }
  }
  return map;
}

function getSelectedDrawingBounds(engine: CanvasEngine): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const doc = docStore.getDocument();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of engine.selectedDrawingIds) {
    const ent = doc.entities[id];
    if (ent && ent.type === "line") {
      const l = ent as LineEntity;
      for (const [px, py] of l.points) {
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }
    }
  }
  if (minX === Infinity || maxX === -Infinity) return null;
  return { minX, minY, maxX, maxY };
}

export function bindDrawTool(engine: CanvasEngine): void {
  let isDrawing = false;
  let isSelectingBox = false;
  let isDraggingSelected = false;
  let isResizingSelected = false;
  let activeResizeHandle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | null = null;
  let isRotatingSelected = false;
  let rotateCenter: { x: number; y: number } = { x: 0, y: 0 };
  let rotateStartAngle = 0;
  let origGroupBounds: { minX: number; minY: number; maxX: number; maxY: number } = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let origSelectedPoints: Map<string, [number, number][]> = new Map();
  let startPt: [number, number] = [0, 0];
  let dragLastWorldPt: [number, number] = [0, 0];

  engine.onMouseDown((_e, worldX, worldY) => {
    if (engine.activeTool !== "draw" && engine.activeTool !== "line") return;

    if (engine.activeTool === "line" && engine.lineShape === "select") {
      if (engine.selectedDrawingIds.size > 0) {
        const bounds = getSelectedDrawingBounds(engine);
        if (bounds) {
          const pad = 10 / engine.zoom;
          const bx = bounds.minX - pad;
          const by = bounds.minY - pad;
          const bw = (bounds.maxX - bounds.minX) + pad * 2;
          const bh = (bounds.maxY - bounds.minY) + pad * 2;
          const centerX = bx + bw / 2;
          const centerY = by + bh / 2;

          const rotDist = Math.max(24, 30 / engine.zoom);
          const handleThreshold = Math.max(12, 14 / engine.zoom);
          if (Math.hypot(worldX - centerX, worldY - (by - rotDist)) <= handleThreshold) {
            isRotatingSelected = true;
            rotateCenter = { x: centerX, y: centerY };
            rotateStartAngle = Math.atan2(worldY - centerY, worldX - centerX);
            origSelectedPoints = snapshotSelectedPoints(engine);
            return;
          }

          const handleCenters: { id: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"; x: number; y: number }[] = [
            { id: "nw", x: bx, y: by },
            { id: "n", x: centerX, y: by },
            { id: "ne", x: bx + bw, y: by },
            { id: "e", x: bx + bw, y: centerY },
            { id: "se", x: bx + bw, y: by + bh },
            { id: "s", x: centerX, y: by + bh },
            { id: "sw", x: bx, y: by + bh },
            { id: "w", x: bx, y: centerY }
          ];
          for (const hc of handleCenters) {
            if (Math.hypot(worldX - hc.x, worldY - hc.y) <= handleThreshold) {
              isResizingSelected = true;
              activeResizeHandle = hc.id;
              origGroupBounds = { ...bounds };
              origSelectedPoints = snapshotSelectedPoints(engine);
              return;
            }
          }

          if (worldX >= bx && worldX <= bx + bw && worldY >= by && worldY <= by + bh) {
            isDraggingSelected = true;
            dragLastWorldPt = [worldX, worldY];
            return;
          }
        }
      }
      if (engine.selectedDrawingIds.size > 0) {
        engine.selectedDrawingIds.clear();
        engine.notifyDrawingSelectionChanged();
      }
      isSelectingBox = true;
      engine.drawingSelectionBox = { x1: worldX, y1: worldY, x2: worldX, y2: worldY };
      return;
    }

    isDrawing = true;
    if (engine.activeTool === "draw" || (engine.activeTool === "line" && engine.lineShape === "doodle")) {
      startPt = [worldX, worldY];
      engine.draftPoints = [[worldX, worldY]];
    } else if (engine.activeTool === "line") {
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
    }
  });

  engine.onMouseMove((_e, worldX, worldY) => {
    if (isSelectingBox && engine.drawingSelectionBox) {
      engine.drawingSelectionBox.x2 = worldX;
      engine.drawingSelectionBox.y2 = worldY;
      return;
    }

    if (isRotatingSelected && origSelectedPoints.size > 0) {
      const doc = docStore.getDocument();
      const currentAngle = Math.atan2(worldY - rotateCenter.y, worldX - rotateCenter.x);
      const deltaAngle = currentAngle - rotateStartAngle;
      const cos = Math.cos(deltaAngle);
      const sin = Math.sin(deltaAngle);

      for (const [id, pts] of origSelectedPoints.entries()) {
        const ent = doc.entities[id];
        if (ent && ent.type === "line") {
          const l = ent as LineEntity;
          l.points = pts.map(([px, py]) => {
            const dx = px - rotateCenter.x;
            const dy = py - rotateCenter.y;
            return [
              rotateCenter.x + dx * cos - dy * sin,
              rotateCenter.y + dx * sin + dy * cos
            ];
          });
        }
      }
      return;
    }

    if (isResizingSelected && activeResizeHandle && origSelectedPoints.size > 0) {
      const doc = docStore.getDocument();
      const origW = Math.max(1, origGroupBounds.maxX - origGroupBounds.minX);
      const origH = Math.max(1, origGroupBounds.maxY - origGroupBounds.minY);

      let anchorX = (origGroupBounds.minX + origGroupBounds.maxX) / 2;
      let scaleX = 1;
      if (activeResizeHandle.includes("e")) {
        anchorX = origGroupBounds.minX;
        scaleX = (worldX - anchorX) / origW;
      } else if (activeResizeHandle.includes("w")) {
        anchorX = origGroupBounds.maxX;
        scaleX = (anchorX - worldX) / origW;
      }

      let anchorY = (origGroupBounds.minY + origGroupBounds.maxY) / 2;
      let scaleY = 1;
      if (activeResizeHandle.includes("s")) {
        anchorY = origGroupBounds.minY;
        scaleY = (worldY - anchorY) / origH;
      } else if (activeResizeHandle.includes("n")) {
        anchorY = origGroupBounds.maxY;
        scaleY = (anchorY - worldY) / origH;
      }

      if (Math.abs(scaleX) < 0.05) scaleX = scaleX >= 0 ? 0.05 : -0.05;
      if (Math.abs(scaleY) < 0.05) scaleY = scaleY >= 0 ? 0.05 : -0.05;

      for (const [id, pts] of origSelectedPoints.entries()) {
        const ent = doc.entities[id];
        if (ent && ent.type === "line") {
          const l = ent as LineEntity;
          l.points = pts.map(([px, py]) => [
            anchorX + (px - anchorX) * scaleX,
            anchorY + (py - anchorY) * scaleY
          ]);
        }
      }
      return;
    }

    if (isDraggingSelected && engine.selectedDrawingIds.size > 0) {
      const dx = worldX - dragLastWorldPt[0];
      const dy = worldY - dragLastWorldPt[1];
      dragLastWorldPt = [worldX, worldY];
      const doc = docStore.getDocument();
      for (const id of engine.selectedDrawingIds) {
        const ent = doc.entities[id];
        if (ent && ent.type === "line") {
          const l = ent as LineEntity;
          l.points = l.points.map(([px, py]) => [px + dx, py + dy]);
        }
      }
      return;
    }

    if (engine.activeTool === "line" && engine.lineShape === "select") {
      let hoveredHandle = false;
      if (engine.selectedDrawingIds.size > 0 && !isSelectingBox && !isDraggingSelected && !isResizingSelected && !isRotatingSelected) {
        const bounds = getSelectedDrawingBounds(engine);
        if (bounds) {
          const pad = 10 / engine.zoom;
          const bx = bounds.minX - pad;
          const by = bounds.minY - pad;
          const bw = (bounds.maxX - bounds.minX) + pad * 2;
          const bh = (bounds.maxY - bounds.minY) + pad * 2;
          const centerX = bx + bw / 2;
          const centerY = by + bh / 2;

          const rotDist = Math.max(24, 30 / engine.zoom);
          const handleThreshold = Math.max(12, 14 / engine.zoom);
          if (Math.hypot(worldX - centerX, worldY - (by - rotDist)) <= handleThreshold) {
            engine.canvas.style.cursor = "grab";
            hoveredHandle = true;
          } else {
            const handleCenters: { id: string; x: number; y: number; cursor: string }[] = [
              { id: "nw", x: bx, y: by, cursor: "nwse-resize" },
              { id: "n", x: centerX, y: by, cursor: "ns-resize" },
              { id: "ne", x: bx + bw, y: by, cursor: "nesw-resize" },
              { id: "e", x: bx + bw, y: centerY, cursor: "ew-resize" },
              { id: "se", x: bx + bw, y: by + bh, cursor: "nwse-resize" },
              { id: "s", x: centerX, y: by + bh, cursor: "ns-resize" },
              { id: "sw", x: bx, y: by + bh, cursor: "nesw-resize" },
              { id: "w", x: bx, y: centerY, cursor: "ew-resize" }
            ];
            for (const hc of handleCenters) {
              if (Math.hypot(worldX - hc.x, worldY - hc.y) <= handleThreshold) {
                engine.canvas.style.cursor = hc.cursor;
                hoveredHandle = true;
                break;
              }
            }
          }
          if (!hoveredHandle && worldX >= bx && worldX <= bx + bw && worldY >= by && worldY <= by + bh) {
            engine.canvas.style.cursor = "move";
            hoveredHandle = true;
          }
        }
      }
      if (!hoveredHandle) {
        engine.canvas.style.cursor = "default";
      }
      return;
    }

    if (!isDrawing || !engine.draftPoints) return;

    if (engine.activeTool === "draw" || (engine.activeTool === "line" && engine.lineShape === "doodle")) {
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
    if (isSelectingBox) {
      isSelectingBox = false;
      const box = engine.drawingSelectionBox;
      engine.drawingSelectionBox = null;
      if (box) {
        const minX = Math.min(box.x1, box.x2);
        const maxX = Math.max(box.x1, box.x2);
        const minY = Math.min(box.y1, box.y2);
        const maxY = Math.max(box.y1, box.y2);
        if (Math.abs(maxX - minX) > 4 && Math.abs(maxY - minY) > 4) {
          const doc = docStore.getDocument();
          for (const ent of Object.values(doc.entities)) {
            if (ent.type === "line") {
              const l = ent as LineEntity;
              if (!l.points || l.points.length === 0) continue;
              let hit = false;
              for (const [px, py] of l.points) {
                if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
                  hit = true;
                  break;
                }
              }
              if (!hit && l.points.length >= 2) {
                for (let i = 0; i < l.points.length - 1; i++) {
                  const [x1, y1] = l.points[i];
                  const [x2, y2] = l.points[i + 1];
                  const dx = x2 - x1, dy = y2 - y1;
                  const lenSq = dx * dx + dy * dy;
                  let t = 0;
                  if (lenSq !== 0) t = Math.max(0, Math.min(1, ((minX + (maxX - minX) / 2 - x1) * dx + (minY + (maxY - minY) / 2 - y1) * dy) / lenSq));
                  const projX = x1 + t * dx, projY = y1 + t * dy;
                  if (projX >= minX && projX <= maxX && projY >= minY && projY <= maxY) {
                    hit = true;
                    break;
                  }
                }
              }
              if (hit) {
                engine.selectedDrawingIds.add(l.id);
              }
            }
          }
          engine.notifyDrawingSelectionChanged();
        }
      }
      return;
    }

    if (isResizingSelected || isRotatingSelected || isDraggingSelected) {
      isResizingSelected = false;
      isRotatingSelected = false;
      isDraggingSelected = false;
      activeResizeHandle = null;
      origSelectedPoints.clear();
      const doc = docStore.getDocument();
      for (const id of engine.selectedDrawingIds) {
        const ent = doc.entities[id];
        if (ent && ent.type === "line") {
          const l = ent as LineEntity;
          sessionManager.dispatchOperation({
            opType: "UPDATE_ENTITY",
            id: l.id,
            patch: { points: l.points, updatedAt: Date.now() }
          });
        }
      }
      return;
    }

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
      lineType: (engine.activeTool === "draw" || engine.lineShape === "doodle" || engine.lineShape === "select") ? "freehand" : (engine.lineShape as LineEntity["lineType"]),
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
