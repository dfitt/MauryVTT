import { CanvasEngine, ToolType } from "../canvas/canvasEngine.js";
import { processImageFile, processTokenImageFile, generatePlainTokenImage, ProcessedImageResult } from "../canvas/imageResizer.js";
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
  "#f8fafc", // White
  "#000000", // Black
  "fog"      // Fog of War (special color)
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
    { id: "draw", icon: "✏️", title: "Freehand Sketch" },
    { id: "line", icon: "🖊️", title: "Straight Line" },
    {
      id: "fill",
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><rect x="4" y="4" width="16" height="16" rx="2.5" fill="currentColor" fill-opacity="0.35"/></svg>`,
      title: "Grid Square Fill Tool"
    },
    {
      id: "erase",
      icon: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;"><path d="M20 20H7L3 16C2.5 15.5 2.5 14.7 3 14.2L13 4.2C13.5 3.7 14.3 3.7 14.8 4.2L19.8 9.2C20.3 9.7 20.3 10.5 19.8 11L11 19.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 13L11 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      title: "Eraser (Clear lines & fills under cursor)"
    },
    {
      id: "measure",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;"><rect x="2" y="7" width="11" height="11" rx="3" fill="#eab308" stroke="currentColor" stroke-width="1.6"/><circle cx="7.5" cy="12.5" r="2" fill="#fef08a" stroke="currentColor" stroke-width="1.2"/><path d="M13 15H22V10H13" fill="#fef9c3" stroke="currentColor" stroke-width="1.4"/><line x1="16" y1="10" x2="16" y2="12.5" stroke="currentColor" stroke-width="1.4"/><line x1="19" y1="10" x2="19" y2="12.5" stroke="currentColor" stroke-width="1.4"/></svg>`,
      title: "Distance Tape Measure (Ephemeral)"
    },
    {
      id: "ping",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; overflow: visible;"><circle cx="12" cy="12" r="2.5" fill="currentColor"/><circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" class="ping-circle-1"/><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" class="ping-circle-2"/></svg>`,
      title: "Ripple Ping (Ephemeral)"
    }
  ];

  const bar = document.createElement("div");
  bar.className = "bottom-toolbar";

  tools.forEach((tool) => {
    const btn = document.createElement("button");
    btn.className = `tool-btn ${engine.activeTool === tool.id ? "active" : ""}`;
    btn.setAttribute("data-tooltip", tool.title);
    btn.innerHTML = tool.icon;
    btn.setAttribute("data-tool-id", tool.id);

    btn.addEventListener("click", () => {
      engine.setTool(tool.id);
      bar.querySelectorAll(".tool-btn[data-tool-id]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
    bar.appendChild(btn);
  });

  engine.onToolChanged((toolId) => {
    bar.querySelectorAll(".tool-btn[data-tool-id]").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-tool-id") === toolId);
    });
  });

  const divider1 = document.createElement("div");
  divider1.className = "tool-divider";
  bar.appendChild(divider1);

  // Compact Single-Button Color Picker
  const colorGroup = document.createElement("div");
  colorGroup.className = "toolbar-colors";

  const defaultColor = sessionManager.myColor || PALETTE_COLORS[0];
  engine.drawColor = defaultColor;

  const activeColorBtn = document.createElement("div");
  activeColorBtn.className = "toolbar-color-active-btn";
  if (defaultColor === "fog") {
    activeColorBtn.style.background = "repeating-linear-gradient(45deg, #64748b 0px, #64748b 3px, #0f172a 3px, #0f172a 8px)";
    activeColorBtn.style.border = "1.5px solid #94a3b8";
    activeColorBtn.innerHTML = "";
  } else {
    activeColorBtn.style.backgroundColor = defaultColor;
    activeColorBtn.style.border = "";
  }
  activeColorBtn.setAttribute("data-tooltip", "Current Drawing Color (Click to change)");

  const colorPopover = document.createElement("div");
  colorPopover.className = "toolbar-color-popover";
  colorPopover.style.display = "none";

  const popoverSwatches = document.createElement("div");
  popoverSwatches.className = "popover-swatches";

  const updateColor = (color: string) => {
    engine.drawColor = color;
    if (color === "fog") {
      activeColorBtn.style.background = "repeating-linear-gradient(45deg, #64748b 0px, #64748b 3px, #0f172a 3px, #0f172a 8px)";
      activeColorBtn.style.backgroundColor = "";
      activeColorBtn.style.border = "1.5px solid #94a3b8";
      activeColorBtn.innerHTML = "";
      activeColorBtn.setAttribute("data-tooltip", "Current Drawing Color: Fog of War");
    } else {
      activeColorBtn.style.background = color;
      activeColorBtn.style.backgroundColor = color;
      activeColorBtn.style.border = "";
      activeColorBtn.innerHTML = "";
      activeColorBtn.setAttribute("data-tooltip", `Current Drawing Color: ${color} (Click to change)`);
    }
    colorPopover.style.display = "none";
    popoverSwatches.querySelectorAll(".toolbar-color-swatch").forEach((s) => {
      const swatchColor = s.getAttribute("data-color");
      s.classList.toggle("active", swatchColor === color);
    });
  };

  PALETTE_COLORS.forEach((color) => {
    const swatch = document.createElement("div");
    swatch.className = `toolbar-color-swatch ${color === defaultColor ? "active" : ""}`;
    swatch.setAttribute("data-color", color);
    if (color === "fog") {
      swatch.style.background = "repeating-linear-gradient(45deg, #64748b 0px, #64748b 3px, #0f172a 3px, #0f172a 8px)";
      swatch.style.border = "1.5px solid #94a3b8";
      swatch.style.boxShadow = "inset 0 0 4px rgba(255, 255, 255, 0.6)";
      swatch.style.position = "relative";
      swatch.style.overflow = "hidden";
      swatch.innerHTML = "";
      swatch.setAttribute("data-tooltip", "Drawing Color: Fog of War (Pure black to others, semi-transparent to you)");
    } else {
      swatch.style.backgroundColor = color;
      swatch.style.border = "";
      swatch.setAttribute("data-tooltip", `Drawing Color: ${color}`);
    }
    swatch.addEventListener("click", (e) => {
      e.stopPropagation();
      engine.selectedEntityId = null;
      updateColor(color);
    });
    popoverSwatches.appendChild(swatch);
  });

  const customRow = document.createElement("div");
  customRow.style.display = "flex";
  customRow.style.alignItems = "center";
  customRow.style.justifyContent = "space-between";
  customRow.style.fontSize = "12px";
  customRow.style.color = "#cbd5e1";

  const customLabel = document.createElement("span");
  customLabel.textContent = "Custom Color:";
  const customInput = document.createElement("input");
  customInput.type = "color";
  customInput.value = defaultColor;
  customInput.style.cursor = "pointer";
  customInput.style.border = "none";
  customInput.style.background = "transparent";

  customInput.addEventListener("click", () => {
    engine.selectedEntityId = null;
  });

  customInput.addEventListener("change", () => {
    engine.selectedEntityId = null;
    updateColor(customInput.value);
  });

  customRow.appendChild(customLabel);
  customRow.appendChild(customInput);

  colorPopover.appendChild(popoverSwatches);
  colorPopover.appendChild(customRow);

  activeColorBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    engine.selectedEntityId = null;
    colorPopover.style.display = colorPopover.style.display === "none" ? "flex" : "none";
  });

  document.addEventListener("click", (e) => {
    if (!colorGroup.contains(e.target as Node)) {
      colorPopover.style.display = "none";
    }
  });

  colorGroup.appendChild(activeColorBtn);
  colorGroup.appendChild(colorPopover);
  bar.appendChild(colorGroup);

  const divider2 = document.createElement("div");
  divider2.className = "tool-divider";
  bar.appendChild(divider2);

  // Upload Image Button
  const uploadBtn = document.createElement("button");
  uploadBtn.className = "tool-btn";
  uploadBtn.setAttribute("data-tooltip", "Add Image");
  uploadBtn.innerHTML = "🖼️";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";

  uploadBtn.addEventListener("click", () => fileInput.click());

  const createAndDispatchImage = async (file: File) => {
    console.log("[toolbarUI] Standard image upload/paste selected:", file.name || "pasted-image", file.size);
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
    engine.setTool("select");
    engine.selectedEntityId = newImage.id;

    console.log("[toolbarUI] Starting async network upload for image asset:", processed.assetHash);
    sessionManager.uploadAsset(processed.assetHash, processed.blob)
      .then(() => console.log("[toolbarUI] Network upload succeeded for asset:", processed.assetHash))
      .catch((err) => console.error("[toolbarUI] Network upload failed for asset:", err));
  };

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    await createAndDispatchImage(file);
    fileInput.value = "";
  });

  window.addEventListener("paste", async (e: ClipboardEvent) => {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
      return;
    }
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            await createAndDispatchImage(file);
            return;
          }
        }
      }
    }
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.indexOf("image") !== -1) {
          e.preventDefault();
          await createAndDispatchImage(files[i]);
          return;
        }
      }
    }
  });

  bar.appendChild(uploadBtn);
  bar.appendChild(fileInput);

  // Add Map Button
  const addMapBtn = document.createElement("button");
  addMapBtn.className = "tool-btn";
  addMapBtn.setAttribute("data-tooltip", "Add Map");
  addMapBtn.innerHTML = "🗺️";

  const mapFileInput = document.createElement("input");
  mapFileInput.type = "file";
  mapFileInput.accept = "image/*";
  mapFileInput.style.display = "none";

  addMapBtn.addEventListener("click", () => mapFileInput.click());

  mapFileInput.addEventListener("change", async () => {
    const file = mapFileInput.files?.[0];
    if (!file) return;

    console.log("[toolbarUI] Map upload selected:", file.name, file.size);
    const processed = await processImageFile(file, 4096);
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
    const normalDisplayWidth = Math.round(origW * scale);
    const normalDisplayHeight = Math.round(origH * scale);

    const displayWidth = normalDisplayWidth * 5;
    const displayHeight = normalDisplayHeight * 5;

    const newMapImage: ImageEntity = {
      id: "img-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      type: "image",
      layerId: "map-layer",
      isMap: true,
      zIndex: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastModifiedBy: sessionManager.myPeerId || "local",
      locked: false,
      assetHash: processed.assetHash,
      position: { x: 0, y: 0 },
      size: {
        width: displayWidth,
        height: displayHeight
      },
      rotation: 0,
      opacity: 1.0
    };

    console.log("[toolbarUI] Dispatching CREATE_ENTITY for Map Image:", newMapImage.id, "hash:", processed.assetHash);
    sessionManager.dispatchOperation({
      opType: "CREATE_ENTITY",
      entity: newMapImage
    });
    engine.setTool("select");
    engine.selectedEntityId = newMapImage.id;

    console.log("[toolbarUI] Starting async network upload for map asset:", processed.assetHash);
    sessionManager.uploadAsset(processed.assetHash, processed.blob)
      .then(() => console.log("[toolbarUI] Network upload succeeded for map asset:", processed.assetHash))
      .catch((err) => console.error("[toolbarUI] Network upload failed for map asset:", err));

    mapFileInput.value = "";
  });

  bar.appendChild(addMapBtn);
  bar.appendChild(mapFileInput);

  // Upload Token Button
  const uploadTokenBtn = document.createElement("button");
  uploadTokenBtn.className = "tool-btn";
  uploadTokenBtn.setAttribute("data-tooltip", "Add Token (any image works)");
  uploadTokenBtn.innerHTML = "♟️";

  const tokenInput = document.createElement("input");
  tokenInput.type = "file";
  tokenInput.accept = "image/*";
  tokenInput.style.display = "none";

  const createAndDispatchToken = async (processed: ProcessedImageResult) => {
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

    sessionManager.dispatchOperation({
      opType: "CREATE_ENTITY",
      entity: newToken
    });
    engine.setTool("select");
    engine.selectedEntityId = newToken.id;

    sessionManager.uploadAsset(processed.assetHash, processed.blob)
      .catch((err) => console.error("[toolbarUI] Network upload failed for token asset:", err));
  };

  let tokenPickerActive = false;
  uploadTokenBtn.addEventListener("click", () => {
    tokenPickerActive = true;
    tokenInput.click();
  });

  tokenInput.addEventListener("change", async () => {
    tokenPickerActive = false;
    const file = tokenInput.files?.[0];
    if (file) {
      const processed = await processTokenImageFile(file, engine.drawColor);
      await createAndDispatchToken(processed);
    }
    tokenInput.value = "";
  });

  tokenInput.addEventListener("cancel", async () => {
    if (!tokenPickerActive) return;
    tokenPickerActive = false;
    const processed = await generatePlainTokenImage(engine.drawColor);
    await createAndDispatchToken(processed);
  });

  window.addEventListener("focus", () => {
    if (tokenPickerActive) {
      setTimeout(async () => {
        if (tokenPickerActive && (!tokenInput.files || tokenInput.files.length === 0)) {
          tokenPickerActive = false;
          const processed = await generatePlainTokenImage(engine.drawColor);
          await createAndDispatchToken(processed);
        }
      }, 350);
    }
  });

  bar.appendChild(uploadTokenBtn);
  bar.appendChild(tokenInput);

  const divider3 = document.createElement("div");
  divider3.className = "tool-divider";
  bar.appendChild(divider3);

  // Simple Mode Toggle Button in Advanced Mode
  const simpleModeBtn = document.createElement("button");
  simpleModeBtn.className = "tool-btn";
  simpleModeBtn.setAttribute("data-tooltip", "Switch to Simple Mode (Pan, Zoom & Move Tokens Only)");
  simpleModeBtn.innerHTML = "📱";
  bar.appendChild(simpleModeBtn);

  document.body.appendChild(bar);

  // Sleek Simple Mode Bar (visible only when Simple Mode is active)
  const simpleBar = document.createElement("div");
  simpleBar.id = "simple-mode-bar";
  simpleBar.className = "simple-mode-bar";
  simpleBar.style.display = "none";
  simpleBar.innerHTML = `
    <button class="btn-glass btn-sm" id="btn-simple-chat" style="cursor: pointer; padding: 8px 16px; font-size: 14px; font-weight: 600; border-radius: 999px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.45); color: #f8fafc; margin-right: 8px;">💬 Chat & Dice</button>
    <button class="btn-glass btn-sm btn-primary" id="btn-toggle-advanced" style="cursor: pointer; padding: 8px 14px; font-size: 14px; font-weight: 600; border-radius: 999px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);">⚙️ Adv Mode</button>
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
      if (chatWindow) {
        chatWindow.classList.add("minimized");
        chatWindow.style.display = "none";
      }
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
  simpleBar.querySelector<HTMLButtonElement>("#btn-simple-chat")!.addEventListener("click", () => {
    if (typeof (window as any).toggleVttChat === "function") {
      (window as any).toggleVttChat();
    } else {
      const chatWindow = document.querySelector<HTMLElement>(".chat-window");
      if (chatWindow) {
        const isHidden = chatWindow.classList.contains("minimized") || chatWindow.style.display === "none";
        if (isHidden) {
          chatWindow.classList.remove("minimized");
          chatWindow.style.display = "flex";
        } else {
          chatWindow.classList.add("minimized");
          chatWindow.style.display = "none";
        }
      }
    }
  });

  if (isMobilePhone()) {
    applySimpleMode(true);
  }
}
