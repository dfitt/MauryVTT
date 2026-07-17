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
    const span = engine.eraseSize || 1;
    const endX = gx + size * span;
    const endY = gy + size * span;

    for (let dx = 0; dx < span; dx++) {
      for (let dy = 0; dy < span; dy++) {
        const cx = gx + dx * size;
        const cy = gy + dy * size;
        const cellKey = `${cx},${cy}`;
        const cell = doc.gridCells?.[cellKey];
        if (cell && (cell.fillColor || cell.fogHidden)) {
          if (engine.eraseOnlyMine) {
            const myPeerId = sessionManager.myPeerId || "local";
            const creator = cell.fillColor ? cell.fillCreator : cell.fogCreator;
            if (creator && creator !== myPeerId && creator !== "local") {
              continue;
            }
          }
          if (!deletedInStroke.has(`grid-${cellKey}`)) {
            deletedInStroke.add(`grid-${cellKey}`);
            sessionManager.dispatchOperation({
              opType: "UPDATE_GRID_CELL",
              cellKey,
              patch: { fillColor: undefined, fogHidden: undefined }
            });
          }
        }
      }
    }

    const myPeerId = sessionManager.myPeerId || "local";
    const processedInThisCall = new Set<string>();

    for (const ent of Object.values(doc.entities)) {
      if (deletedInStroke.has(ent.id) || processedInThisCall.has(ent.id)) continue;

      if (ent.type === "line") {
        if (engine.eraseOnlyMine && ent.lastModifiedBy && ent.lastModifiedBy !== myPeerId && ent.lastModifiedBy !== "local") {
          continue;
        }
        const l = ent as LineEntity;
        if (!l.points || l.points.length < 2) continue;

        const threshold = (size * span) * 0.5;
        const midX = gx + (endX - gx) / 2;
        const midY = gy + (endY - gy) / 2;
        const pad = size * 0.3;

        const subdivStep = Math.min(size * 0.4, 20);
        const subPts: [number, number][] = [];
        const origNumSegs = l.isClosed ? l.points.length : l.points.length - 1;
        for (let i = 0; i < origNumSegs; i++) {
          const p1 = l.points[i];
          const p2 = l.points[(i + 1) % l.points.length];
          subPts.push(p1);
          const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
          if (dist > subdivStep) {
            const steps = Math.ceil(dist / subdivStep);
            for (let s = 1; s < steps; s++) {
              const t = s / steps;
              subPts.push([p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t]);
            }
          }
        }
        if (!l.isClosed && l.points.length > 0) {
          subPts.push(l.points[l.points.length - 1]);
        }

        const numSubSegs = l.isClosed ? subPts.length : subPts.length - 1;
        if (numSubSegs <= 0) continue;

        const segHits = (pA: [number, number], pB: [number, number]): boolean => {
          if (pA[0] >= gx - pad && pA[0] <= endX + pad && pA[1] >= gy - pad && pA[1] <= endY + pad) return true;
          if (pB[0] >= gx - pad && pB[0] <= endX + pad && pB[1] >= gy - pad && pB[1] <= endY + pad) return true;
          return distanceToSegment(midX, midY, pA[0], pA[1], pB[0], pB[1]) <= threshold;
        };

        const kept: boolean[] = [];
        let anyErased = false;
        for (let i = 0; i < numSubSegs; i++) {
          const pA = subPts[i];
          const pB = subPts[(i + 1) % subPts.length];
          const h = segHits(pA, pB);
          if (h) anyErased = true;
          kept.push(!h);
        }

        if (!anyErased) continue;

        if (kept.every((k) => !k)) {
          deletedInStroke.add(ent.id);
          sessionManager.dispatchOperation({
            opType: "DELETE_ENTITY",
            id: ent.id
          });
          continue;
        }

        const chains: [number, number][][] = [];
        let startIdx = 0;
        if (l.isClosed && kept[0] && kept[numSubSegs - 1]) {
          for (let i = 0; i < numSubSegs; i++) {
            if (kept[i] && !kept[(i - 1 + numSubSegs) % numSubSegs]) {
              startIdx = i;
              break;
            }
          }
        }

        let currentChain: [number, number][] = [];
        for (let count = 0; count < numSubSegs; count++) {
          const idx = (startIdx + count) % numSubSegs;
          if (kept[idx]) {
            const pA = subPts[idx];
            const pB = subPts[(idx + 1) % subPts.length];
            if (currentChain.length === 0) {
              currentChain.push(pA, pB);
            } else {
              currentChain.push(pB);
            }
          } else {
            if (currentChain.length >= 2) {
              chains.push(currentChain);
            }
            currentChain = [];
          }
        }
        if (currentChain.length >= 2) {
          chains.push(currentChain);
        }

        deletedInStroke.add(ent.id);
        sessionManager.dispatchOperation({
          opType: "DELETE_ENTITY",
          id: ent.id
        });

        for (let idx = 0; idx < chains.length; idx++) {
          const c = chains[idx];
          const newEnt: LineEntity = {
            ...l,
            id: l.id + "-s" + idx + "-" + Math.random().toString(36).substring(2, 6),
            points: c,
            isClosed: false,
            updatedAt: Date.now()
          };
          processedInThisCall.add(newEnt.id);
          sessionManager.dispatchOperation({
            opType: "CREATE_ENTITY",
            entity: newEnt
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
