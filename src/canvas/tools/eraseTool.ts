import { CanvasEngine } from "../canvasEngine.js";
import { docStore } from "../../state/documentStore.js";
import { sessionManager } from "../../network/sessionManager.js";
import { LineEntity } from "../../types/vtt.js";

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

    for (const ent of Object.values(doc.entities)) {
      if (deletedInStroke.has(ent.id)) continue;

      if (ent.type === "line") {
        const l = ent as LineEntity;
        let hits = false;

        for (const [px, py] of l.points) {
          if (px >= gx && px <= endX && py >= gy && py <= endY) {
            hits = true;
            break;
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
