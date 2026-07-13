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

export function setupToolbarUI(engine: CanvasEngine): void {
  const tools: { id: ToolType; icon: string; title: string }[] = [
    { id: "select", icon: "✋", title: "Select & Move / Resize Entities" },
    { id: "draw", icon: "✏️", title: "Freehand Sketch" },
    { id: "line", icon: "📏", title: "Straight Line" },
    { id: "fill", icon: "🔲", title: "Grid Square Fill Tool" },
    { id: "erase", icon: "🧹", title: "Eraser (Clear lines & fills under cursor)" },
    { id: "hide", icon: "⬛", title: "Image Hider (Black mask overlay on image)" },
    { id: "unhide", icon: "⬜", title: "Image Restorer (Remove black overlay mask)" },
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

    const processed = await processImageFile(file, 1024);
    await assetStore.saveAsset(processed.assetHash, processed.blob);
    docStore.registerAssetManifest(
      processed.assetHash,
      processed.mimeType,
      processed.byteSize,
      processed.widthPx,
      processed.heightPx
    );

    await sessionManager.uploadAsset(processed.assetHash, processed.blob);

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

    sessionManager.dispatchOperation({
      opType: "CREATE_ENTITY",
      entity: newImage
    });

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

    const processed = await processTokenImageFile(file);
    await assetStore.saveAsset(processed.assetHash, processed.blob);
    docStore.registerAssetManifest(
      processed.assetHash,
      processed.mimeType,
      processed.byteSize,
      processed.widthPx,
      processed.heightPx
    );

    await sessionManager.uploadAsset(processed.assetHash, processed.blob);

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

    sessionManager.dispatchOperation({
      opType: "CREATE_ENTITY",
      entity: newToken
    });

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

  document.body.appendChild(bar);
}
