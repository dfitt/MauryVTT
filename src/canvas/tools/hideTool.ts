import { CanvasEngine } from "../canvasEngine.js";
import { docStore } from "../../state/documentStore.js";
import { sessionManager } from "../../network/sessionManager.js";
import { ImageEntity, TokenEntity } from "../../types/vtt.js";

export function bindHideTool(engine: CanvasEngine): void {
  let isDragging = false;
  const processedCellsInStroke = new Set<string>();

  function applyMaskAt(worldX: number, worldY: number): void {
    const doc = docStore.getDocument();
    const entities = Object.values(doc.entities).sort((a, b) => b.zIndex - a.zIndex);

    for (const ent of entities) {
      if (ent.type !== "image" && ent.type !== "token") continue;
      const imgEnt = ent as ImageEntity | TokenEntity;

      const dx = worldX - imgEnt.position.x;
      const dy = worldY - imgEnt.position.y;
      const angle = -(imgEnt.rotation || 0);

      const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const localY = dx * Math.sin(angle) + dy * Math.cos(angle);

      const halfW = imgEnt.size.width / 2;
      const halfH = imgEnt.size.height / 2;

      if (localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH) {
        const cellSize = 50;
        const cx = Math.floor(localX / cellSize) * cellSize;
        const cy = Math.floor(localY / cellSize) * cellSize;
        const cellKey = `${cx},${cy}`;
        const strokeKey = `${imgEnt.id}:${cellKey}`;

        if (processedCellsInStroke.has(strokeKey)) break;
        processedCellsInStroke.add(strokeKey);

        const existing = imgEnt.hiddenCells ? [...imgEnt.hiddenCells] : [];
        const isAlreadyHidden = existing.some((k) => k.split("@")[0] === cellKey);

        if (engine.activeTool === "hide") {
          if (!isAlreadyHidden) {
            const creator = sessionManager.myPeerId || "local";
            existing.push(`${cellKey}@${creator}`);
            sessionManager.dispatchOperation({
              opType: "UPDATE_ENTITY",
              id: imgEnt.id,
              patch: { hiddenCells: existing } as any
            });
          }
        } else if (engine.activeTool === "unhide") {
          if (isAlreadyHidden) {
            const updated = existing.filter((k) => k.split("@")[0] !== cellKey);
            sessionManager.dispatchOperation({
              opType: "UPDATE_ENTITY",
              id: imgEnt.id,
              patch: { hiddenCells: updated } as any
            });
          }
        }

        break;
      }
    }
  }

  engine.onMouseDown((_e, worldX, worldY) => {
    if (engine.activeTool !== "hide" && engine.activeTool !== "unhide") return;
    isDragging = true;
    processedCellsInStroke.clear();
    applyMaskAt(worldX, worldY);
  });

  engine.onMouseMove((_e, worldX, worldY) => {
    if (!isDragging || (engine.activeTool !== "hide" && engine.activeTool !== "unhide")) return;
    applyMaskAt(worldX, worldY);
  });

  engine.onMouseUp(() => {
    if (isDragging) {
      isDragging = false;
      processedCellsInStroke.clear();
    }
  });
}
