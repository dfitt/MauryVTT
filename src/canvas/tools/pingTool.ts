import { CanvasEngine } from "../canvasEngine.js";
import { sessionManager } from "../../network/sessionManager.js";

export function bindPingTool(engine: CanvasEngine): void {
  engine.onMouseDown((_e, worldX, worldY) => {
    if (engine.activeTool !== "ping") return;

    const pingId = "ping-" + Math.random().toString(36).substring(2, 7);
    const ttlMs = 2000;

    // Local echo
    engine.handleEphemeralPayload({
      type: "PING",
      pingId,
      peerId: sessionManager.myPeerId || "local",
      username: sessionManager.myUsername || "Me",
      color: sessionManager.myColor || "#eab308",
      x: worldX,
      y: worldY,
      pingStyle: "ripple",
      ttlMs
    });

    // Remote broadcast
    sessionManager.sendEphemeral({
      type: "PING",
      pingId,
      peerId: sessionManager.myPeerId || "local",
      username: sessionManager.myUsername || "Me",
      color: sessionManager.myColor || "#eab308",
      x: worldX,
      y: worldY,
      pingStyle: "ripple",
      ttlMs
    });
  });
}
