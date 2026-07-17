import { CanvasEngine } from "../canvasEngine.js";

export function bindPingTool(engine: CanvasEngine): void {
  engine.onMouseDown((_e, worldX, worldY) => {
    if (engine.activeTool !== "ping" && (engine.activeTool !== "ephemeral" || engine.ephemeralTool !== "ping")) return;
    engine.triggerPing(worldX, worldY);
  });
}
