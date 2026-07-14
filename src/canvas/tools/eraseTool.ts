import { CanvasEngine } from "../canvasEngine.js";
import { docStore } from "../../state/documentStore.js";
import { sessionManager } from "../../network/sessionManager.js";
import { LineEntity } from "../../types/vtt.js";

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(px - x1, py - y1);
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export function bindEraseTool(engine: CanvasEngine): void {
  let isErasing = false;
  const deletedInStroke = new Set<string>();

  function eraseAt(worldX: number, worldY: number): void {
    const doc = docStore.getDocument();
    const size = doc.canvasSettings.gridSizePx || 50;
    const gx = Math.floor(worldX / size) * size;
    const gy = Math.floor(worldY / size) * size;
    const endX = gx + size;
    const endY = gy + size;
    const cellKey = `${gx},${gy}`;

    const cell = doc.gridCells?.[cellKey];
    if (cell && (cell.fillColor || cell.fogHidden)) {
      if (!deletedInStroke.has(`grid-${cellKey}`)) {
        deletedInStroke.add(`grid-${cellKey}`);
        sessionManager.dispatchOperation({
          opType: "UPDATE_GRID_CELL",
          cellKey,
          patch: { fillColor: undefined, fogHidden: undefined }
        });
      }
    }

    for (const ent of Object.values(doc.entities)) {
      if (deletedInStroke.has(ent.id)) continue;

      if (ent.type === "line") {
        const l = ent as LineEntity;
        if (!l.points || l.points.length === 0) continue;

        let hits = false;
        const threshold = size * 0.7;
        const pad = size * 0.3;

        for (const [px, py] of l.points) {
          if (px >= gx - pad && px <= endX + pad && py >= gy - pad && py <= endY + pad) {
            hits = true;
            break;
          }
        }

        if (!hits && l.points.length >= 2) {
          for (let i = 0; i < l.points.length - 1; i++) {
            const [x1, y1] = l.points[i];
            const [x2, y2] = l.points[i + 1];
            if (distanceToSegment(worldX, worldY, x1, y1, x2, y2) <= threshold) {
              hits = true;
              break;
            }
          }
        }

        if (hits) {
          deletedInStroke.add(ent.id);
          sessionManager.dispatchOperation({
            opType: "DELETE_ENTITY",
            id: ent.id
          });
        }
      }
    }
  }

  engine.onMouseDown((_e, worldX, worldY) => {
    if (engine.activeTool !== "erase") return;
    isErasing = true;
    deletedInStroke.clear();
    eraseAt(worldX, worldY);
  });

  engine.onMouseMove((_e, worldX, worldY) => {
    if (!isErasing || engine.activeTool !== "erase") return;
    eraseAt(worldX, worldY);
  });

  engine.onMouseUp(() => {
    if (isErasing) {
      isErasing = false;
      deletedInStroke.clear();
    }
  });
}
