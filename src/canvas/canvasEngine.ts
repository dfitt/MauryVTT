import { docStore } from "../state/documentStore.js";
import { assetStore } from "../state/idbAssetStore.js";
import {
  VTTDocument,
  CanvasEntity,
  ImageEntity,
  TokenEntity,
  LineEntity,
  EphemeralPayload
} from "../types/vtt.js";
import { sessionManager } from "../network/sessionManager.js";

export type ToolType = "select" | "pan" | "draw" | "line" | "fill" | "erase" | "hide" | "unhide" | "measure" | "ping" | "token";

export interface ActiveMeasurement {
  measureId: string;
  peerId: string;
  username: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  color: string;
  unitLabel: string;
}

export interface ActivePing {
  pingId: string;
  peerId: string;
  username: string;
  color: string;
  x: number;
  y: number;
  createdAt: number;
  ttlMs: number;
}

export interface RemoteCursor {
  peerId: string;
  username: string;
  color: string;
  x: number;
  y: number;
  lastSeenAt: number;
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number = 0;

  // Viewport transform
  public panX: number = 0;
  public panY: number = 0;
  public zoom: number = 1.0;

  // Tool state
  public activeTool: ToolType = "select";
  public drawColor: string = "#38bdf8";
  public drawWidth: number = 4;
  private _selectedEntityId: string | null = null;
  public aligningImageEntityId: string | null = null;
  private selectionListeners: Set<(id: string | null) => void> = new Set();

  // Hover cursor state for tool previews
  public hoverWorldPos: { x: number; y: number } | null = null;

  // Ephemeral states
  private remoteCursors: Map<string, RemoteCursor> = new Map();
  private activePings: Map<string, ActivePing> = new Map();
  private activeMeasurements: Map<string, ActiveMeasurement> = new Map();

  // Active user drawing draft
  public draftPoints: [number, number][] | null = null;
  public localMeasurement: ActiveMeasurement | null = null;

  // Image cache
  private imageElements: Map<string, HTMLImageElement> = new Map();
  private loadingAssets: Set<string> = new Set();

  // Interaction handlers
  private onMouseDownListeners: ((e: MouseEvent, worldX: number, worldY: number) => void)[] = [];
  private onMouseMoveListeners: ((e: MouseEvent, worldX: number, worldY: number) => void)[] = [];
  private onMouseUpListeners: ((e: MouseEvent, worldX: number, worldY: number) => void)[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D rendering context");
    this.ctx = ctx;

    this.resizeCanvas();
    this.setupEvents();

    const parent = this.canvas.parentElement;
    if (parent && typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(() => {
        this.resizeCanvas();
      });
      resizeObserver.observe(parent);
    }

    window.addEventListener("resize", () => this.resizeCanvas());
    window.addEventListener("orientationchange", () => {
      setTimeout(() => this.resizeCanvas(), 50);
      setTimeout(() => this.resizeCanvas(), 300);
    });

    this.startRenderLoop();

    sessionManager.onEphemeral((payload) => this.handleEphemeralPayload(payload));
  }

  public get selectedEntityId(): string | null {
    return this._selectedEntityId;
  }

  public set selectedEntityId(id: string | null) {
    if (this._selectedEntityId !== id) {
      this._selectedEntityId = id;
      for (const l of this.selectionListeners) {
        l(id);
      }
    }
  }

  public onSelectionChanged(listener: (id: string | null) => void): () => void {
    this.selectionListeners.add(listener);
    listener(this._selectedEntityId);
    return () => this.selectionListeners.delete(listener);
  }

  private setupEvents(): void {
    let isPanning = false;
    let isSpacePressed = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && document.activeElement?.tagName !== "INPUT") {
        isSpacePressed = true;
      }
    });
    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") isSpacePressed = false;
    });

    this.canvas.addEventListener("mousedown", (e) => {
      const world = this.screenToWorld(e.offsetX, e.offsetY);
      const activeTool = (window as any).vttActiveTool;
      if (e.button === 1 || (e.button === 0 && (isSpacePressed || activeTool === "pan"))) {
        isPanning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        return;
      }
      for (const l of this.onMouseDownListeners) l(e, world.x, world.y);
    });

    window.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      const world = this.screenToWorld(offsetX, offsetY);
      this.hoverWorldPos = world;

      if (isPanning) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        this.panX += dx;
        this.panY += dy;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        return;
      }

      if (sessionManager.myPeerId) {
        sessionManager.sendEphemeral({
          type: "CURSOR",
          peerId: sessionManager.myPeerId,
          username: sessionManager.myUsername || "Guest",
          color: sessionManager.myColor || "#eab308",
          x: world.x,
          y: world.y
        });
      }

      for (const l of this.onMouseMoveListeners) l(e, world.x, world.y);
    });

    window.addEventListener("mouseup", (e) => {
      if (isPanning) {
        isPanning = false;
        return;
      }
      const rect = this.canvas.getBoundingClientRect();
      const world = this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      for (const l of this.onMouseUpListeners) l(e, world.x, world.y);
    });

    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const newZoom = Math.min(Math.max(0.1, this.zoom * zoomFactor), 8.0);

      const worldBefore = this.screenToWorld(e.offsetX, e.offsetY);
      this.zoom = newZoom;
      const worldAfter = this.screenToWorld(e.offsetX, e.offsetY);

      this.panX += (worldAfter.x - worldBefore.x) * this.zoom;
      this.panY += (worldAfter.y - worldBefore.y) * this.zoom;
    });

    // Mobile touch support: Two-finger pan & pinch zoom + 1-finger Pan Tool
    let touchPan = false;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let initialPinchDist = 0;

    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        touchPan = true;
        lastTouchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        lastTouchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        initialPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        return;
      }
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const world = this.screenToWorld(touch.clientX - rect.left, touch.clientY - rect.top);

        const activeTool = (window as any).vttActiveTool || "select";
        if (activeTool === "pan") {
          touchPan = true;
          lastTouchX = touch.clientX;
          lastTouchY = touch.clientY;
          return;
        }

        const simDown = new MouseEvent("mousedown", {
          clientX: touch.clientX,
          clientY: touch.clientY,
          button: 0
        });
        for (const l of this.onMouseDownListeners) l(simDown, world.x, world.y);
      }
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2) {
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );

        if (initialPinchDist > 0 && Math.abs(dist - initialPinchDist) > 5) {
          const zoomFactor = dist / initialPinchDist;
          this.zoom = Math.min(Math.max(0.1, this.zoom * zoomFactor), 8.0);
          initialPinchDist = dist;
        }

        this.panX += midX - lastTouchX;
        this.panY += midY - lastTouchY;
        lastTouchX = midX;
        lastTouchY = midY;
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const world = this.screenToWorld(touch.clientX - rect.left, touch.clientY - rect.top);
        this.hoverWorldPos = world;

        if (touchPan) {
          this.panX += touch.clientX - lastTouchX;
          this.panY += touch.clientY - lastTouchY;
          lastTouchX = touch.clientX;
          lastTouchY = touch.clientY;
          return;
        }

        const simMove = new MouseEvent("mousemove", {
          clientX: touch.clientX,
          clientY: touch.clientY,
          button: 0
        });
        for (const l of this.onMouseMoveListeners) l(simMove, world.x, world.y);
      }
    }, { passive: true });

    window.addEventListener("touchend", (e) => {
      touchPan = false;
      if (e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const rect = this.canvas.getBoundingClientRect();
        const world = this.screenToWorld(touch.clientX - rect.left, touch.clientY - rect.top);
        const simUp = new MouseEvent("mouseup", {
          clientX: touch.clientX,
          clientY: touch.clientY,
          button: 0
        });
        for (const l of this.onMouseUpListeners) l(simUp, world.x, world.y);
      }
    });
  }

  public onMouseDown(listener: (e: MouseEvent, x: number, y: number) => void): void {
    this.onMouseDownListeners.push(listener);
  }
  public onMouseMove(listener: (e: MouseEvent, x: number, y: number) => void): void {
    this.onMouseMoveListeners.push(listener);
  }
  public onMouseUp(listener: (e: MouseEvent, x: number, y: number) => void): void {
    this.onMouseUpListeners.push(listener);
  }

  public screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.panX) / this.zoom,
      y: (sy - this.panY) / this.zoom
    };
  }

  public worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: wx * this.zoom + this.panX,
      y: wy * this.zoom + this.panY
    };
  }

  public snapToGrid(wx: number, wy: number, gridSizePx = 50): { x: number; y: number } {
    return {
      x: Math.round(wx / gridSizePx) * gridSizePx,
      y: Math.round(wy / gridSizePx) * gridSizePx
    };
  }

  public handleEphemeralPayload(payload: EphemeralPayload): void {
    if (payload.type === "CURSOR") {
      this.remoteCursors.set(payload.peerId, {
        peerId: payload.peerId,
        username: payload.username,
        color: payload.color,
        x: payload.x,
        y: payload.y,
        lastSeenAt: Date.now()
      });
    } else if (payload.type === "PING") {
      this.activePings.set(payload.pingId, {
        pingId: payload.pingId,
        peerId: payload.peerId,
        username: payload.username,
        color: payload.color,
        x: payload.x,
        y: payload.y,
        createdAt: Date.now(),
        ttlMs: payload.ttlMs
      });
    } else if (payload.type === "MEASURE_LINE") {
      if (!payload.active) {
        this.activeMeasurements.delete(payload.measureId);
      } else {
        this.activeMeasurements.set(payload.measureId, {
          measureId: payload.measureId,
          peerId: payload.peerId,
          username: payload.username,
          startPoint: payload.startPoint,
          endPoint: payload.endPoint,
          color: payload.color,
          unitLabel: payload.unitLabel
        });
      }
    }
  }

  public resizeCanvas(): void {
    const parent = this.canvas.parentElement;
    const width = Math.max(parent?.clientWidth || 0, window.innerWidth);
    const height = Math.max(parent?.clientHeight || 0, window.innerHeight);
    if (width > 0 && height > 0 && (this.canvas.width !== width || this.canvas.height !== height)) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  private startRenderLoop(): void {
    const render = () => {
      this.renderFrame();
      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);
  }

  private renderFrame(): void {
    const curW = Math.max(this.canvas.parentElement?.clientWidth || 0, window.innerWidth);
    const curH = Math.max(this.canvas.parentElement?.clientHeight || 0, window.innerHeight);
    if (curW > 0 && curH > 0 && (this.canvas.width !== curW || this.canvas.height !== curH)) {
      this.canvas.width = curW;
      this.canvas.height = curH;
    }

    const doc = docStore.getDocument();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = doc.canvasSettings.backgroundColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    if (doc.canvasSettings.gridEnabled) {
      this.drawGrid(ctx, doc.canvasSettings);
    }

    const entities = Object.values(doc.entities).sort((a, b) => {
      const typeA = a.type === "token" ? 1 : 0;
      const typeB = b.type === "token" ? 1 : 0;
      if (typeA !== typeB) return typeA - typeB;
      return a.zIndex - b.zIndex;
    });
    for (const ent of entities) {
      this.drawEntity(ctx, ent);
    }

    if (this.aligningImageEntityId) {
      const ent = doc.entities[this.aligningImageEntityId];
      if (ent && ent.type === "image") {
        this.drawImageAlignmentGrid(ctx, ent as ImageEntity, doc.canvasSettings);
      }
    }

    // Tool Hover Previews (Fill, Erase, Hide, Unhide)
    if (this.hoverWorldPos) {
      const size = doc.canvasSettings.gridSizePx || 50;
      const gx = Math.floor(this.hoverWorldPos.x / size) * size;
      const gy = Math.floor(this.hoverWorldPos.y / size) * size;

      if (this.activeTool === "fill") {
        ctx.fillStyle = this.drawColor;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(gx, gy, size, size);
        ctx.globalAlpha = 1.0;
      } else if (this.activeTool === "erase") {
        ctx.fillStyle = "#ef4444";
        ctx.globalAlpha = 0.25;
        ctx.fillRect(gx, gy, size, size);
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2 / this.zoom;
        ctx.strokeRect(gx, gy, size, size);
      } else if (this.activeTool === "hide") {
        ctx.fillStyle = "#000000";
        ctx.globalAlpha = 0.65;
        ctx.fillRect(gx, gy, size, size);
        ctx.globalAlpha = 1.0;
      } else if (this.activeTool === "unhide") {
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2.5 / this.zoom;
        ctx.strokeRect(gx + 2, gy + 2, size - 4, size - 4);
      }
    }

    if (this.draftPoints && this.draftPoints.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.draftPoints[0][0], this.draftPoints[0][1]);
      for (let i = 1; i < this.draftPoints.length; i++) {
        ctx.lineTo(this.draftPoints[i][0], this.draftPoints[i][1]);
      }
      ctx.strokeStyle = this.drawColor;
      ctx.lineWidth = this.drawWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    for (const m of this.activeMeasurements.values()) {
      this.drawMeasurement(ctx, m);
    }
    if (this.localMeasurement) {
      this.drawMeasurement(ctx, this.localMeasurement);
    }

    const now = Date.now();
    for (const [id, ping] of this.activePings.entries()) {
      const elapsed = now - ping.createdAt;
      if (elapsed > ping.ttlMs) {
        this.activePings.delete(id);
      } else {
        this.drawPing(ctx, ping, elapsed / ping.ttlMs);
      }
    }

    ctx.restore();

    this.drawRemoteCursors(ctx, now);
  }

  private drawGrid(ctx: CanvasRenderingContext2D, settings: VTTDocument["canvasSettings"]): void {
    const size = settings.gridSizePx || 50;
    const startX = Math.floor(-this.panX / (this.zoom * size)) * size - size;
    const startY = Math.floor(-this.panY / (this.zoom * size)) * size - size;
    const endX = startX + (this.canvas.width / this.zoom) + size * 2;
    const endY = startY + (this.canvas.height / this.zoom) + size * 2;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1 / this.zoom;

    if (settings.gridType === "square") {
      ctx.beginPath();
      for (let x = startX; x <= endX; x += size) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = startY; y <= endY; y += size) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();
    }
  }

  private drawImageAlignmentGrid(
    ctx: CanvasRenderingContext2D,
    imgEnt: ImageEntity,
    settings: VTTDocument["canvasSettings"]
  ): void {
    const size = settings.gridSizePx || 50;
    const halfW = imgEnt.size.width / 2;
    const halfH = imgEnt.size.height / 2;
    const minX = imgEnt.position.x - halfW;
    const maxX = imgEnt.position.x + halfW;
    const minY = imgEnt.position.y - halfH;
    const maxY = imgEnt.position.y + halfH;

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 1.5 / this.zoom;
    ctx.beginPath();

    const startX = Math.ceil(minX / size) * size;
    for (let x = startX; x <= maxX; x += size) {
      ctx.moveTo(x, minY);
      ctx.lineTo(x, maxY);
    }

    const startY = Math.ceil(minY / size) * size;
    for (let y = startY; y <= maxY; y += size) {
      ctx.moveTo(minX, y);
      ctx.lineTo(maxX, y);
    }

    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = 2 / this.zoom;
    ctx.strokeRect(minX, minY, imgEnt.size.width, imgEnt.size.height);
    ctx.restore();
  }

  private drawEntity(ctx: CanvasRenderingContext2D, ent: CanvasEntity): void {
    ctx.save();
    if (ent.type === "line") {
      const l = ent as LineEntity;
      if (l.points.length < 2) {
        ctx.restore();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(l.points[0][0], l.points[0][1]);
      for (let i = 1; i < l.points.length; i++) {
        ctx.lineTo(l.points[i][0], l.points[i][1]);
      }
      if (l.isClosed && l.fillColor) {
        ctx.closePath();
        ctx.fillStyle = l.fillColor;
        ctx.fill();
      }
      ctx.strokeStyle = l.strokeColor;
      ctx.lineWidth = l.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = l.strokeOpacity;
      ctx.stroke();
    } else if (ent.type === "image" || ent.type === "token") {
      const imgEnt = ent as ImageEntity | TokenEntity;
      this.ensureImageLoaded(imgEnt.assetHash);
      const img = this.imageElements.get(imgEnt.assetHash);

      ctx.translate(imgEnt.position.x, imgEnt.position.y);
      ctx.rotate(imgEnt.rotation || 0);
      ctx.globalAlpha = imgEnt.opacity ?? 1.0;

      const halfW = imgEnt.size.width / 2;
      const halfH = imgEnt.size.height / 2;

      if (img && img.complete) {
        ctx.drawImage(img, -halfW, -halfH, imgEnt.size.width, imgEnt.size.height);
      } else {
        ctx.fillStyle = "rgba(100, 116, 139, 0.35)";
        ctx.fillRect(-halfW, -halfH, imgEnt.size.width, imgEnt.size.height);
      }

      // Render Black Mask / Hidden Pixels Overlay
      if (imgEnt.hiddenCells && imgEnt.hiddenCells.length > 0) {
        const cellSize = 50; // Grid square size for mask
        ctx.fillStyle = "#000000";
        for (const cellKey of imgEnt.hiddenCells) {
          const [cx, cy] = cellKey.split(",").map(Number);
          ctx.fillRect(cx, cy, cellSize, cellSize);
        }
      }

      if (ent.type === "token") {
        const token = ent as TokenEntity;
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3 / this.zoom;
        ctx.strokeRect(-halfW, -halfH, token.size.width, token.size.height);

        if (token.label) {
          ctx.font = `600 ${Math.max(12, 14 / this.zoom)}px Outfit, sans-serif`;
          const textWidth = ctx.measureText(token.label).width;
          ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
          ctx.fillRect(-textWidth / 2 - 6, halfH + 4, textWidth + 12, 22);
          ctx.fillStyle = "#f8fafc";
          ctx.textAlign = "center";
          ctx.fillText(token.label, 0, halfH + 19);
        }
      }

      // Draw lock indicator badge
      if (ent.locked) {
        ctx.font = `${Math.max(14, 16 / this.zoom)}px Outfit, sans-serif`;
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.fillRect(halfW - 24 / this.zoom, -halfH, 24 / this.zoom, 24 / this.zoom);
        ctx.fillStyle = "#f43f5e";
        ctx.textAlign = "center";
        ctx.fillText("🔒", halfW - 12 / this.zoom, -halfH + 17 / this.zoom);
      }

      // Draw Selection bounding box and 4 Corner Resize Handles
      if (this.selectedEntityId === ent.id) {
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 2 / this.zoom;
        ctx.setLineDash([6 / this.zoom, 4 / this.zoom]);
        ctx.strokeRect(-halfW - 4, -halfH - 4, imgEnt.size.width + 8, imgEnt.size.height + 8);
        ctx.setLineDash([]);

        // 4 Corner resize handle squares
        const hs = Math.max(8, 10 / this.zoom);
        const corners = [
          { x: -halfW - hs / 2, y: -halfH - hs / 2 },
          { x: halfW - hs / 2, y: -halfH - hs / 2 },
          { x: halfW - hs / 2, y: halfH - hs / 2 },
          { x: -halfW - hs / 2, y: halfH - hs / 2 }
        ];
        for (const c of corners) {
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(c.x, c.y, hs, hs);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5 / this.zoom;
          ctx.strokeRect(c.x, c.y, hs, hs);
        }
      }
    }
    ctx.restore();
  }

  private async ensureImageLoaded(assetHash: string): Promise<void> {
    if (this.imageElements.has(assetHash) || this.loadingAssets.has(assetHash)) return;
    this.loadingAssets.add(assetHash);

    const url = await assetStore.getAssetObjectUrl(assetHash);
    if (!url) {
      this.loadingAssets.delete(assetHash);
      return;
    }

    const img = new Image();
    img.onload = () => {
      this.imageElements.set(assetHash, img);
      this.loadingAssets.delete(assetHash);
    };
    img.onerror = () => {
      this.loadingAssets.delete(assetHash);
    };
    img.src = url;
  }

  private drawMeasurement(ctx: CanvasRenderingContext2D, m: ActiveMeasurement): void {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(m.startPoint.x, m.startPoint.y);
    ctx.lineTo(m.endPoint.x, m.endPoint.y);
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 3 / this.zoom;
    ctx.setLineDash([8 / this.zoom, 4 / this.zoom]);
    ctx.stroke();
    ctx.setLineDash([]);

    const midX = (m.startPoint.x + m.endPoint.x) / 2;
    const midY = (m.startPoint.y + m.endPoint.y) / 2;
    ctx.font = `600 ${Math.max(12, 14 / this.zoom)}px Outfit, sans-serif`;
    const label = `${m.unitLabel} (${m.username})`;
    const textWidth = ctx.measureText(label).width;

    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(midX - textWidth / 2 - 8, midY - 14, textWidth + 16, 26);
    ctx.fillStyle = m.color;
    ctx.textAlign = "center";
    ctx.fillText(label, midX, midY + 4);
    ctx.restore();
  }

  private drawPing(ctx: CanvasRenderingContext2D, ping: ActivePing, progress: number): void {
    ctx.save();
    const radius = 20 + progress * 60;
    ctx.beginPath();
    ctx.arc(ping.x, ping.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = ping.color;
    ctx.lineWidth = 3 / this.zoom;
    ctx.globalAlpha = 1 - progress;
    ctx.stroke();

    ctx.font = `600 ${Math.max(12, 14 / this.zoom)}px Outfit, sans-serif`;
    ctx.fillStyle = ping.color;
    ctx.textAlign = "center";
    ctx.fillText(ping.username, ping.x, ping.y - radius - 6);
    ctx.restore();
  }

  private drawRemoteCursors(ctx: CanvasRenderingContext2D, now: number): void {
    for (const [id, cursor] of this.remoteCursors.entries()) {
      if (now - cursor.lastSeenAt > 5000) {
        this.remoteCursors.delete(id);
        continue;
      }
      const screen = this.worldToScreen(cursor.x, cursor.y);
      ctx.save();
      ctx.translate(screen.x, screen.y);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(14, 18);
      ctx.lineTo(8, 18);
      ctx.lineTo(4, 24);
      ctx.closePath();
      ctx.fillStyle = cursor.color;
      ctx.fill();

      ctx.font = "600 12px Outfit, sans-serif";
      const w = ctx.measureText(cursor.username).width;
      ctx.fillStyle = cursor.color;
      ctx.fillRect(14, 14, w + 10, 20);
      ctx.fillStyle = "#1e293b";
      ctx.fillText(cursor.username, 19, 28);
      ctx.restore();
    }
  }
}
