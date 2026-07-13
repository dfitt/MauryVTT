import { CanvasEngine } from "../canvasEngine.js";
import { sessionManager } from "../../network/sessionManager.js";
import { docStore } from "../../state/documentStore.js";

export function bindMeasureTool(engine: CanvasEngine): void {
  let isMeasuring = false;
  let startPt = { x: 0, y: 0 };
  const measureId = "measure-" + Math.random().toString(36).substring(2, 7);

  engine.onMouseDown((_e, worldX, worldY) => {
    if (engine.activeTool !== "measure") return;
    isMeasuring = true;
    startPt = { x: worldX, y: worldY };

    engine.localMeasurement = {
      measureId,
      peerId: sessionManager.myPeerId || "local",
      username: sessionManager.myUsername || "Me",
      startPoint: startPt,
      endPoint: startPt,
      color: sessionManager.myColor || "#38bdf8",
      unitLabel: "0 ft"
    };
  });

  engine.onMouseMove((_e, worldX, worldY) => {
    if (!isMeasuring || !engine.localMeasurement) return;

    const dx = worldX - startPt.x;
    const dy = worldY - startPt.y;
    const distPx = Math.sqrt(dx * dx + dy * dy);

    const doc = docStore.getDocument();
    const gridPx = doc.canvasSettings.gridSizePx || 50;
    const squares = (distPx / gridPx).toFixed(1);
    const feet = Math.round((distPx / gridPx) * 5);
    const unitLabel = `${feet} ft (${squares} sq)`;

    engine.localMeasurement.endPoint = { x: worldX, y: worldY };
    engine.localMeasurement.unitLabel = unitLabel;

    sessionManager.sendEphemeral({
      type: "MEASURE_LINE",
      measureId,
      peerId: sessionManager.myPeerId || "local",
      username: sessionManager.myUsername || "Me",
      active: true,
      startPoint: startPt,
      endPoint: { x: worldX, y: worldY },
      color: sessionManager.myColor || "#38bdf8",
      unitLabel
    });
  });

  engine.onMouseUp(() => {
    if (!isMeasuring) return;
    isMeasuring = false;
    engine.localMeasurement = null;

    sessionManager.sendEphemeral({
      type: "MEASURE_LINE",
      measureId,
      peerId: sessionManager.myPeerId || "local",
      username: sessionManager.myUsername || "Me",
      active: false,
      startPoint: startPt,
      endPoint: startPt,
      color: sessionManager.myColor || "#38bdf8",
      unitLabel: ""
    });
  });
}
