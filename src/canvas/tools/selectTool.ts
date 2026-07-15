import { CanvasEngine } from "../canvasEngine.js";
import { docStore } from "../../state/documentStore.js";
import { sessionManager } from "../../network/sessionManager.js";
import { CanvasEntity, ImageEntity, TokenEntity } from "../../types/vtt.js";

export function bindSelectTool(engine: CanvasEngine): void {
  let draggingEntity: CanvasEntity | null = null;
  let dragOffset = { x: 0, y: 0 };
  let lastTokenMoveSendTime = 0;

  // Resizing state
  let isResizing = false;
  let resizingEntity: (ImageEntity | TokenEntity) | null = null;
  let origAspectRatio = 1.0;
  let anchorCorner = { x: 0, y: 0 };
  let resizeDir = { x: 1, y: 1 };

  // Double-tap / double-click tracking for Simple Mode pinging
  let lastSimpleTapTime = 0;
  let lastSimpleTapPos = { x: 0, y: 0 };

  engine.onMouseDown((_e, worldX, worldY) => {
    if (engine.activeTool !== "select") return;

    const doc = docStore.getDocument();
    const entities = Object.values(doc.entities).sort((a, b) => b.zIndex - a.zIndex);

    // 1. Check if user clicked a corner resize handle on the currently selected entity
    if (engine.selectedEntityId) {
      const current = doc.entities[engine.selectedEntityId];
      const canResizeToken = current && current.type === "token" ? (engine.resizingTokenId === current.id) : true;
      if (current && !current.locked && (current.type === "image" || current.type === "token") && canResizeToken) {
        const imgEnt = current as ImageEntity | TokenEntity;
        const halfW = imgEnt.size.width / 2;
        const halfH = imgEnt.size.height / 2;
        const handleThreshold = Math.max(12, 14 / engine.zoom);

        const corners = [
          { x: imgEnt.position.x - halfW, y: imgEnt.position.y - halfH },
          { x: imgEnt.position.x + halfW, y: imgEnt.position.y - halfH },
          { x: imgEnt.position.x + halfW, y: imgEnt.position.y + halfH },
          { x: imgEnt.position.x - halfW, y: imgEnt.position.y + halfH }
        ];

        for (let i = 0; i < corners.length; i++) {
          const c = corners[i];
          const dist = Math.hypot(worldX - c.x, worldY - c.y);
          if (dist <= handleThreshold) {
            isResizing = true;
            resizingEntity = imgEnt;
            if (imgEnt.type === "image") {
              engine.aligningImageEntityId = imgEnt.id;
            }
            origAspectRatio = imgEnt.size.width / imgEnt.size.height;

            const oppCorners = [
              { x: imgEnt.position.x + halfW, y: imgEnt.position.y + halfH },
              { x: imgEnt.position.x - halfW, y: imgEnt.position.y + halfH },
              { x: imgEnt.position.x - halfW, y: imgEnt.position.y - halfH },
              { x: imgEnt.position.x + halfW, y: imgEnt.position.y - halfH }
            ];
            anchorCorner = oppCorners[i];
            resizeDir = {
              x: (i === 1 || i === 2) ? 1 : -1,
              y: (i === 2 || i === 3) ? 1 : -1
            };
            return;
          }
        }
      }
    }

    // 2. Check if user clicked inside an entity
    let found: CanvasEntity | null = null;
    for (const ent of entities) {
      if ((window as any).vttSimpleMode && ent.type !== "token") {
        continue;
      }
      if (ent.type === "image" || ent.type === "token") {
        const img = ent as ImageEntity | TokenEntity;
        const halfW = img.size.width / 2;
        const halfH = img.size.height / 2;
        if (
          worldX >= img.position.x - halfW &&
          worldX <= img.position.x + halfW &&
          worldY >= img.position.y - halfH &&
          worldY <= img.position.y + halfH
        ) {
          found = ent;
          break;
        }
      }
    }

    if (found) {
      engine.selectedEntityId = found.id;
      if (!found.locked) {
        draggingEntity = found;
        engine.draggingEntityId = found.id;
        if (found.type === "image") {
          engine.aligningImageEntityId = found.id;
        }
        const pos = (found as ImageEntity).position;
        dragOffset = { x: worldX - pos.x, y: worldY - pos.y };
      } else {
        draggingEntity = null;
        engine.draggingEntityId = null;
      }
    } else {
      if ((window as any).vttSimpleMode) {
        const now = Date.now();
        const dist = Math.hypot(worldX - lastSimpleTapPos.x, worldY - lastSimpleTapPos.y);
        const maxDist = Math.max(30, 40 / engine.zoom);
        if (now - lastSimpleTapTime < 450 && dist <= maxDist) {
          const pingId = "ping-" + Math.random().toString(36).substring(2, 7);
          const ttlMs = 2000;
          const pingPayload = {
            type: "PING" as const,
            pingId,
            peerId: sessionManager.myPeerId || "local",
            username: sessionManager.myUsername || "Me",
            color: sessionManager.myColor || "#eab308",
            x: worldX,
            y: worldY,
            pingStyle: "ripple" as const,
            ttlMs
          };
          engine.handleEphemeralPayload(pingPayload);
          sessionManager.sendEphemeral(pingPayload);
          lastSimpleTapTime = 0;
        } else {
          lastSimpleTapTime = now;
          lastSimpleTapPos = { x: worldX, y: worldY };
        }
      }
      engine.selectedEntityId = null;
      draggingEntity = null;
      engine.draggingEntityId = null;
    }
  });

  engine.onMouseMove((_e, worldX, worldY) => {
    if (engine.activeTool !== "select") return;

    if (isResizing && resizingEntity) {
      const rawW = Math.abs(worldX - anchorCorner.x);
      let newWidth = Math.max(30, Math.round(rawW));
      let newHeight = Math.max(30, Math.round(newWidth / origAspectRatio));

      if (resizingEntity.type === "token") {
        const doc = docStore.getDocument();
        const gridSizePx = doc.canvasSettings.gridSizePx || 50;
        const cells = Math.max(1, Math.round(newWidth / gridSizePx));
        newWidth = cells * gridSizePx;
        newHeight = cells * gridSizePx;
      }

      resizingEntity.size = { width: newWidth, height: newHeight };
      resizingEntity.position = {
        x: anchorCorner.x + resizeDir.x * (newWidth / 2),
        y: anchorCorner.y + resizeDir.y * (newHeight / 2)
      };
      return;
    }

    if (draggingEntity && !draggingEntity.locked) {
      const newX = worldX - dragOffset.x;
      const newY = worldY - dragOffset.y;
      if (draggingEntity.type === "image" || draggingEntity.type === "token") {
        (draggingEntity as ImageEntity).position = { x: newX, y: newY };

        if (draggingEntity.type === "token") {
          const now = Date.now();
          if (now - lastTokenMoveSendTime >= 33) {
            lastTokenMoveSendTime = now;
            sessionManager.dispatchOperation({
              opType: "UPDATE_ENTITY",
              id: draggingEntity.id,
              patch: { position: { x: newX, y: newY } } as any
            });
          }
        }
      }
    }
  });

  engine.onMouseUp((_e, worldX, worldY) => {
    engine.aligningImageEntityId = null;
    if (engine.activeTool !== "select") return;

    if (isResizing && resizingEntity) {
      let finalPos = { ...resizingEntity.position };
      if (resizingEntity.type === "token") {
        const doc = docStore.getDocument();
        const gridSizePx = doc.canvasSettings.gridSizePx || 50;
        const tlX = Math.round((resizingEntity.position.x - resizingEntity.size.width / 2) / gridSizePx) * gridSizePx;
        const tlY = Math.round((resizingEntity.position.y - resizingEntity.size.height / 2) / gridSizePx) * gridSizePx;
        finalPos = {
          x: tlX + resizingEntity.size.width / 2,
          y: tlY + resizingEntity.size.height / 2
        };
        resizingEntity.position = finalPos;
      }

      sessionManager.dispatchOperation({
        opType: "UPDATE_ENTITY",
        id: resizingEntity.id,
        patch: {
          size: { ...resizingEntity.size },
          position: finalPos
        } as any
      });
      isResizing = false;
      resizingEntity = null;
      return;
    }

    if (!draggingEntity || draggingEntity.locked) return;

    const doc = docStore.getDocument();
    let targetX = worldX - dragOffset.x;
    let targetY = worldY - dragOffset.y;

    if (draggingEntity.type === "token") {
      const gridSizePx = doc.canvasSettings.gridSizePx || 50;
      const tlX = Math.round((targetX - draggingEntity.size.width / 2) / gridSizePx) * gridSizePx;
      const tlY = Math.round((targetY - draggingEntity.size.height / 2) / gridSizePx) * gridSizePx;
      targetX = tlX + draggingEntity.size.width / 2;
      targetY = tlY + draggingEntity.size.height / 2;
    } else if (draggingEntity.type === "image") {
      targetX = draggingEntity.position.x;
      targetY = draggingEntity.position.y;
    } else {
      const snap = doc.canvasSettings.gridSnap && doc.canvasSettings.gridEnabled;
      if (snap) {
        const snapped = engine.snapToGrid(targetX, targetY, doc.canvasSettings.gridSizePx);
        targetX = snapped.x;
        targetY = snapped.y;
      }
    }

    sessionManager.dispatchOperation({
      opType: "UPDATE_ENTITY",
      id: draggingEntity.id,
      patch: {
        position: { x: targetX, y: targetY }
      } as any
    });

    draggingEntity = null;
    engine.draggingEntityId = null;
  });
}
