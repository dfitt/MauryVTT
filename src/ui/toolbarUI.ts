import { CanvasEngine, ToolType } from "../canvas/canvasEngine.js";
import { processImageFile, processTokenImageFile } from "../canvas/imageResizer.js";
import { assetStore } from "../state/idbAssetStore.js";
import { docStore } from "../state/documentStore.js";
import { sessionManager } from "../network/sessionManager.js";
import { ImageEntity, TokenEntity } from "../types/vtt.js";

const PALETTE_COLORS = [
  "#38bdf8", // Cyan
  "#f43f5e", // Rose
  "#eab308", // Yellow
  "#10b981", // Emerald
  "#a855f7", // Violet
  "#f97316", // Orange
  "#f8fafc"  // White
];

function isMobilePhone(): boolean {
  const ua = navigator.userAgent || "";
  const isIPad = /iPad/i.test(ua) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /Macintosh/i.test(ua));
  if (isIPad) return false;
  return /iPhone|iPod|Android.*Mobile/i.test(ua) || (window.innerWidth <= 600 && !isIPad);
}

export function setupToolbarUI(engine: CanvasEngine): void {
  (window as any).vttActiveTool = engine.activeTool;

  const tools: { id: ToolType; icon: string; title: string }[] = [
    { id: "select", icon: "↖️", title: "Select & Move / Resize Entities" },
    { id: "pan", icon: "✋", title: "Pan Map (Touch or Drag with 1 finger)" },
    { id: "draw", icon: "✏️", title: "Freehand Sketch" },
    { id: "line", icon: "🖊️", title: "Straight Line" },
    { id: "fill", icon: "🪣", title: "Grid Square Fill Tool" },
    { id: "erase", icon: "🧹", title: "Eraser (Clear lines & fills under cursor)" },
    { id: "hide", icon: "⬛", title: "Fog" },
    { id: "unhide", icon: "⬜", title: "Fog Away" },
    { id: "measure", icon: "📐", title: "Distance Ruler (Ephemeral)" },
    { id: "ping", icon: "📡", title: "Ripple Ping (Ephemeral)" }
  ];

  const bar = document.createElement("div");
  bar.className = "bottom-toolbar";

  tools.forEach((tool) => {
    const btn = document.createElement("button");
    btn.className = `tool-btn ${engine.activeTool === tool.id ? "active" : ""}`;
    btn.title = tool.title;
    btn.innerHTML = tool.icon;

    btn.addEventListener("click", () => {
      engine.activeTool = tool.id;
      (window as any).vttActiveTool = tool.id;
      bar.querySelectorAll(".tool-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
    bar.appendChild(btn);
  });

  const divider1 = document.createElement("div");
  divider1.className = "tool-divider";
  bar.appendChild(divider1);

  // Color Swatch Picker
  const colorGroup = document.createElement("div");
  colorGroup.className = "toolbar-colors";

  // Ensure user's color is set as default drawing color
  const defaultColor = sessionManager.myColor || PALETTE_COLORS[0];
  engine.drawColor = defaultColor;

  PALETTE_COLORS.forEach((color) => {
    const swatch = document.createElement("div");
    swatch.className = `toolbar-color-swatch ${color === defaultColor ? "active" : ""}`;
    swatch.style.backgroundColor = color;
    swatch.title = `Drawing Color: ${color}`;

    swatch.addEventListener("click", () => {
      engine.drawColor = color;
      colorGroup.querySelectorAll(".toolbar-color-swatch").forEach((el) => el.classList.remove("active"));
      swatch.classList.add("active");
    });

    colorGroup.appendChild(swatch);
  });

  bar.appendChild(colorGroup);

  const divider2 = document.createElement("div");
  divider2.className = "tool-divider";
  bar.appendChild(divider2);

  // Upload Image Button
  const uploadBtn = document.createElement("button");
  uploadBtn.className = "tool-btn";
  uploadBtn.title = "Upload Image / Token (Resized to <=1024px & Exact Aspect Ratio Preserved)";
  uploadBtn.innerHTML = "🖼️";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";

  uploadBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    console.log("[toolbarUI] Image upload selected:", file.name, file.size);
    const processed = await processImageFile(file, 1024);
    await assetStore.saveAsset(processed.assetHash, processed.blob);
    docStore.registerAssetManifest(
      processed.assetHash,
      processed.mimeType,
      processed.byteSize,
      processed.widthPx,
      processed.heightPx
    );

    const maxDisplaySide = 300;
    const origW = processed.widthPx;
    const origH = processed.heightPx;
    const maxSide = Math.max(origW, origH);
    const scale = maxSide > maxDisplaySide ? maxDisplaySide / maxSide : 1.0;
    const displayWidth = Math.round(origW * scale);
    const displayHeight = Math.round(origH * scale);

    const centerWorld = engine.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
    const newImage: ImageEntity = {
      id: "img-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      type: "image",
      layerId: "tokens-layer",
      zIndex: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastModifiedBy: sessionManager.myPeerId || "local",
      locked: false,
      assetHash: processed.assetHash,
      position: centerWorld,
      size: {
        width: displayWidth,
        height: displayHeight
      },
      rotation: 0,
      opacity: 1.0
    };

    console.log("[toolbarUI] Dispatching CREATE_ENTITY for Image:", newImage.id, "hash:", processed.assetHash);
    sessionManager.dispatchOperation({
      opType: "CREATE_ENTITY",
      entity: newImage
    });

    console.log("[toolbarUI] Starting async network upload for image asset:", processed.assetHash);
    sessionManager.uploadAsset(processed.assetHash, processed.blob)
      .then(() => console.log("[toolbarUI] Network upload succeeded for asset:", processed.assetHash))
      .catch((err) => console.error("[toolbarUI] Network upload failed for asset:", err));

    fileInput.value = "";
  });

  bar.appendChild(uploadBtn);
  bar.appendChild(fileInput);

  // Upload Token Button
  const uploadTokenBtn = document.createElement("button");
  uploadTokenBtn.className = "tool-btn";
  uploadTokenBtn.title = "Upload Token (Circular 256x256 PNG, sized & snapped to 1 grid cell)";
  uploadTokenBtn.innerHTML = "♟️";

  const tokenInput = document.createElement("input");
  tokenInput.type = "file";
  tokenInput.accept = "image/*";
  tokenInput.style.display = "none";

  uploadTokenBtn.addEventListener("click", () => tokenInput.click());

  tokenInput.addEventListener("change", async () => {
    const file = tokenInput.files?.[0];
    if (!file) return;

    console.log("[toolbarUI] Token upload selected:", file.name, file.size);
    const processed = await processTokenImageFile(file);
    await assetStore.saveAsset(processed.assetHash, processed.blob);
    docStore.registerAssetManifest(
      processed.assetHash,
      processed.mimeType,
      processed.byteSize,
      processed.widthPx,
      processed.heightPx
    );

    const doc = docStore.getDocument();
    const gridSizePx = doc.canvasSettings.gridSizePx || 50;
    const centerWorld = engine.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);

    const gx = Math.floor(centerWorld.x / gridSizePx) * gridSizePx;
    const gy = Math.floor(centerWorld.y / gridSizePx) * gridSizePx;
    const snappedPos = {
      x: gx + gridSizePx / 2,
      y: gy + gridSizePx / 2
    };

    const newToken: TokenEntity = {
      id: "tok-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      type: "token",
      layerId: "tokens-layer",
      zIndex: Date.now() + 1000000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastModifiedBy: sessionManager.myPeerId || "local",
      locked: false,
      assetHash: processed.assetHash,
      position: snappedPos,
      size: {
        width: gridSizePx,
        height: gridSizePx
      },
      rotation: 0,
      opacity: 1.0,
      label: "",
      labelVisibleToAll: true,
      gridSnapped: true,
      elevation: 0,
      ownerPeerIds: [],
      statusEffects: []
    };

    console.log("[toolbarUI] Dispatching CREATE_ENTITY for Token:", newToken.id, "hash:", processed.assetHash);
    sessionManager.dispatchOperation({
      opType: "CREATE_ENTITY",
      entity: newToken
    });

    console.log("[toolbarUI] Starting async network upload for token asset:", processed.assetHash);
    sessionManager.uploadAsset(processed.assetHash, processed.blob)
      .then(() => console.log("[toolbarUI] Network upload succeeded for token asset:", processed.assetHash))
      .catch((err) => console.error("[toolbarUI] Network upload failed for token asset:", err));

    tokenInput.value = "";
  });

  bar.appendChild(uploadTokenBtn);
  bar.appendChild(tokenInput);

  const divider3 = document.createElement("div");
  divider3.className = "tool-divider";
  bar.appendChild(divider3);

  const chatToggleBtn = document.createElement("button");
  chatToggleBtn.className = "tool-btn";
  chatToggleBtn.title = "Toggle Chat & Dice Roller Window";
  chatToggleBtn.innerHTML = "💬";
  chatToggleBtn.addEventListener("click", () => {
    if (typeof (window as any).toggleVttChat === "function") {
      (window as any).toggleVttChat();
    }
  });
  bar.appendChild(chatToggleBtn);

  // Simple Mode Toggle Button in Advanced Mode
  const simpleModeBtn = document.createElement("button");
  simpleModeBtn.className = "tool-btn";
  simpleModeBtn.title = "Switch to Simple Mode (Pan, Zoom & Move Tokens Only)";
  simpleModeBtn.innerHTML = "📱";
  bar.appendChild(simpleModeBtn);

  document.body.appendChild(bar);

  // Sleek Simple Mode Bar (visible only when Simple Mode is active)
  const simpleBar = document.createElement("div");
  simpleBar.id = "simple-mode-bar";
  simpleBar.className = "simple-mode-bar";
  simpleBar.style.display = "none";
  simpleBar.innerHTML = `
    <span class="simple-mode-label">⚡ Simple Mode: Pan, Zoom & Move Tokens</span>
    <button class="btn-glass btn-sm btn-primary" id="btn-toggle-advanced" style="cursor: pointer; padding: 6px 14px;">⚙️ Advanced Mode</button>
  `;
  document.body.appendChild(simpleBar);

  const applySimpleMode = (enabled: boolean) => {
    (window as any).vttSimpleMode = enabled;
    document.body.classList.toggle("simple-mode-active", enabled);

    const topHeader = document.querySelector<HTMLElement>(".top-header");
    const chatWindow = document.querySelector<HTMLElement>(".chat-window");
    const selectionToolbar = document.querySelector<HTMLElement>("#selection-toolbar");

    if (enabled) {
      if (topHeader) topHeader.style.display = "none";
      if (chatWindow) chatWindow.style.display = "none";
      if (selectionToolbar) selectionToolbar.style.display = "none";
      bar.style.display = "none";
      simpleBar.style.display = "flex";

      engine.activeTool = "select";
      (window as any).vttActiveTool = "select";
      engine.selectedEntityId = null;
    } else {
      if (topHeader) topHeader.style.display = "flex";
      if (chatWindow) chatWindow.style.display = "flex";
      bar.style.display = "flex";
      simpleBar.style.display = "none";
    }
  };

  (window as any).setVTTSimpleMode = applySimpleMode;

  simpleModeBtn.addEventListener("click", () => applySimpleMode(true));
  simpleBar.querySelector<HTMLButtonElement>("#btn-toggle-advanced")!.addEventListener("click", () => applySimpleMode(false));

  if (isMobilePhone()) {
    applySimpleMode(true);
  }
}
