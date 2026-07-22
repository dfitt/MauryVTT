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
import { canSelectLockedImage } from "./lockedSelectionHelper.js";
import { EffectEngine } from "../effects/effectEngine.js";
import { BASE_CONDITIONS } from "../ui/selectionBarUI.js";
import { EFFECT_REGISTRY } from "../effects/effectDefs.js";

export type ToolType = "select" | "pan" | "draw" | "line" | "fill" | "erase" | "hide" | "unhide" | "measure" | "ping" | "token" | "ephemeral" | "laser" | "enhance" | "map" | "image" | "ai";

export interface ActiveLaser {
  laserId: string;
  peerId: string;
  username: string;
  color: string;
  points: [number, number, number][]; // [worldX, worldY, localTimestampMs]
  createdAt: number;
  lastUpdateTime: number;
  ttlMs: number;
}

export interface ActiveMeasurement {
  measureId: string;
  peerId: string;
  username: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  targetEndPoint?: { x: number; y: number };
  color: string;
  unitLabel: string;
  showCircle?: boolean;
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
  effectId?: string;
}

export interface RemoteCursor {
  peerId: string;
  username: string;
  color: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  lastSeenAt: number;
}

export class CanvasEngine {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number = 0;

  // Viewport transform
  public panX: number = 0;
  public panY: number = 0;
  public zoom: number = 0.5;
  public targetPanZoom: { x: number; y: number; zoom: number } | null = null;

  // Tool state
  public activeTool: ToolType = "select";
  public ephemeralTool: "ping" | "measure" | "laser" = "laser";
  public mapTool: "upload" | "enhance" = "upload";
  public tokenTool: "upload" | "ai" = "upload";
  public aiTool: "enhance" | "token" | "vttfx" | "imageGen" = "enhance";
  public pingEffectId: string | null = null;
  public drawColor: string = "#38bdf8";
  public drawWidth: number = 8;
  public lineShape: "doodle" | "select" | "straight" | "rectangle" | "circle" | "cone" | "hexagon" | "spiral" | "arrow" = "doodle";
  public fillSize: number = 1;
  public fillBucket: boolean = false;
  public eraseSize: number = 1;
  public eraseOnlyMine: boolean = false;
  public selectedDrawingIds: Set<string> = new Set();
  public drawingSelectionBox: { x1: number; y1: number; x2: number; y2: number } | null = null;
  public enhanceSelectionBox: { x1: number; y1: number; x2: number; y2: number } | null = null;
  private _selectedEntityId: string | null = null;
  public aligningImageEntityId: string | null = null;
  public resizingTokenId: string | null = null;
  private selectionListeners: Set<(id: string | null) => void> = new Set();
  private drawingSelectionListeners: Set<() => void> = new Set();
  private toolOptionsListeners: Set<() => void> = new Set();
  private panViewListeners: Set<() => void> = new Set();
  private pingTriggerListeners: Set<(isLocal: boolean) => void> = new Set();
  public isRollTargetingMode: boolean = false;
  public rollTargetTokenIds: Set<string> = new Set();
  private rollTargetingListeners: Set<(active: boolean, targets: Set<string>) => void> = new Set();
  private accumulatedUserPanDistance: number = 0;

  // Hover cursor state for tool previews
  public hoverWorldPos: { x: number; y: number } | null = null;
  public isTouchInput: boolean = false;
  private lastTouchTapTime: number = 0;
  private lastTouchTapPos = { x: 0, y: 0 };

  // Ephemeral states
  private remoteCursors: Map<string, RemoteCursor> = new Map();
  private activePings: Map<string, ActivePing> = new Map();
  private activeMeasurements: Map<string, ActiveMeasurement> = new Map();
  public activeLasers: Map<string, ActiveLaser> = new Map();
  private tokenHoverScales: Map<string, number> = new Map();
  private pingPunchScales: Map<string, number> = new Map();
  private pingPunchTweens: Map<string, { peakScale: number; startTime: number; durationMs: number }> = new Map();
  public draggingEntityId: string | null = null;
  private renderPositions: Map<string, { x: number; y: number }> = new Map();

  // Active user drawing draft
  public draftPoints: [number, number][] | null = null;
  public localMeasurement: ActiveMeasurement | null = null;

  // Image cache
  private imageElements: Map<string, HTMLImageElement> = new Map();
  private svgImageCache: Map<string, HTMLImageElement> = new Map();
  private loadingAssets: Set<string> = new Set();

  // Custom Condition DOM overlays
  private conditionOverlays: Map<string, HTMLElement> = new Map();
  private activeConditionKeys: Set<string> = new Set();

  // Interaction handlers
  private onMouseDownListeners: ((e: MouseEvent, worldX: number, worldY: number) => void)[] = [];
  private onMouseMoveListeners: ((e: MouseEvent, worldX: number, worldY: number) => void)[] = [];
  private onMouseUpListeners: ((e: MouseEvent, worldX: number, worldY: number) => void)[] = [];

  private toolChangeListeners: Set<(tool: ToolType) => void> = new Set();
  private lastCursorSendTime: number = 0;
  private pendingCursorTimeout: any = null;
  private lastSentCursorPos: { x: number; y: number } | null = null;

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

    (window as any).vttCanvasEngine = this;
    this.startRenderLoop();

    sessionManager.onEphemeral((payload) => this.handleEphemeralPayload(payload));
  }

  public static activateSelectTool(): void {
    if ((window as any).vttCanvasEngine && typeof (window as any).vttCanvasEngine.setTool === "function") {
      (window as any).vttCanvasEngine.setTool("select");
    }
  }

  public get selectedEntityId(): string | null {
    return this._selectedEntityId;
  }

  public set selectedEntityId(id: string | null) {
    if (this._selectedEntityId !== id) {
      this._selectedEntityId = id;
      if (id !== this.resizingTokenId) {
        this.resizingTokenId = null;
      }
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

  public onDrawingSelectionChanged(listener: () => void): () => void {
    this.drawingSelectionListeners.add(listener);
    listener();
    return () => this.drawingSelectionListeners.delete(listener);
  }

  public notifyDrawingSelectionChanged(): void {
    for (const l of this.drawingSelectionListeners) l();
  }

  public setTool(tool: ToolType): void {
    if (this.activeTool !== tool || (window as any).vttActiveTool !== tool) {
      if ((tool !== "line" && tool !== "draw") || this.lineShape !== "select") {
        if (this.selectedDrawingIds.size > 0) {
          this.selectedDrawingIds.clear();
          this.notifyDrawingSelectionChanged();
        }
      }
      this.activeTool = tool;
      (window as any).vttActiveTool = tool;
      if (tool === "enhance" || (tool === "map" && this.mapTool === "enhance") || (tool === "ai" && this.aiTool === "enhance") || tool === "draw" || tool === "line" || tool === "fill" || tool === "erase") {
        this.canvas.style.cursor = "crosshair";
      } else if (tool === "pan") {
        this.canvas.style.cursor = "grab";
      } else {
        this.canvas.style.cursor = "default";
      }
      for (const l of this.toolChangeListeners) {
        l(tool);
      }
    }
  }

  public onToolChanged(listener: (tool: ToolType) => void): () => void {
    this.toolChangeListeners.add(listener);
    return () => this.toolChangeListeners.delete(listener);
  }

  public onToolOptionsChanged(listener: () => void): () => void {
    this.toolOptionsListeners.add(listener);
    return () => this.toolOptionsListeners.delete(listener);
  }

  public notifyToolOptionsChanged(): void {
    for (const l of this.toolOptionsListeners) l();
  }

  public onPanView(listener: () => void): () => void {
    this.panViewListeners.add(listener);
    return () => this.panViewListeners.delete(listener);
  }

  public notifyPanView(): void {
    for (const l of this.panViewListeners) l();
  }

  public onPingTriggered(listener: (isLocal: boolean) => void): () => void {
    this.pingTriggerListeners.add(listener);
    return () => this.pingTriggerListeners.delete(listener);
  }

  public notifyPingTriggered(isLocal = false): void {
    for (const l of this.pingTriggerListeners) l(isLocal);
  }

  public onRollTargetingChanged(listener: (active: boolean, targets: Set<string>) => void): () => void {
    this.rollTargetingListeners.add(listener);
    return () => this.rollTargetingListeners.delete(listener);
  }

  public notifyRollTargetingChanged(): void {
    for (const l of this.rollTargetingListeners) l(this.isRollTargetingMode, this.rollTargetTokenIds);
  }

  public toggleRollTargetingMode(force?: boolean): void {
    this.isRollTargetingMode = force !== undefined ? force : !this.isRollTargetingMode;
    if (!this.isRollTargetingMode) {
      this.rollTargetTokenIds.clear();
    }
    this.notifyRollTargetingChanged();
  }

  public toggleRollTargetToken(tokenId: string): void {
    if (this.rollTargetTokenIds.has(tokenId)) {
      this.rollTargetTokenIds.delete(tokenId);
    } else {
      this.rollTargetTokenIds.add(tokenId);
    }
    this.notifyRollTargetingChanged();
  }

  public triggerPing(worldX: number, worldY: number): void {
    const pingId = "ping-" + Math.random().toString(36).substring(2, 7);
    const ttlMs = 2000;

    const payload: EphemeralPayload = {
      type: "PING",
      pingId,
      peerId: sessionManager.myPeerId || "local",
      username: sessionManager.myUsername || "Me",
      color: sessionManager.myColor || "#eab308",
      x: worldX,
      y: worldY,
      pingStyle: "ripple",
      ttlMs,
      effectId: this.pingEffectId || undefined
    };

    this.handleEphemeralPayload(payload);
    sessionManager.sendEphemeral(payload);

    this.notifyPingTriggered(true);
  }

  public stepToolSize(step: number): void {
    if (this.activeTool === "draw" || this.activeTool === "line") {
      this.drawWidth = Math.min(60, Math.max(2, this.drawWidth + step * 2));
      this.showToast(`Pen Size: ${this.drawWidth}px`);
    } else if (this.activeTool === "fill") {
      if (this.fillBucket) {
        if (step < 0) {
          this.fillBucket = false;
          this.fillSize = 3;
          this.showToast(`Fill Mode: 3x3 Stamp`);
        }
      } else {
        const next = this.fillSize + step;
        if (next > 3) {
          this.fillBucket = true;
          this.showToast(`Fill Mode: Flood Bucket 🪣`);
        } else if (next >= 1) {
          this.fillSize = next;
          this.showToast(`Fill Mode: ${this.fillSize}x${this.fillSize} Stamp`);
        }
      }
    } else if (this.activeTool === "erase") {
      const sizes = [1, 3, 5, 20];
      const idx = sizes.indexOf(this.eraseSize);
      let nextIdx = idx + step;
      if (nextIdx < 0) nextIdx = 0;
      if (nextIdx >= sizes.length) nextIdx = sizes.length - 1;
      this.eraseSize = sizes[nextIdx];
      this.showToast(`Eraser Size: ${this.eraseSize}x${this.eraseSize} Area`);
    }
    this.notifyToolOptionsChanged();
  }

  public showToast(msg: string): void {
    let toast = document.getElementById("vtt-tool-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "vtt-tool-toast";
      toast.style.cssText =
        "position: fixed; bottom: 84px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.92); border: 1px solid rgba(56, 189, 248, 0.5); color: #f8fafc; padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; pointer-events: none; z-index: 10000; box-shadow: 0 4px 16px rgba(0,0,0,0.4); transition: opacity 0.25s ease;";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = "1";
    if ((this as any)._toastTimeout) clearTimeout((this as any)._toastTimeout);
    (this as any)._toastTimeout = setTimeout(() => {
      if (toast) toast.style.opacity = "0";
    }, 1500);
  }

  private setupEvents(): void {
    let isPanning = false;
    let isSpacePressed = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    window.addEventListener("pointerdown", (e) => {
      this.isTouchInput = e.pointerType === "touch" || e.pointerType === "pen";
    }, { passive: true });

    window.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch" || e.pointerType === "pen") {
        this.isTouchInput = true;
      } else if (e.pointerType === "mouse") {
        this.isTouchInput = false;
      }
    }, { passive: true });

    window.addEventListener("keydown", (e) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);

      if (e.code === "Space" && !isTyping) {
        isSpacePressed = true;
      }

      if (!isTyping && (e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
        if (this.duplicateSelectedToken()) {
          e.preventDefault();
        }
      }

      if (!isTyping && (e.code === "Delete" || e.code === "Backspace")) {
        let didDelete = false;
        if (this.selectedEntityId) {
          sessionManager.dispatchOperation({
            opType: "DELETE_ENTITY",
            id: this.selectedEntityId
          });
          this.selectedEntityId = null;
          didDelete = true;
        }
        if (this.selectedDrawingIds.size > 0) {
          for (const id of this.selectedDrawingIds) {
            sessionManager.dispatchOperation({
              opType: "DELETE_ENTITY",
              id
            });
          }
          this.selectedDrawingIds.clear();
          this.notifyDrawingSelectionChanged();
          didDelete = true;
        }
        if (didDelete) {
          e.preventDefault();
        }
      }

      if (!isTyping) {
        const panStep = 45;
        let moved = false;
        if (e.code === "ArrowUp") {
          this.panY += panStep;
          moved = true;
          e.preventDefault();
        } else if (e.code === "ArrowDown") {
          this.panY -= panStep;
          moved = true;
          e.preventDefault();
        } else if (e.code === "ArrowLeft") {
          this.panX += panStep;
          moved = true;
          e.preventDefault();
        } else if (e.code === "ArrowRight") {
          this.panX -= panStep;
          moved = true;
          e.preventDefault();
        }
        if (moved) {
          this.accumulatedUserPanDistance += panStep;
          if (this.accumulatedUserPanDistance >= 15) this.notifyPanView();
        }
      }
    });
    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") isSpacePressed = false;
    });

    this.canvas.addEventListener("mousedown", (e) => {
      this.targetPanZoom = null;
      const world = this.screenToWorld(e.offsetX, e.offsetY);
      const activeTool = (window as any).vttActiveTool;
      if (e.button === 1 || e.button === 2 || (e.button === 0 && (isSpacePressed || activeTool === "pan"))) {
        isPanning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        return;
      }
      for (const l of this.onMouseDownListeners) l(e, world.x, world.y);
    });

    this.canvas.addEventListener("dblclick", (e) => {
      if ((window as any).vttSimpleMode) return;
      const world = this.screenToWorld(e.offsetX, e.offsetY);
      this.triggerPing(world.x, world.y);
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
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          this.accumulatedUserPanDistance += dist;
          if (this.accumulatedUserPanDistance >= 15) this.notifyPanView();
        }
        return;
      }

      if (sessionManager.myPeerId) {
        const now = Date.now();
        const sendCursor = (wx: number, wy: number) => {
          if (
            this.lastSentCursorPos &&
            Math.abs(this.lastSentCursorPos.x - wx) < 0.1 &&
            Math.abs(this.lastSentCursorPos.y - wy) < 0.1
          ) {
            return;
          }
          this.lastSentCursorPos = { x: wx, y: wy };
          this.lastCursorSendTime = Date.now();
          sessionManager.sendEphemeral({
            type: "CURSOR",
            peerId: sessionManager.myPeerId,
            username: sessionManager.myUsername || "Guest",
            color: sessionManager.myColor || "#eab308",
            x: wx,
            y: wy
          });
        };

        const interval = 17; // ~60Hz
        if (now - this.lastCursorSendTime >= interval) {
          if (this.pendingCursorTimeout) {
            clearTimeout(this.pendingCursorTimeout);
            this.pendingCursorTimeout = null;
          }
          sendCursor(world.x, world.y);
        } else if (!this.pendingCursorTimeout) {
          this.pendingCursorTimeout = setTimeout(() => {
            this.pendingCursorTimeout = null;
            if (this.hoverWorldPos && sessionManager.myPeerId) {
              sendCursor(this.hoverWorldPos.x, this.hoverWorldPos.y);
            }
          }, interval - (now - this.lastCursorSendTime));
        }
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

    window.addEventListener("keydown", (e) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "[" || e.key === "-") {
        this.stepToolSize(-1);
      } else if (e.key === "]" || e.key === "+" || e.key === "=") {
        this.stepToolSize(1);
      }
    });

    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (e.shiftKey && (this.activeTool === "draw" || this.activeTool === "line" || this.activeTool === "fill" || this.activeTool === "erase")) {
        const step = e.deltaY < 0 ? 1 : -1;
        this.stepToolSize(step);
        return;
      }
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
      this.isTouchInput = true;
      e.preventDefault();
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

        const nowTap = Date.now();
        if (
          !(window as any).vttSimpleMode &&
          nowTap - this.lastTouchTapTime < 350 &&
          Math.hypot(touch.clientX - this.lastTouchTapPos.x, touch.clientY - this.lastTouchTapPos.y) < 25
        ) {
          this.lastTouchTapTime = 0;
          this.triggerPing(world.x, world.y);
          return;
        } else {
          this.lastTouchTapTime = nowTap;
          this.lastTouchTapPos = { x: touch.clientX, y: touch.clientY };
        }

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
    }, { passive: false });

    window.addEventListener("touchmove", (e) => {
      this.isTouchInput = true;
      if (e.target === this.canvas) {
        e.preventDefault();
      }
      if (e.touches.length === 2) {
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );

        const rect = this.canvas.getBoundingClientRect();
        const screenX = midX - rect.left;
        const screenY = midY - rect.top;

        // Apply panning from finger drag first
        const dx = midX - lastTouchX;
        const dy = midY - lastTouchY;
        this.panX += dx;
        this.panY += dy;
        lastTouchX = midX;
        lastTouchY = midY;

        // Apply pinch zoom anchored to the pinch center point
        if (initialPinchDist > 0 && Math.abs(dist - initialPinchDist) > 2) {
          const zoomFactor = dist / initialPinchDist;
          const worldBefore = this.screenToWorld(screenX, screenY);
          this.zoom = Math.min(Math.max(0.1, this.zoom * zoomFactor), 8.0);
          const worldAfter = this.screenToWorld(screenX, screenY);

          this.panX += (worldAfter.x - worldBefore.x) * this.zoom;
          this.panY += (worldAfter.y - worldBefore.y) * this.zoom;
          initialPinchDist = dist;
        }
        const panDist = Math.hypot(dx, dy);
        if (panDist > 0) {
          this.accumulatedUserPanDistance += panDist;
          if (this.accumulatedUserPanDistance >= 15) {
            this.notifyPanView();
          }
        }
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const world = this.screenToWorld(touch.clientX - rect.left, touch.clientY - rect.top);
        this.hoverWorldPos = world;

        if (touchPan) {
          const dx = touch.clientX - lastTouchX;
          const dy = touch.clientY - lastTouchY;
          this.panX += dx;
          this.panY += dy;
          lastTouchX = touch.clientX;
          lastTouchY = touch.clientY;
          const panDist = Math.hypot(dx, dy);
          if (panDist > 0) {
            this.accumulatedUserPanDistance += panDist;
            if (this.accumulatedUserPanDistance >= 15) this.notifyPanView();
          }
          return;
        }

        const simMove = new MouseEvent("mousemove", {
          clientX: touch.clientX,
          clientY: touch.clientY,
          button: 0
        });
        for (const l of this.onMouseMoveListeners) l(simMove, world.x, world.y);
      }
    }, { passive: false });

    window.addEventListener("touchend", (e) => {
      touchPan = false;
      if (this.isTouchInput) {
        this.hoverWorldPos = null;
      }
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

  public getViewportCenterInWorld(): { x: number; y: number } {
    return this.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
  }

  public snapToGrid(wx: number, wy: number, gridSizePx = 50): { x: number; y: number } {
    return {
      x: Math.round(wx / gridSizePx) * gridSizePx,
      y: Math.round(wy / gridSizePx) * gridSizePx
    };
  }

  public zoomToWorldPos(wx: number, wy: number, selectEntityId?: string, screenOffsetX = 0): void {
    const targetZoom = Math.max(this.zoom, 1.3);
    const centerX = this.canvas.width / 2 + screenOffsetX;
    const centerY = this.canvas.height / 2;
    const targetX = centerX - wx * targetZoom;
    const targetY = centerY - wy * targetZoom;
    this.targetPanZoom = { x: targetX, y: targetY, zoom: targetZoom };

    if (selectEntityId) {
      this.selectedEntityId = selectEntityId;
      this.setTool("select");
    }
  }

  public duplicateSelectedToken(): boolean {
    if (!this.selectedEntityId) return false;
    const doc = docStore.getDocument();
    const token = doc.entities[this.selectedEntityId];
    if (!token || token.type !== "token") return false;
    const gridSizePx = doc.canvasSettings.gridSizePx || 50;
    const cloneId = "tok-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    const clone: TokenEntity = {
      ...(token as TokenEntity),
      id: cloneId,
      position: {
        x: token.position.x + gridSizePx,
        y: token.position.y
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    sessionManager.dispatchOperation({
      opType: "CREATE_ENTITY",
      entity: clone
    });
    this.setTool("select");
    this.selectedEntityId = cloneId;
    return true;
  }

  public handleEphemeralPayload(payload: EphemeralPayload): void {
    if (payload.type === "CURSOR") {
      const existing = this.remoteCursors.get(payload.peerId);
      if (existing) {
        existing.targetX = payload.x;
        existing.targetY = payload.y;
        existing.lastSeenAt = Date.now();
      } else {
        this.remoteCursors.set(payload.peerId, {
          peerId: payload.peerId,
          username: payload.username,
          color: payload.color,
          x: payload.x,
          y: payload.y,
          targetX: payload.x,
          targetY: payload.y,
          lastSeenAt: Date.now()
        });
      }
    } else if (payload.type === "PING") {
      this.activePings.set(payload.pingId, {
        pingId: payload.pingId,
        peerId: payload.peerId,
        username: payload.username,
        color: payload.color,
        x: payload.x,
        y: payload.y,
        createdAt: Date.now(),
        ttlMs: payload.ttlMs,
        effectId: payload.effectId
      });
      const isLocal = payload.peerId === (sessionManager.myPeerId || "local");
      this.notifyPingTriggered(isLocal);

      if (payload.effectId) {
        const screenPos = this.worldToScreen(payload.x, payload.y);
        EffectEngine.playAtScreenCoord(screenPos.x, screenPos.y, payload.effectId, Math.max(160, 180 * this.zoom));
      }

      const doc = docStore.getDocument();
      const entities = Object.values(doc.entities);
      let hitToken = false;
      for (const ent of entities) {
        if (ent.type === "token") {
          const tok = ent as TokenEntity;
          const halfW = tok.size.width / 2;
          const halfH = tok.size.height / 2;
          if (
            payload.x >= tok.position.x - halfW &&
            payload.x <= tok.position.x + halfW &&
            payload.y >= tok.position.y - halfH &&
            payload.y <= tok.position.y + halfH
          ) {
            this.pingPunchScales.set(tok.id, 4.0);
            this.pingPunchTweens.set(tok.id, { peakScale: 4.0, startTime: Date.now(), durationMs: 500 });
            hitToken = true;
          }
        }
      }
      if (!hitToken) {
        for (const ent of entities) {
          if (ent.type === "image" && !ent.locked) {
            const img = ent as ImageEntity;
            const halfW = img.size.width / 2;
            const halfH = img.size.height / 2;
            if (
              payload.x >= img.position.x - halfW &&
              payload.x <= img.position.x + halfW &&
              payload.y >= img.position.y - halfH &&
              payload.y <= img.position.y + halfH
            ) {
              this.pingPunchScales.set(img.id, 1.25);
              this.pingPunchTweens.set(img.id, { peakScale: 1.25, startTime: Date.now(), durationMs: 500 });
            }
          }
        }
      }
    } else if (payload.type === "MEASURE_LINE") {
      if (!payload.active) {
        this.activeMeasurements.delete(payload.measureId);
      } else {
        const existing = this.activeMeasurements.get(payload.measureId);
        if (existing) {
          existing.targetEndPoint = payload.endPoint;
          existing.unitLabel = payload.unitLabel;
        } else {
          this.activeMeasurements.set(payload.measureId, {
            measureId: payload.measureId,
            peerId: payload.peerId,
            username: payload.username,
            startPoint: payload.startPoint,
            endPoint: { ...payload.endPoint },
            targetEndPoint: { ...payload.endPoint },
            color: payload.color,
            unitLabel: payload.unitLabel
          });
        }
      }
    } else if (payload.type === "LASER_LINE") {
      const now = Date.now();
      const existing = this.activeLasers.get(payload.laserId);
      if (existing) {
        for (let i = existing.points.length; i < payload.points.length; i++) {
          const pt = payload.points[i];
          existing.points.push([pt[0], pt[1], now]);
        }
        existing.lastUpdateTime = now;
      } else {
        this.activeLasers.set(payload.laserId, {
          laserId: payload.laserId,
          peerId: payload.peerId,
          username: payload.username,
          color: payload.color,
          points: payload.points.map((pt) => [pt[0], pt[1], now]),
          createdAt: now,
          lastUpdateTime: now,
          ttlMs: payload.ttlMs || 750
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
    let lastFrameTime = 0;
    const render = (currentTime: number) => {
      this.animFrameId = requestAnimationFrame(render);

      const fpsLimitStr = localStorage.getItem("vtt_fps_limit");
      const fpsLimit = fpsLimitStr ? Number(fpsLimitStr) : 0;
      if (fpsLimit > 0 && fpsLimit < 120) {
        const interval = 1000 / fpsLimit;
        const elapsed = currentTime - lastFrameTime;
        if (elapsed < interval) {
          return;
        }
        lastFrameTime = currentTime - (elapsed % interval);
      } else {
        lastFrameTime = currentTime;
      }

      this.renderFrame();
    };
    this.animFrameId = requestAnimationFrame(render);
  }

  private renderFrame(): void {
    this.activeConditionKeys.clear();
    const curW = Math.max(this.canvas.parentElement?.clientWidth || 0, window.innerWidth);
    const curH = Math.max(this.canvas.parentElement?.clientHeight || 0, window.innerHeight);
    if (curW > 0 && curH > 0 && (this.canvas.width !== curW || this.canvas.height !== curH)) {
      this.canvas.width = curW;
      this.canvas.height = curH;
    }

    if (this.targetPanZoom) {
      this.panX += (this.targetPanZoom.x - this.panX) * 0.22;
      this.panY += (this.targetPanZoom.y - this.panY) * 0.22;
      this.zoom += (this.targetPanZoom.zoom - this.zoom) * 0.22;
      if (
        Math.abs(this.targetPanZoom.x - this.panX) < 0.5 &&
        Math.abs(this.targetPanZoom.y - this.panY) < 0.5 &&
        Math.abs(this.targetPanZoom.zoom - this.zoom) < 0.005
      ) {
        this.panX = this.targetPanZoom.x;
        this.panY = this.targetPanZoom.y;
        this.zoom = this.targetPanZoom.zoom;
        this.targetPanZoom = null;
      }
    }

    const doc = docStore.getDocument();
    const now = Date.now();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const personalBg = localStorage.getItem("vtt_personal_bg_color");
    const docBg = doc.canvasSettings.backgroundColor === "#13151b" ? "#475569" : (doc.canvasSettings.backgroundColor || "#475569");
    const bg = (personalBg && personalBg.trim()) ? personalBg.trim() : docBg;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.updateTokenHoverScales(doc);

    for (const [id, tween] of this.pingPunchTweens.entries()) {
      const elapsed = now - tween.startTime;
      if (elapsed >= tween.durationMs) {
        this.pingPunchTweens.delete(id);
        this.pingPunchScales.delete(id);
      } else {
        const progress = elapsed / tween.durationMs;
        // Cosine easing: starts at peak scale and smoothly eases back down to 1.0 over exactly 500ms
        const ease = (1 - Math.cos(progress * Math.PI)) / 2;
        const currentScale = tween.peakScale - (tween.peakScale - 1.0) * ease;
        this.pingPunchScales.set(id, currentScale);
      }
    }

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    const entities = Object.values(doc.entities).sort((a, b) => a.zIndex - b.zIndex);

    const mapEntities = entities.filter((ent) => ent.type === "image" && Boolean((ent as any).isMap));
    const regularImages = entities.filter((ent) => ent.type === "image" && !Boolean((ent as any).isMap));
    const tokens = entities.filter((ent) => ent.type === "token");
    const drawings = entities.filter((ent) => ent.type === "line");

    // 1. Draw Map background entities behind the grid
    for (const ent of mapEntities) {
      this.drawEntity(ctx, ent);
    }

    // 2. Draw Grid lines over Map background images
    if (doc.canvasSettings.gridEnabled) {
      this.drawGrid(ctx, doc.canvasSettings);
    }

    // 3. Draw Regular Images over the Grid
    for (const ent of regularImages) {
      this.drawEntity(ctx, ent);
    }

    // 4. Draw Fills over all regular/map images
    this.drawGridCells(ctx, doc);

    // 5. Draw Drawings over fills and images
    for (const ent of drawings) {
      this.drawEntity(ctx, ent);
    }

    // 6. Draw Tokens on top of everything (including drawings and fills)
    const gridSizePx = doc.canvasSettings.gridSizePx || 50;
    const cellStackCounts = new Map<string, number>();
    const tokenOffsets = new Map<string, { x: number; y: number }>();

    const sortedTokens = [...tokens].sort((a, b) => a.zIndex - b.zIndex);
    for (const ent of sortedTokens) {
      const tok = ent as TokenEntity;
      const gx = Math.floor(tok.position.x / gridSizePx);
      const gy = Math.floor(tok.position.y / gridSizePx);
      const cellKey = `${gx},${gy}`;
      const count = cellStackCounts.get(cellKey) || 0;
      cellStackCounts.set(cellKey, count + 1);
      if (count > 0) {
        const stepX = Math.max(5, tok.size.width * 0.11);
        const stepY = -Math.max(5, tok.size.height * 0.11);
        tokenOffsets.set(tok.id, { x: count * stepX, y: count * stepY });
      }
    }

    for (const ent of tokens) {
      this.drawEntity(ctx, ent, tokenOffsets.get(ent.id));
    }

    if (this.rollTargetTokenIds.size > 0) {
      ctx.save();
      for (const ent of tokens) {
        if (this.rollTargetTokenIds.has(ent.id)) {
          const tok = ent as TokenEntity;
          const pos = tokenOffsets.get(tok.id) || { x: 0, y: 0 };
          const cur = this.renderPositions.get(tok.id) || { x: tok.position.x + pos.x, y: tok.position.y + pos.y };

          ctx.save();
          ctx.translate(cur.x, cur.y);
          const halfW = tok.size.width / 2;
          const halfH = tok.size.height / 2;
          const radius = Math.max(halfW, halfH) + (6 / this.zoom);

          const pulse = 0.65 + 0.35 * Math.sin(now / 150);
          ctx.strokeStyle = `rgba(244, 63, 94, ${pulse})`;
          ctx.lineWidth = Math.max(2.5, 3.5 / this.zoom);
          ctx.shadowColor = "#f43f5e";
          ctx.shadowBlur = 10 / this.zoom;

          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.stroke();

          const notchLen = Math.max(8, 12 / this.zoom);
          ctx.beginPath();
          ctx.moveTo(0, -radius - notchLen); ctx.lineTo(0, -radius + notchLen * 0.5);
          ctx.moveTo(0, radius - notchLen * 0.5); ctx.lineTo(0, radius + notchLen);
          ctx.moveTo(-radius - notchLen, 0); ctx.lineTo(-radius + notchLen * 0.5, 0);
          ctx.moveTo(radius - notchLen * 0.5, 0); ctx.lineTo(radius + notchLen, 0);
          ctx.stroke();

          ctx.font = `${Math.max(14, 18 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🎯", radius * 0.7, -radius * 0.7);
          ctx.restore();
        }
      }
      ctx.restore();
    }

    if (this.aligningImageEntityId) {
      const ent = doc.entities[this.aligningImageEntityId];
      if (ent && ent.type === "image") {
        this.drawImageAlignmentGrid(ctx, ent as ImageEntity, doc.canvasSettings);
      }
    }

    // Tool Hover Previews (Fill, Erase, Hide, Unhide, Draw, Line)
    if (this.hoverWorldPos) {
      const size = doc.canvasSettings.gridSizePx || 50;
      const gx = Math.floor(this.hoverWorldPos.x / size) * size;
      const gy = Math.floor(this.hoverWorldPos.y / size) * size;

      if (this.activeTool === "fill") {
        if (this.fillBucket) {
          if (this.drawColor === "fog") {
            ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
          } else {
            ctx.fillStyle = this.drawColor;
          }
          ctx.globalAlpha = 0.35;
          ctx.fillRect(gx, gy, size, size);
          ctx.globalAlpha = 1.0;
          ctx.font = `${Math.max(16, 20 / this.zoom)}px Outfit, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("🪣", gx + size / 2, gy + size / 2 + 6 / this.zoom);
        } else {
          const span = this.fillSize || 1;
          const fillX = Math.round((this.hoverWorldPos.x - (size * span) / 2) / size) * size;
          const fillY = Math.round((this.hoverWorldPos.y - (size * span) / 2) / size) * size;
          if (this.drawColor === "fog") {
            ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
          } else {
            ctx.fillStyle = this.drawColor;
          }
          ctx.globalAlpha = 0.35;
          ctx.fillRect(fillX, fillY, size * span, size * span);
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
          ctx.lineWidth = 1.5 / this.zoom;
          ctx.strokeRect(fillX, fillY, size * span, size * span);
        }
      } else if (this.activeTool === "erase") {
        const span = this.eraseSize || 1;
        const eraseX = this.hoverWorldPos.x - (size * span) / 2;
        const eraseY = this.hoverWorldPos.y - (size * span) / 2;
        ctx.fillStyle = "#ef4444";
        ctx.globalAlpha = 0.25;
        ctx.fillRect(eraseX, eraseY, size * span, size * span);
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2 / this.zoom;
        ctx.strokeRect(eraseX, eraseY, size * span, size * span);
      } else if (this.activeTool === "draw" || (this.activeTool === "line" && this.lineShape !== "select")) {
        ctx.beginPath();
        ctx.arc(this.hoverWorldPos.x, this.hoverWorldPos.y, (this.drawWidth || 4) / 2, 0, Math.PI * 2);
        if (this.drawColor === "fog") {
          ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
          ctx.strokeStyle = "#ffffff";
        } else {
          ctx.fillStyle = this.drawColor;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        }
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = 1.5 / this.zoom;
        ctx.stroke();
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
      if (m.targetEndPoint) {
        m.endPoint.x += (m.targetEndPoint.x - m.endPoint.x) * 0.35;
        m.endPoint.y += (m.targetEndPoint.y - m.endPoint.y) * 0.35;
        if (Math.abs(m.targetEndPoint.x - m.endPoint.x) < 0.1) m.endPoint.x = m.targetEndPoint.x;
        if (Math.abs(m.targetEndPoint.y - m.endPoint.y) < 0.1) m.endPoint.y = m.targetEndPoint.y;
      }
      this.drawMeasurement(ctx, m);
    }
    if (this.localMeasurement) {
      this.drawMeasurement(ctx, this.localMeasurement);
    }

    if (this.drawingSelectionBox) {
      ctx.save();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2 / this.zoom;
      ctx.setLineDash([6 / this.zoom, 4 / this.zoom]);
      ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
      const minX = Math.min(this.drawingSelectionBox.x1, this.drawingSelectionBox.x2);
      const minY = Math.min(this.drawingSelectionBox.y1, this.drawingSelectionBox.y2);
      const w = Math.abs(this.drawingSelectionBox.x2 - this.drawingSelectionBox.x1);
      const h = Math.abs(this.drawingSelectionBox.y2 - this.drawingSelectionBox.y1);
      ctx.fillRect(minX, minY, w, h);
      ctx.strokeRect(minX, minY, w, h);
      ctx.restore();
    }

    if (this.enhanceSelectionBox) {
      ctx.save();
      const minX = Math.min(this.enhanceSelectionBox.x1, this.enhanceSelectionBox.x2);
      const minY = Math.min(this.enhanceSelectionBox.y1, this.enhanceSelectionBox.y2);
      const w = Math.abs(this.enhanceSelectionBox.x2 - this.enhanceSelectionBox.x1);
      const h = Math.abs(this.enhanceSelectionBox.y2 - this.enhanceSelectionBox.y1);

      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = Math.max(2, 3 / this.zoom);
      ctx.setLineDash([8 / this.zoom, 6 / this.zoom]);
      ctx.lineDashOffset = -(Date.now() / 30) % (14 / this.zoom);
      ctx.shadowColor = "#c084fc";
      ctx.shadowBlur = 12 / this.zoom;
      ctx.strokeRect(minX, minY, w, h);

      ctx.fillStyle = "rgba(192, 132, 252, 0.18)";
      ctx.fillRect(minX, minY, w, h);

      ctx.font = `bold ${Math.max(13, 16 / this.zoom)}px sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#000000";
      ctx.shadowBlur = 4 / this.zoom;
      ctx.fillText("✨ AI Enhance Area (Nano Banana 2)", minX + 8 / this.zoom, minY + 22 / this.zoom);
      ctx.restore();
    }

    if (this.selectedDrawingIds.size > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const id of this.selectedDrawingIds) {
        const ent = doc.entities[id];
        if (ent && ent.type === "line") {
          const l = ent as LineEntity;
          for (const [px, py] of l.points) {
            if (px < minX) minX = px;
            if (py < minY) minY = py;
            if (px > maxX) maxX = px;
            if (py > maxY) maxY = py;
          }
        }
      }
      if (minX !== Infinity && maxX !== -Infinity) {
        const pad = 10 / this.zoom;
        const bx = minX - pad;
        const by = minY - pad;
        const bw = (maxX - minX) + pad * 2;
        const bh = (maxY - minY) + pad * 2;
        const centerX = bx + bw / 2;
        const centerY = by + bh / 2;

        ctx.save();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5 / this.zoom;
        ctx.setLineDash([6 / this.zoom, 4 / this.zoom]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);

        // Rotation handle at top
        const rotDist = Math.max(24, 30 / this.zoom);
        ctx.beginPath();
        ctx.moveTo(centerX, by);
        ctx.lineTo(centerX, by - rotDist);
        ctx.stroke();

        const rotRadius = Math.max(7, 9 / this.zoom);
        ctx.beginPath();
        ctx.arc(centerX, by - rotDist, rotRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#38bdf8";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5 / this.zoom;
        ctx.stroke();

        ctx.font = `${Math.max(10, 12 / this.zoom)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#0f172a";
        ctx.fillText("↻", centerX, by - rotDist);

        // 8 Resize handles
        const hs = Math.max(8, 10 / this.zoom);
        const handleCenters = [
          { x: bx, y: by },
          { x: centerX, y: by },
          { x: bx + bw, y: by },
          { x: bx + bw, y: centerY },
          { x: bx + bw, y: by + bh },
          { x: centerX, y: by + bh },
          { x: bx, y: by + bh },
          { x: bx, y: centerY }
        ];
        for (const hc of handleCenters) {
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(hc.x - hs / 2, hc.y - hs / 2, hs, hs);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5 / this.zoom;
          ctx.strokeRect(hc.x - hs / 2, hc.y - hs / 2, hs, hs);
        }
        ctx.restore();
      }
    }

    for (const [id, laser] of this.activeLasers.entries()) {
      const elapsed = now - laser.lastUpdateTime;
      if (elapsed > (laser.ttlMs || 750)) {
        this.activeLasers.delete(id);
      } else if (laser.points && laser.points.length >= 2) {
        this.drawLaser(ctx, laser, now);
      }
    }

    for (const [id, ping] of this.activePings.entries()) {
      const elapsed = now - ping.createdAt;
      if (elapsed > ping.ttlMs) {
        this.activePings.delete(id);
      } else {
        this.drawPing(ctx, ping, elapsed / ping.ttlMs);
      }
    }

    ctx.restore();

    for (const [key, overlay] of this.conditionOverlays.entries()) {
      if (!this.activeConditionKeys.has(key)) {
        if ((overlay as any)._condIntervalId) clearInterval((overlay as any)._condIntervalId);
        if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
        this.conditionOverlays.delete(key);
      }
    }

    this.drawRemoteCursors(ctx, now);
  }

  private drawGrid(ctx: CanvasRenderingContext2D, settings: VTTDocument["canvasSettings"]): void {
    const size = settings.gridSizePx || 50;
    const startX = Math.floor(-this.panX / (this.zoom * size)) * size - size;
    const startY = Math.floor(-this.panY / (this.zoom * size)) * size - size;
    const endX = startX + (this.canvas.width / this.zoom) + size * 2;
    const endY = startY + (this.canvas.height / this.zoom) + size * 2;

    const personalGridColor = localStorage.getItem("vtt_personal_grid_color");
    ctx.strokeStyle = (personalGridColor && personalGridColor.trim()) ? personalGridColor.trim() : "#000000";
    const personalGridThickness = Number(localStorage.getItem("vtt_personal_grid_thickness")) || 0.5;
    ctx.lineWidth = personalGridThickness / this.zoom;

    if (settings.gridType === "square") {
      ctx.beginPath();
      for (let x = startX; x <= endX; x += size) {
        ctx.moveTo(x + 0.5, startY);
        ctx.lineTo(x + 0.5, endY);
      }
      for (let y = startY; y <= endY; y += size) {
        ctx.moveTo(startX, y + 0.5);
        ctx.lineTo(endX, y + 0.5);
      }
      ctx.stroke();
    }
  }

  public drawAreaDrawingsAndFills(ctx: CanvasRenderingContext2D, doc: VTTDocument, box: { x: number; y: number; width: number; height: number }): void {
    if (!doc) return;
    const size = doc.canvasSettings?.gridSizePx || 50;

    if (doc.gridCells) {
      for (const [key, cell] of Object.entries(doc.gridCells)) {
        if (!cell || !cell.fillColor || cell.fillColor === "fog" || cell.fogHidden) continue;
        const commaIdx = key.indexOf(",");
        if (commaIdx === -1) continue;
        const gx = Number(key.substring(0, commaIdx));
        const gy = Number(key.substring(commaIdx + 1));

        if (gx + size < box.x || gx > box.x + box.width || gy + size < box.y || gy > box.y + box.height) {
          continue;
        }

        ctx.fillStyle = cell.fillColor;
        ctx.fillRect(gx, gy, size, size);
      }
    }

    const sortedDrawings = Object.values(doc.entities)
      .filter((e) => e.type === "line")
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const ent of sortedDrawings) {
      this.drawEntity(ctx, ent);
    }
  }

  private drawGridCells(ctx: CanvasRenderingContext2D, doc: VTTDocument): void {
    if (!doc.gridCells) return;
    const size = doc.canvasSettings.gridSizePx || 50;
    const startX = Math.floor(-this.panX / (this.zoom * size)) * size - size;
    const startY = Math.floor(-this.panY / (this.zoom * size)) * size - size;
    const endX = startX + (this.canvas.width / this.zoom) + size * 2;
    const endY = startY + (this.canvas.height / this.zoom) + size * 2;

    for (const [key, cell] of Object.entries(doc.gridCells)) {
      if (!cell || (!cell.fillColor && !cell.fogHidden)) continue;
      const commaIdx = key.indexOf(",");
      if (commaIdx === -1) continue;
      const gx = Number(key.substring(0, commaIdx));
      const gy = Number(key.substring(commaIdx + 1));

      if (gx + size < startX || gx > endX || gy + size < startY || gy > endY) {
        continue;
      }

      if (cell.fillColor === "fog" || cell.fogHidden) {
        const creator = cell.fillColor === "fog" ? cell.fillCreator : cell.fogCreator;
        const isMine = creator && (creator === sessionManager.myPeerId || creator === "local");
        ctx.fillStyle = isMine ? "rgba(0, 0, 0, 0.45)" : "#000000";
        ctx.fillRect(gx, gy, size, size);
      } else if (cell.fillColor) {
        ctx.fillStyle = cell.fillColor;
        ctx.fillRect(gx, gy, size, size);
      }
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

  private updateTokenHoverScales(doc: VTTDocument): void {
    const size = doc.canvasSettings.gridSizePx || 50;
    const curGx = this.hoverWorldPos ? Math.floor(this.hoverWorldPos.x / size) : null;
    const curGy = this.hoverWorldPos ? Math.floor(this.hoverWorldPos.y / size) : null;

    for (const ent of Object.values(doc.entities)) {
      if (ent.type !== "token") continue;
      const tok = ent as TokenEntity;

      let targetScale = 1.0;
      if (!this.isTouchInput && this.selectedEntityId !== tok.id && curGx !== null && curGy !== null) {
        const tokGx = Math.floor(tok.position.x / size);
        const tokGy = Math.floor(tok.position.y / size);

        const minGx = Math.floor((tok.position.x - tok.size.width / 2) / size);
        const maxGx = Math.floor((tok.position.x + tok.size.width / 2 - 0.001) / size);
        const minGy = Math.floor((tok.position.y - tok.size.height / 2) / size);
        const maxGy = Math.floor((tok.position.y + tok.size.height / 2 - 0.001) / size);

        if (
          (curGx === tokGx && curGy === tokGy) ||
          (curGx >= minGx && curGx <= maxGx && curGy >= minGy && curGy <= maxGy)
        ) {
          targetScale = 2.0;
        }
      }

      const currentScale = this.tokenHoverScales.get(tok.id) ?? 1.0;
      let newScale = currentScale + (targetScale - currentScale) * 0.25;
      if (Math.abs(targetScale - newScale) < 0.005) {
        newScale = targetScale;
      }
      this.tokenHoverScales.set(tok.id, newScale);
    }
  }

  private drawEntity(ctx: CanvasRenderingContext2D, ent: CanvasEntity, stackOffset?: { x: number; y: number }): void {
    const now = Date.now();
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
        if (l.fillColor === "fog") {
          const isMine = l.lastModifiedBy === sessionManager.myPeerId || l.lastModifiedBy === "local";
          ctx.fillStyle = isMine ? "rgba(0, 0, 0, 0.45)" : "#000000";
        } else {
          ctx.fillStyle = l.fillColor;
        }
        ctx.fill();
      }
      if (l.strokeColor === "fog") {
        const isMine = l.lastModifiedBy === sessionManager.myPeerId || l.lastModifiedBy === "local";
        ctx.strokeStyle = isMine ? "rgba(0, 0, 0, 0.45)" : "#000000";
        ctx.globalAlpha = isMine ? 0.45 : 1.0;
      } else {
        ctx.strokeStyle = l.strokeColor;
        ctx.globalAlpha = l.strokeOpacity;
      }
      ctx.lineWidth = l.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    } else if (ent.type === "image" || ent.type === "token") {
      const imgEnt = ent as ImageEntity | TokenEntity;
      this.ensureImageLoaded(imgEnt.assetHash);
      const img = this.imageElements.get(imgEnt.assetHash);

      const targetX = imgEnt.position.x + (stackOffset?.x || 0);
      const targetY = imgEnt.position.y + (stackOffset?.y || 0);
      let renderX = targetX;
      let renderY = targetY;

      if (ent.type === "token") {
        if (this.draggingEntityId === ent.id) {
          renderX = imgEnt.position.x;
          renderY = imgEnt.position.y;
          this.renderPositions.set(ent.id, { x: renderX, y: renderY });
        } else {
          const cur = this.renderPositions.get(ent.id);
          if (!cur) {
            renderX = targetX;
            renderY = targetY;
            this.renderPositions.set(ent.id, { x: renderX, y: renderY });
          } else {
            cur.x += (targetX - cur.x) * 0.35;
            cur.y += (targetY - cur.y) * 0.35;
            if (Math.abs(targetX - cur.x) < 0.1 && Math.abs(targetY - cur.y) < 0.1) {
              cur.x = targetX;
              cur.y = targetY;
            }
            renderX = cur.x;
            renderY = cur.y;
          }
        }
      }

      ctx.translate(renderX, renderY);
      let baseRot = imgEnt.rotation || 0;
      let baseAlpha = imgEnt.opacity ?? 1.0;
      if (ent.type === "token") {
        const effects = (ent as TokenEntity).statusEffects || [];
        if (effects.includes("invisible")) baseAlpha *= 0.35;
        if (effects.includes("hidden")) baseAlpha *= 0.6;
        if (effects.includes("frightened")) {
          ctx.translate((Math.random() - 0.5) * (4 / this.zoom), (Math.random() - 0.5) * (4 / this.zoom));
        }
        if (effects.includes("drunk")) {
          baseRot += Math.sin(now / 400) * 0.12;
        }
        if (effects.includes("prone")) {
          baseRot += Math.PI / 2;
        }
      }
      ctx.rotate(baseRot);
      ctx.globalAlpha = baseAlpha;

      const hoverScale = ent.type === "token" ? (this.tokenHoverScales.get(ent.id) ?? 1.0) : 1.0;
      const pingPunch = this.pingPunchScales.get(ent.id) ?? 1.0;
      const totalScale = hoverScale * pingPunch;
      const displayW = imgEnt.size.width * totalScale;
      const displayH = imgEnt.size.height * totalScale;
      const halfW = displayW / 2;
      const halfH = displayH / 2;

      let isTokenFlying = false;
      if (ent.type === "token") {
        const token = ent as TokenEntity;
        const effects = token.statusEffects || [];
        isTokenFlying = effects.includes("flying");
        if (isTokenFlying) {
          const shadowScale = 0.65 + Math.sin(now / 350) * 0.05;
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(0, halfH * 0.45, halfW * shadowScale, halfH * (shadowScale * 0.45), 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
          ctx.fill();
          ctx.restore();

          const bobY = Math.sin(now / 350) * (halfH * 0.16) - (halfH * 0.14);
          ctx.translate(0, bobY);
        }
      }

      if (img && img.complete && img.naturalWidth > 0) {
        const blendSetting = localStorage.getItem("vtt_map_blend_mode") || "auto";
        const isFirefoxAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent) && /Firefox/i.test(navigator.userAgent);
        const rawBlend = (imgEnt as any).blendMode;

        let effectiveBlend = "source-over";
        if (blendSetting === "multiply") {
          effectiveBlend = "multiply";
        } else if (blendSetting === "normal") {
          effectiveBlend = "source-over";
        } else {
          // "auto" mode: Firefox Android GeckoView composite operation bug workaround
          if (isFirefoxAndroid) {
            effectiveBlend = "source-over";
          } else if (rawBlend === "multiply") {
            effectiveBlend = "multiply";
          }
        }

        if (effectiveBlend === "multiply") {
          const prevComp = ctx.globalCompositeOperation;
          try {
            ctx.globalCompositeOperation = "multiply";
            ctx.drawImage(img, -halfW, -halfH, displayW, displayH);
          } catch {
            ctx.drawImage(img, -halfW, -halfH, displayW, displayH);
          } finally {
            ctx.globalCompositeOperation = prevComp;
          }
        } else {
          ctx.drawImage(img, -halfW, -halfH, displayW, displayH);
        }
      } else {
        ctx.fillStyle = "rgba(100, 116, 139, 0.35)";
        ctx.fillRect(-halfW, -halfH, displayW, displayH);
      }

      if (ent.type === "token") {
        const token = ent as TokenEntity;
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3 / this.zoom;
        ctx.strokeRect(-halfW, -halfH, displayW, displayH);

        const effects = token.statusEffects || [];

        // Condition Animations
        if (effects.includes("restrained")) {
          ctx.save();
          const rot = (now / 1200) % (Math.PI * 2);
          ctx.rotate(rot);
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = Math.max(2, 3 / this.zoom);
          ctx.setLineDash([8 / this.zoom, 6 / this.zoom]);
          ctx.strokeRect(-halfW * 0.85, -halfH * 0.85, displayW * 0.85, displayH * 0.85);
          ctx.setLineDash([]);
          ctx.font = `${Math.max(12, 14 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("⛓️", 0, -halfH * 0.75);
          ctx.fillText("⛓️", 0, halfH * 0.85);
          ctx.restore();
        }

        if (effects.includes("stunned")) {
          ctx.save();
          ctx.font = `${Math.max(13, 16 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          const t = now / 400;
          for (let i = 0; i < 3; i++) {
            const ang = t + (i * Math.PI * 2) / 3;
            const sx = Math.cos(ang) * (halfW * 0.65);
            const sy = -halfH * 0.65 + Math.sin(ang) * (halfH * 0.15);
            ctx.fillText("💫", sx, sy);
          }
          ctx.restore();
        }

        if (effects.includes("exhausted")) {
          ctx.save();
          const p = (now % 2200) / 2200;
          ctx.font = `${Math.max(12, 16 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.globalAlpha = 1.0 - p * 0.7;
          const zx = halfW * 0.4 + Math.sin(p * Math.PI * 2) * (8 / this.zoom);
          const zy = -halfH * (0.2 + p * 0.9);
          ctx.fillText("🥱", zx, zy);
          ctx.restore();
        }

        if (effects.includes("down")) {
          ctx.save();
          const pulse = 0.4 + 0.35 * Math.sin(now / 200);
          ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
          ctx.lineWidth = Math.max(3, 5 / this.zoom);
          ctx.strokeRect(-halfW, -halfH, displayW, displayH);
          ctx.fillStyle = `rgba(239, 68, 68, ${pulse * 0.3})`;
          ctx.fillRect(-halfW, -halfH, displayW, displayH);
          ctx.font = `${Math.max(14, 18 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          const skullScale = 1.0 + 0.12 * Math.sin(now / 150);
          ctx.scale(skullScale, skullScale);
          ctx.fillText("💀", 0, 6 / this.zoom);
          ctx.restore();
        }

        if (effects.includes("blessed")) {
          ctx.save();
          const shimmer = 0.4 + 0.25 * Math.sin(now / 300);
          ctx.strokeStyle = `rgba(234, 179, 8, ${shimmer})`;
          ctx.lineWidth = Math.max(2, 4 / this.zoom);
          ctx.strokeRect(-halfW - 2, -halfH - 2, displayW + 4, displayH + 4);
          const sp = (now % 1800) / 1800;
          ctx.font = `${Math.max(12, 15 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.globalAlpha = 1.0 - sp * 0.6;
          ctx.fillText("✨", -halfW * 0.45, halfH * (0.5 - sp * 1.1));
          ctx.fillText("✨", halfW * 0.45, halfH * (0.8 - sp * 1.1));
          ctx.restore();
        }

        if (effects.includes("blind")) {
          ctx.save();
          ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
          ctx.fillRect(-halfW, -halfH, displayW, displayH * 0.5);
          ctx.font = `${Math.max(14, 18 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("🕶️", 0, -halfH * 0.15);
          ctx.restore();
        }

        if (effects.includes("charmed")) {
          ctx.save();
          const phase = (now % 2000) / 2000;
          ctx.font = `${Math.max(13, 16 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.globalAlpha = 1.0 - phase * 0.6;
          ctx.fillText("💖", -halfW * 0.3 + Math.sin(phase * Math.PI * 2) * (6 / this.zoom), -halfH * (0.3 + phase * 0.8));
          ctx.fillText("😍", halfW * 0.3 - Math.sin(phase * Math.PI * 2) * (6 / this.zoom), -halfH * (0.1 + phase * 0.7));
          ctx.restore();
        }

        if (effects.includes("frightened")) {
          ctx.save();
          ctx.font = `${Math.max(14, 18 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("😱", 0, -halfH * 0.65 + (Math.random() - 0.5) * (3 / this.zoom));
          ctx.restore();
        }

        if (effects.includes("drunk")) {
          ctx.save();
          const dp = (now % 2400) / 2400;
          ctx.font = `${Math.max(12, 15 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.globalAlpha = 1.0 - dp * 0.7;
          ctx.fillText("🫧", halfW * 0.45, halfH * (0.4 - dp * 1.3));
          ctx.fillText("🥴", 0, -halfH * 0.7);
          ctx.restore();
        }

        if (effects.includes("invisible")) {
          ctx.save();
          ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
          ctx.lineWidth = Math.max(1.5, 2.5 / this.zoom);
          ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);
          ctx.strokeRect(-halfW, -halfH, displayW, displayH);
          ctx.setLineDash([]);
          ctx.font = `${Math.max(14, 18 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("🫥", 0, 6 / this.zoom);
          ctx.restore();
        }

        if (effects.includes("paralyzed")) {
          ctx.save();
          ctx.strokeStyle = Math.random() > 0.3 ? "#eab308" : "#38bdf8";
          ctx.lineWidth = Math.max(2, 4 / this.zoom);
          ctx.strokeRect(-halfW, -halfH, displayW, displayH);
          ctx.font = `${Math.max(14, 18 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          const jx = (Math.random() - 0.5) * (8 / this.zoom);
          const jy = (Math.random() - 0.5) * (8 / this.zoom);
          ctx.fillText("⚡", jx, jy);
          ctx.restore();
        }

        if (effects.includes("prone")) {
          ctx.save();
          ctx.font = `${Math.max(13, 16 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("🛌", 0, halfH * 0.85);
          ctx.restore();
        }

        if (effects.includes("unconscious")) {
          ctx.save();
          ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
          ctx.fillRect(-halfW, -halfH, displayW, displayH);
          const up = (now % 2500) / 2500;
          ctx.font = `${Math.max(13, 17 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.globalAlpha = 1.0 - up * 0.6;
          ctx.fillText("💤", halfW * 0.3, -halfH * (0.1 + up * 0.9));
          ctx.globalAlpha = 1.0;
          ctx.fillText("😴", 0, 6 / this.zoom);
          ctx.restore();
        }

        if (effects.includes("bitchy")) {
          ctx.save();
          const pulse = 0.6 + 0.4 * Math.sin(now / 150);
          ctx.strokeStyle = `rgba(236, 72, 153, ${pulse})`;
          ctx.lineWidth = Math.max(2.5, 4 / this.zoom);
          ctx.strokeRect(-halfW - 3, -halfH - 3, displayW + 6, displayH + 6);
          ctx.font = `${Math.max(13, 16 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          const snapRot = Math.sin(now / 200) * 0.3;
          ctx.rotate(snapRot);
          ctx.fillText("💅", halfW * 0.6, -halfH * 0.6);
          ctx.fillText("🙄", -halfW * 0.6, -halfH * 0.6);
          ctx.restore();
        }

        if (effects.includes("bitchin")) {
          ctx.save();
          const flameAlpha = 0.5 + 0.35 * Math.sin(now / 120);
          ctx.strokeStyle = `rgba(249, 115, 22, ${flameAlpha})`;
          ctx.lineWidth = Math.max(3, 5 / this.zoom);
          ctx.strokeRect(-halfW, -halfH, displayW, displayH);
          const fp = (now % 1200) / 1200;
          ctx.font = `${Math.max(14, 18 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.globalAlpha = 1.0 - fp * 0.5;
          ctx.fillText("🔥", (Math.random() - 0.5) * halfW, halfH * (0.7 - fp * 1.5));
          ctx.globalAlpha = 1.0;
          ctx.fillText("😎", 0, 4 / this.zoom);
          ctx.restore();
        }

        if (effects.includes("inspired")) {
          ctx.save();
          const glow = 0.5 + 0.5 * Math.sin(now / 250);
          ctx.strokeStyle = `rgba(255, 255, 255, ${glow})`;
          ctx.lineWidth = Math.max(2, 3 / this.zoom);
          ctx.strokeRect(-halfW - 2, -halfH - 2, displayW + 4, displayH + 4);
          ctx.font = `${Math.max(15, 19 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("💡", 0, -halfH * 0.75 + Math.sin(now / 300) * (3 / this.zoom));
          ctx.restore();
        }

        if (effects.includes("frenzied")) {
          ctx.save();
          const throb = 1.0 + 0.15 * Math.sin(now / 80);
          ctx.strokeStyle = "#dc2626";
          ctx.lineWidth = Math.max(3, 5 / this.zoom);
          ctx.strokeRect(-halfW, -halfH, displayW, displayH);
          ctx.font = `${Math.max(14, 18 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.scale(throb, throb);
          ctx.fillText("💢", halfW * 0.6, -halfH * 0.6);
          ctx.fillText("😡", -halfW * 0.6, halfH * 0.6);
          ctx.restore();
        }

        if (effects.includes("hidden")) {
          ctx.save();
          ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
          ctx.fillRect(-halfW, -halfH, displayW, displayH);
          ctx.font = `${Math.max(14, 18 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("🥷", 0, 6 / this.zoom);
          ctx.restore();
        }

        if (effects.includes("hungry")) {
          ctx.save();
          const hp = (now % 2000) / 2000;
          ctx.font = `${Math.max(13, 16 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.globalAlpha = 1.0 - hp * 0.6;
          ctx.fillText("🍗", halfW * 0.5, halfH * (0.2 - hp * 0.8));
          ctx.globalAlpha = 1.0;
          ctx.fillText("🤤", 0, halfH * 0.75);
          ctx.restore();
        }

        if (effects.includes("sleepy")) {
          ctx.save();
          const nod = Math.sin(now / 700) * (4 / this.zoom);
          ctx.translate(0, nod);
          ctx.font = `${Math.max(14, 18 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("😪", 0, -halfH * 0.65);
          ctx.restore();
        }

        if (effects.includes("poisoned")) {
          ctx.save();
          const tox = 0.35 + 0.25 * Math.sin(now / 220);
          ctx.fillStyle = `rgba(34, 197, 94, ${tox})`;
          ctx.fillRect(-halfW, -halfH, displayW, displayH);
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = Math.max(2, 3.5 / this.zoom);
          ctx.strokeRect(-halfW, -halfH, displayW, displayH);
          const pp = (now % 1800) / 1800;
          ctx.font = `${Math.max(13, 16 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.globalAlpha = 1.0 - pp * 0.7;
          ctx.fillText("🫧", (Math.random() - 0.5) * halfW, halfH * (0.5 - pp * 1.2));
          ctx.globalAlpha = 1.0;
          ctx.fillText("🤢", 0, 6 / this.zoom);
          ctx.restore();
        }

        if (effects.includes("confused")) {
          ctx.save();
          ctx.font = `${Math.max(13, 16 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          const ct = now / 350;
          for (let i = 0; i < 2; i++) {
            const ang = ct + i * Math.PI;
            const qx = Math.cos(ang) * (halfW * 0.6);
            const qy = -halfH * 0.7 + Math.sin(ang) * (halfH * 0.2);
            ctx.fillText(i === 0 ? "❓" : "🌀", qx, qy);
          }
          ctx.restore();
        }

        if (effects.includes("concentrating")) {
          ctx.save();
          const pulse = 0.55 + 0.35 * Math.sin(now / 250);
          ctx.strokeStyle = `rgba(168, 85, 247, ${pulse})`;
          ctx.lineWidth = Math.max(3, 4.5 / this.zoom);
          ctx.shadowColor = "#a855f7";
          ctx.shadowBlur = 12 / this.zoom;
          const auraRadius = Math.max(displayW, displayH) * 0.55;
          ctx.beginPath();
          ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.shadowBlur = 6 / this.zoom;
          ctx.font = `${Math.max(13, 16 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const orbitTime = now / 700;
          for (let i = 0; i < 3; i++) {
            const ang = orbitTime + (i * Math.PI * 2) / 3;
            const ox = Math.cos(ang) * auraRadius;
            const oy = Math.sin(ang) * auraRadius;
            ctx.fillText("✨", ox, oy);
          }
          ctx.restore();
        }

        if (effects.includes("bloodied")) {
          ctx.save();
          const bloodPulse = 0.55 + 0.4 * Math.sin(now / 180);
          ctx.strokeStyle = `rgba(220, 38, 38, ${bloodPulse})`;
          ctx.lineWidth = Math.max(3, 5 / this.zoom);
          ctx.shadowColor = "#b91c1c";
          ctx.shadowBlur = 10 / this.zoom;
          ctx.strokeRect(-halfW, -halfH, displayW, displayH);

          ctx.shadowBlur = 0;
          ctx.font = `${Math.max(13, 17 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          for (let i = 0; i < 3; i++) {
            const cycle = (now / 1400 + i * 0.33) % 1;
            const dx = (i - 1) * (halfW * 0.5);
            const dy = -halfH * 0.2 + cycle * (displayH * 0.85);
            ctx.globalAlpha = Math.sin(cycle * Math.PI);
            ctx.fillText("🩸", dx, dy);
          }
          ctx.restore();
        }

        // Custom / AI Generated Conditions
        let customIdx = 0;
        for (let i = 0; i < effects.length; i++) {
          const effId = effects[i];
          if (BASE_CONDITIONS.some((bc: { id: string }) => bc.id === effId)) continue;
          const def = EFFECT_REGISTRY[effId];
          if (!def) continue;

          ctx.save();

          // Extract bespoke condition colors from particles or def
          const pConfig = def.conditionData?.animation || def.particles;
          const particleColors = pConfig?.colors && pConfig.colors.length > 0
            ? pConfig.colors
            : ["#38bdf8", "#c084fc"];
          const primaryColor = particleColors[0] || "#38bdf8";
          const accentColor = particleColors[1] || particleColors[0] || "#c084fc";

          // Draw bespoke pulsing aura ring in condition's primary color
          const pulse = 0.45 + 0.4 * Math.sin(now / 220 + customIdx * 1.5);
          ctx.strokeStyle = primaryColor;
          ctx.globalAlpha = pulse;
          ctx.lineWidth = Math.max(3, 4.5 / this.zoom);
          ctx.shadowColor = primaryColor;
          ctx.shadowBlur = 12 / this.zoom;

          const auraRadius = Math.max(displayW, displayH) * 0.58 + (customIdx * 5 / this.zoom);
          ctx.beginPath();
          ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Render condition effects via DOM overlay (SVG animation + CSS particles)
          const animSvg = def.conditionData?.animation?.effectSvg || (def.renderSvg ? def.renderSvg() : "");
          const key = `${ent.id}_${effId}`;
          this.activeConditionKeys.add(key);
          let overlay = this.conditionOverlays.get(key);
          if (!overlay) {
            overlay = document.createElement("div");
            overlay.className = "vtt-condition-overlay";
            overlay.style.position = "fixed";
            overlay.style.pointerEvents = "none";
            overlay.style.zIndex = "10";
            overlay.style.overflow = "visible";

            // SVG animation layer
            const svgLayer = document.createElement("div");
            svgLayer.className = "vtt-cond-svg-layer";
            svgLayer.style.cssText = "position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none;";
            if (animSvg) svgLayer.innerHTML = animSvg;
            overlay.appendChild(svgLayer);

            // Particle container layer
            const particleLayer = document.createElement("div");
            particleLayer.className = "vtt-cond-particle-layer";
            particleLayer.style.cssText = "position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; overflow: visible;";
            overlay.appendChild(particleLayer);

            document.body.appendChild(overlay);
            this.conditionOverlays.set(key, overlay);

            // Start particle spawn loop matching the preview modal's approach
            const spawnParticles = () => {
              if (!overlay || !overlay.parentElement) return;
              const pLayer = overlay.querySelector(".vtt-cond-particle-layer");
              if (!pLayer) return;
              const p = pConfig;
              const count = Math.min(p?.count || 12, 30);
              const overlayW = overlay.offsetWidth || 120;
              const maxDist = overlayW * 0.45;
              for (let pi = 0; pi < count; pi++) {
                const pEl = document.createElement("div");
                const color = particleColors[pi % particleColors.length];
                const minSize = p?.sizeRangePx?.[0] || 3;
                const maxSize = p?.sizeRangePx?.[1] || 7;
                const size = minSize + Math.random() * (maxSize - minSize);
                const angle = Math.random() * Math.PI * 2;
                const dist = 8 + Math.random() * maxDist;
                const dx = Math.cos(angle) * dist;
                const grav = p?.gravity || 0;
                const dy = Math.sin(angle) * dist + (grav !== 0 ? grav * 0.3 : 0);
                const lifeMs = p?.lifeMs || 1200;
                const shape = p?.shape || "sparkle";
                const borderRadius = (shape === "circle" || shape === "sparkle" || shape === "note") ? "50%" : "2px";
                pEl.style.cssText = `position: absolute; width: ${size}px; height: ${size}px; background: ${color}; border-radius: ${borderRadius}; box-shadow: 0 0 ${size * 1.5}px ${color}; opacity: 1; transition: transform ${lifeMs}ms ease-out, opacity ${lifeMs}ms ease-out; pointer-events: none;`;
                pLayer.appendChild(pEl);
                requestAnimationFrame(() => {
                  pEl.style.transform = `translate(${dx}px, ${dy}px) scale(0.15)`;
                  pEl.style.opacity = "0";
                });
                setTimeout(() => { if (pEl.parentElement) pEl.parentElement.removeChild(pEl); }, lifeMs + 50);
              }
            };
            spawnParticles();
            const loopMs = (def.durationMs || 2000) * 0.6;
            const intervalId = setInterval(spawnParticles, loopMs);
            (overlay as any)._condIntervalId = intervalId;
          }

          const screenPos = this.worldToScreen(renderX, renderY);
          const animSize = auraRadius * 2.2 * this.zoom;
          overlay.style.width = `${animSize}px`;
          overlay.style.height = `${animSize}px`;
          overlay.style.left = `${screenPos.x - animSize / 2}px`;
          overlay.style.top = `${screenPos.y - animSize / 2}px`;

          // Draw status badge / icon on canvas
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1.0;
          if (def.iconSvg) {
            if (def.iconSvg.includes("<svg")) {
              const cachedImg = this.getOrCacheSvgImage(`cond_icon_${effId}`, def.iconSvg);
              if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
                const iconSize = Math.max(18, 26 / this.zoom);
                const ox = (customIdx % 2 === 0 ? 1 : -1) * (halfW * 0.55);
                const oy = -halfH * 0.65 - Math.floor(customIdx / 2) * (iconSize + 4 / this.zoom);
                ctx.drawImage(cachedImg, ox - iconSize / 2, oy - iconSize / 2, iconSize, iconSize);
              } else {
                ctx.font = `${Math.max(13, 16 / this.zoom)}px sans-serif`;
                ctx.textAlign = "center";
                ctx.fillText("✨", 0, -halfH * 0.75);
              }
            } else {
              // Emoji or short text
              ctx.font = `${Math.max(14, 18 / this.zoom)}px sans-serif`;
              ctx.textAlign = "center";
              const ox = (customIdx % 2 === 0 ? 1 : -1) * (halfW * 0.5);
              const oy = -halfH * 0.65;
              ctx.fillText(def.iconSvg, ox, oy);
            }
          } else {
            ctx.font = `${Math.max(13, 16 / this.zoom)}px Outfit, sans-serif`;
            ctx.fillStyle = primaryColor;
            ctx.textAlign = "center";
            ctx.fillText(`✨ ${def.name || effId}`, 0, -halfH * 0.75);
          }
          ctx.restore();
          customIdx++;
        }

        const isHoveredOrSelected = hoverScale > 1.05 || this.selectedEntityId === ent.id;
        if (token.label && isHoveredOrSelected) {
          ctx.font = `600 ${Math.max(12, 14 / this.zoom)}px Outfit, sans-serif`;
          const textWidth = ctx.measureText(token.label).width;
          ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
          ctx.fillRect(-textWidth / 2 - 6, halfH + 4, textWidth + 12, 22);
          ctx.fillStyle = "#f8fafc";
          ctx.textAlign = "center";
          ctx.fillText(token.label, 0, halfH + 19);
        }
      }

      // Draw lock indicator badge (hidden for locked images user cannot select, and hidden in Simple Mode)
      if (!(window as any).vttSimpleMode && ent.locked && (ent.type !== "image" || canSelectLockedImage(ent))) {
        ctx.font = `${Math.max(7, 8 / this.zoom)}px Outfit, sans-serif`;
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.fillRect(halfW - 12 / this.zoom, -halfH, 12 / this.zoom, 12 / this.zoom);
        ctx.fillStyle = "#f43f5e";
        ctx.textAlign = "center";
        ctx.fillText("🔒", halfW - 6 / this.zoom, -halfH + 9 / this.zoom);
      }

      // Draw Selection bounding box and 4 Corner Resize Handles
      if (this.selectedEntityId === ent.id) {
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 2 / this.zoom;
        ctx.setLineDash([6 / this.zoom, 4 / this.zoom]);
        ctx.strokeRect(-halfW - 4, -halfH - 4, displayW + 8, displayH + 8);
        ctx.setLineDash([]);

        if (ent.type === "image") {
          const rotDist = Math.max(24, 30 / this.zoom);
          const topY = -halfH - 4;
          ctx.beginPath();
          ctx.moveTo(0, topY);
          ctx.lineTo(0, topY - rotDist);
          ctx.stroke();

          const rotRadius = Math.max(7, 9 / this.zoom);
          ctx.beginPath();
          ctx.arc(0, topY - rotDist, rotRadius, 0, Math.PI * 2);
          ctx.fillStyle = "#38bdf8";
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5 / this.zoom;
          ctx.stroke();

          ctx.font = `${Math.max(10, 12 / this.zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#0f172a";
          ctx.fillText("↻", 0, topY - rotDist);
        }

        // 4 Corner resize handle squares (only show for tokens when resizingTokenId matches)
        const showCorners = ent.type === "token" ? (this.resizingTokenId === ent.id) : true;
        if (showCorners) {
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
      console.log("[CanvasEngine] Image loaded successfully:", assetHash);
      this.imageElements.set(assetHash, img);
      this.loadingAssets.delete(assetHash);
    };
    img.onerror = () => {
      console.error("[CanvasEngine] Failed to load image asset:", assetHash);
      this.loadingAssets.delete(assetHash);
    };
    img.src = url;
  }

  private getOrCacheSvgImage(key: string, svgContent: string): HTMLImageElement | null {
    if (this.svgImageCache.has(key)) {
      return this.svgImageCache.get(key)!;
    }
    let pureSvg = svgContent;
    const svgMatch = svgContent.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch) {
      pureSvg = svgMatch[0];
    }
    if (!pureSvg.includes("<svg")) return null;

    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(pureSvg);
    this.svgImageCache.set(key, img);
    return img;
  }

  private drawMeasurement(ctx: CanvasRenderingContext2D, m: ActiveMeasurement): void {
    ctx.save();
    const dx = m.endPoint.x - m.startPoint.x;
    const dy = m.endPoint.y - m.startPoint.y;
    const radius = Math.sqrt(dx * dx + dy * dy);

    // Ephemeral dashed circle centered at startPoint with radius = distance
    if (radius > 2 && m.showCircle !== false) {
      ctx.beginPath();
      ctx.arc(m.startPoint.x, m.startPoint.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 2 / this.zoom;
      ctx.setLineDash([6 / this.zoom, 6 / this.zoom]);
      ctx.stroke();
    }

    // Measuring line from startPoint to endPoint
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

  private drawLaser(ctx: CanvasRenderingContext2D, laser: ActiveLaser, now: number): void {
    if (!laser.points || laser.points.length < 2) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const ttl = laser.ttlMs || 750;

    for (let i = 0; i < laser.points.length - 1; i++) {
      const p1 = laser.points[i];
      const p2 = laser.points[i + 1];

      const age = now - p2[2];
      if (age >= ttl) continue;

      const progress = Math.max(0, Math.min(1, age / ttl));
      const opacity = Math.max(0, 1 - progress);

      // Outer glow
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.strokeStyle = laser.color;
      ctx.globalAlpha = opacity * 0.45;
      ctx.lineWidth = Math.max(10, 14 / this.zoom);
      ctx.shadowColor = laser.color;
      ctx.shadowBlur = 16 / this.zoom;
      ctx.stroke();

      // Inner bright core
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.strokeStyle = "#ffffff";
      ctx.globalAlpha = opacity;
      ctx.lineWidth = Math.max(3, 4 / this.zoom);
      ctx.shadowBlur = 0;
      ctx.stroke();
    }

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
      cursor.x += (cursor.targetX - cursor.x) * 0.35;
      cursor.y += (cursor.targetY - cursor.y) * 0.35;
      if (Math.abs(cursor.targetX - cursor.x) < 0.1) cursor.x = cursor.targetX;
      if (Math.abs(cursor.targetY - cursor.y) < 0.1) cursor.y = cursor.targetY;

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
