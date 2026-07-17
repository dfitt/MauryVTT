import { CanvasEngine } from "../canvasEngine.js";
import { sessionManager } from "../../network/sessionManager.js";

export function bindLaserTool(engine: CanvasEngine): void {
  let isDrawingLaser = false;
  let currentLaserId = "";
  let lastLaserSendTime = 0;

  engine.onMouseDown((_e, worldX, worldY) => {
    if (engine.activeTool !== "laser" && (engine.activeTool !== "ephemeral" || engine.ephemeralTool !== "laser")) return;

    isDrawingLaser = true;
    currentLaserId = "laser-" + Math.random().toString(36).substring(2, 7);
    engine.draftPoints = [[worldX, worldY]];

    engine.activeLasers.set(currentLaserId, {
      laserId: currentLaserId,
      peerId: sessionManager.myPeerId || "local",
      username: sessionManager.myUsername || "Me",
      color: engine.drawColor || "#f43f5e",
      points: [...engine.draftPoints],
      createdAt: Date.now(),
      ttlMs: 2000
    });
  });

  engine.onMouseMove((_e, worldX, worldY) => {
    if (!isDrawingLaser || !engine.draftPoints) return;

    const lastPt = engine.draftPoints[engine.draftPoints.length - 1];
    const dist = Math.hypot(worldX - lastPt[0], worldY - lastPt[1]);
    if (dist < 2 / engine.zoom) return;

    engine.draftPoints.push([worldX, worldY]);

    const existing = engine.activeLasers.get(currentLaserId);
    if (existing) {
      existing.points = [...engine.draftPoints];
      existing.createdAt = Date.now();
    }

    const now = Date.now();
    if (now - lastLaserSendTime > 40) {
      lastLaserSendTime = now;
      sessionManager.sendEphemeral({
        type: "LASER_LINE",
        laserId: currentLaserId,
        peerId: sessionManager.myPeerId || "local",
        username: sessionManager.myUsername || "Me",
        color: engine.drawColor || "#f43f5e",
        points: [...engine.draftPoints],
        ttlMs: 2000
      });
    }
  });

  engine.onMouseUp(() => {
    if (!isDrawingLaser) return;
    isDrawingLaser = false;

    if (engine.draftPoints && engine.draftPoints.length >= 2) {
      const existing = engine.activeLasers.get(currentLaserId);
      if (existing) {
        existing.points = [...engine.draftPoints];
        existing.createdAt = Date.now();
      }

      sessionManager.sendEphemeral({
        type: "LASER_LINE",
        laserId: currentLaserId,
        peerId: sessionManager.myPeerId || "local",
        username: sessionManager.myUsername || "Me",
        color: engine.drawColor || "#f43f5e",
        points: [...engine.draftPoints],
        ttlMs: 2000
      });
    } else {
      engine.activeLasers.delete(currentLaserId);
    }

    engine.draftPoints = null;
  });
}
