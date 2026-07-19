import { CanvasEngine } from "../canvasEngine.js";
import { sessionManager } from "../../network/sessionManager.js";

export function bindLaserTool(engine: CanvasEngine): void {
  let isDrawingLaser = false;
  let currentLaserId = "";
  let lastLaserSendTime = 0;

  engine.onMouseDown((_e, worldX, worldY) => {
    if (engine.activeTool !== "laser" && (engine.activeTool !== "ephemeral" || engine.ephemeralTool !== "laser")) return;

    isDrawingLaser = true;
    currentLaserId = "laser-" + Math.random().toString(36).substring(2, 9);
    const now = Date.now();

    engine.activeLasers.set(currentLaserId, {
      laserId: currentLaserId,
      peerId: sessionManager.myPeerId || "local",
      username: sessionManager.myUsername || "Me",
      color: engine.drawColor || "#f43f5e",
      points: [[worldX, worldY, now]],
      createdAt: now,
      lastUpdateTime: now,
      ttlMs: 750
    });

    sessionManager.sendEphemeral({
      type: "LASER_LINE",
      laserId: currentLaserId,
      peerId: sessionManager.myPeerId || "local",
      username: sessionManager.myUsername || "Me",
      color: engine.drawColor || "#f43f5e",
      points: [[worldX, worldY]],
      ttlMs: 750
    });
    lastLaserSendTime = now;
  });

  engine.onMouseMove((_e, worldX, worldY) => {
    if (!isDrawingLaser) return;

    const existing = engine.activeLasers.get(currentLaserId);
    if (!existing) return;

    const lastPt = existing.points[existing.points.length - 1];
    const dist = Math.hypot(worldX - lastPt[0], worldY - lastPt[1]);
    if (dist < 2 / engine.zoom) return;

    const now = Date.now();
    existing.points.push([worldX, worldY, now]);
    existing.lastUpdateTime = now;

    if (now - lastLaserSendTime > 35) {
      lastLaserSendTime = now;
      sessionManager.sendEphemeral({
        type: "LASER_LINE",
        laserId: currentLaserId,
        peerId: sessionManager.myPeerId || "local",
        username: sessionManager.myUsername || "Me",
        color: engine.drawColor || "#f43f5e",
        points: existing.points.map((pt) => [pt[0], pt[1]]),
        ttlMs: 750
      });
    }
  });

  engine.onMouseUp(() => {
    if (!isDrawingLaser) return;
    isDrawingLaser = false;

    const existing = engine.activeLasers.get(currentLaserId);
    if (existing && existing.points.length >= 1) {
      sessionManager.sendEphemeral({
        type: "LASER_LINE",
        laserId: currentLaserId,
        peerId: sessionManager.myPeerId || "local",
        username: sessionManager.myUsername || "Me",
        color: engine.drawColor || "#f43f5e",
        points: existing.points.map((pt) => [pt[0], pt[1]]),
        ttlMs: 750
      });
    }
  });
}
