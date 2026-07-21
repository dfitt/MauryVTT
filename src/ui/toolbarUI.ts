import { CanvasEngine, ToolType } from "../canvas/canvasEngine.js";
import { processImageFile, processTokenImageFile, generatePlainTokenImage, ProcessedImageResult } from "../canvas/imageResizer.js";
import { assetStore } from "../state/idbAssetStore.js";
import { docStore } from "../state/documentStore.js";
import { sessionManager } from "../network/sessionManager.js";
import { ImageEntity, TokenEntity } from "../types/vtt.js";
import { openImportVttfxModal } from "./vttfxImportModal.js";
import { openCharacterSheetModal, SHEET_ICON_SVG } from "./characterSheetModal.js";
import { EFFECT_REGISTRY } from "../effects/effectDefs.js";
import { showEnhanceToast } from "./enhanceModal.js";
import { openAiTokenGenerateModal, setupTokenProxyListeners } from "./tokenAiModal.js";
import { openVttfxGenerateModal } from "./vttfxGenerateModal.js";
import { openAiImageGenerateModal } from "./imageGenModal.js";

const PALETTE_COLORS = [
  "#38bdf8", // Cyan
  "#f43f5e", // Rose
  "#eab308", // Yellow
  "#10b981", // Emerald
  "#a855f7", // Violet
  "#f97316", // Orange
  "#ec4899", // Pink
  "#84cc16", // Lime
  "#6366f1", // Indigo
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

  const clearAllSelections = () => {
    if (engine.selectedEntityId !== null) {
      engine.selectedEntityId = null;
    }
    if (engine.selectedDrawingIds.size > 0) {
      engine.selectedDrawingIds.clear();
      engine.notifyDrawingSelectionChanged();
    }
  };

  const SHAPE_ICONS: Record<typeof engine.lineShape, string> = {
    doodle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M3 17C6 14 7 19 10 16C13 13 14 18 17 15C19 13 20 12 21 11"/></svg>`,
    select: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="4 4"/><circle cx="4" cy="4" r="1.5" fill="currentColor"/><circle cx="20" cy="20" r="1.5" fill="currentColor"/></svg>`,
    straight: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><line x1="5" y1="19" x2="19" y2="5"/><circle cx="5" cy="19" r="1.8" fill="currentColor"/><circle cx="19" cy="5" r="1.8" fill="currentColor"/></svg>`,
    rectangle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="3" cy="6" r="1.5" fill="currentColor"/><circle cx="21" cy="18" r="1.5" fill="currentColor"/></svg>`,
    circle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`,
    cone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M4 12L19 4C21.5 8 21.5 16 19 20L4 12Z"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/></svg>`,
    hexagon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M12 2L21 7.2V16.8L12 22L3 16.8V7.2L12 2Z"/></svg>`,
    spiral: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M12 12C12 10.5 13.5 9 15 9C17.5 9 19 11 19 13.5C19 17 16 20 12 20C7 20 4 16 4 11C4 5.5 8.5 2 14 2"/></svg>`,
    arrow: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><line x1="4" y1="20" x2="19" y2="5"/><polyline points="10 5 19 5 19 14"/></svg>`
  };

  const EPHEMERAL_ICONS: Record<string, string> = {
    ping: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; overflow: visible;"><circle cx="12" cy="12" r="2.5" fill="currentColor"/><circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" class="ping-circle-1"/><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" class="ping-circle-2"/></svg>`,
    measure: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;"><rect x="2" y="7" width="11" height="11" rx="3" fill="#eab308" stroke="currentColor" stroke-width="1.6"/><circle cx="7.5" cy="12.5" r="2" fill="#fef08a" stroke="currentColor" stroke-width="1.2"/><path d="M13 15H22V10H13" fill="#fef9c3" stroke="currentColor" stroke-width="1.4"/><line x1="16" y1="10" x2="16" y2="12.5" stroke="currentColor" stroke-width="1.4"/><line x1="19" y1="10" x2="19" y2="12.5" stroke="currentColor" stroke-width="1.4"/></svg>`,
    laser: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; overflow: visible;"><defs><style>@keyframes laserBeamPulse{0%,100%{opacity:0.45;stroke-width:4.5px;}50%{opacity:0.85;stroke-width:6px;}}@keyframes laserSparkle1{0%{transform:rotate(0deg) scale(0.9);}50%{transform:rotate(180deg) scale(1.35);}100%{transform:rotate(360deg) scale(0.9);}}@keyframes laserSparkle2{0%{transform:rotate(45deg) scale(1.2);}50%{transform:rotate(-135deg) scale(0.8);}100%{transform:rotate(-315deg) scale(1.2);}}.laser-glow{animation:laserBeamPulse 1.6s infinite ease-in-out;transform-origin:center;}.sparkle-start{animation:laserSparkle1 3s infinite linear;transform-origin:4px 20px;}.sparkle-end{animation:laserSparkle2 2.5s infinite linear;transform-origin:20px 4px;}</style></defs><line x1="4" y1="20" x2="20" y2="4" stroke="#f43f5e" stroke-width="5" stroke-linecap="round" class="laser-glow"/><line x1="4" y1="20" x2="20" y2="4" stroke="#fb7185" stroke-width="2.8" stroke-linecap="round"/><line x1="4" y1="20" x2="20" y2="4" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round"/><g class="sparkle-start"><path d="M 4 13 Q 4 20 11 20 Q 4 20 4 27 Q 4 20 -3 20 Q 4 20 4 13 Z" fill="#f43f5e" opacity="0.65"/><path d="M 4 15.5 Q 4 20 8.5 20 Q 4 20 4 24.5 Q 4 20 -0.5 20 Q 4 20 4 15.5 Z" fill="#ffffff"/></g><g class="sparkle-end"><path d="M 20 -3 Q 20 4 27 4 Q 20 4 20 11 Q 20 4 13 4 Q 20 4 20 -3 Z" fill="#f43f5e" opacity="0.65"/><path d="M 20 -0.5 Q 20 4 24.5 4 Q 20 4 20 8.5 Q 20 4 15.5 4 Q 20 4 20 -0.5 Z" fill="#ffffff"/></g></svg>`
  };

  const AI_ICONS: Record<string, string> = {
    enhance: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;"><path d="M12 2L14.4 8.4L21 10.8L14.4 13.2L12 19.6L9.6 13.2L3 10.8L9.6 8.4L12 2Z" fill="url(#enhance-grad)" stroke="#c084fc" stroke-width="1.5"/><path d="M19 16L20.2 19.2L23 20.4L20.2 21.6L19 24.8L17.8 21.6L15 20.4L17.8 19.2L19 16Z" fill="#e879f9"/><defs><linearGradient id="enhance-grad" x1="3" y1="2" x2="21" y2="20" gradientUnits="userSpaceOnUse"><stop stop-color="#c084fc"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs></svg>`,
    token: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;"><circle cx="12" cy="12" r="9" stroke="#38bdf8" stroke-width="1.8" fill="rgba(56,189,248,0.15)"/><path d="M12 6L13.5 10.5L18 12L13.5 13.5L12 18L10.5 13.5L6 12L10.5 10.5L12 6Z" fill="url(#token-ai-grad)" stroke="#c084fc" stroke-width="1.2"/><defs><linearGradient id="token-ai-grad" x1="6" y1="6" x2="18" y2="18" gradientUnits="userSpaceOnUse"><stop stop-color="#c084fc"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs></svg>`,
    vttfx: `💫`,
    imageGen: `🎨`
  };

  const updateMainLineIcon = () => {
    const lineBtn = bar.querySelector('.tool-btn[data-tool-id="line"]');
    if (lineBtn) {
      lineBtn.innerHTML = SHAPE_ICONS[engine.lineShape] || SHAPE_ICONS.doodle;
    }
  };

  const updateMainEphemeralIcon = () => {
    const ephemBtn = bar.querySelector('.tool-btn[data-tool-id="ephemeral"]');
    if (ephemBtn) {
      ephemBtn.innerHTML = EPHEMERAL_ICONS[engine.ephemeralTool] || EPHEMERAL_ICONS.laser;
    }
  };

  const updateMainAiIcon = () => {
    const aiBtn = bar.querySelector('.tool-btn[data-tool-id="ai"]');
    if (aiBtn) {
      aiBtn.innerHTML = AI_ICONS[engine.aiTool || "enhance"] || AI_ICONS.enhance;
    }
  };

  const tools: { id: ToolType; icon: string; title: string }[] = [
    {
      id: "select",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;"><path d="M4 4L11.2 21.6L13.8 14.2L21.2 11.6L4 4Z" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
      title: "Select & Move / Resize Entities"
    },
    {
      id: "line",
      icon: SHAPE_ICONS[engine.lineShape] || SHAPE_ICONS.doodle,
      title: "Drawing & Shape Tools"
    },
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
      id: "ephemeral",
      icon: EPHEMERAL_ICONS[engine.ephemeralTool] || EPHEMERAL_ICONS.laser,
      title: "Ephemeral Tools (Ping, Measure, Laser)"
    },
    {
      id: "image",
      icon: "🖼️",
      title: "Add Image File"
    },
    {
      id: "map",
      icon: "🗺️",
      title: "Add Map File"
    },
    {
      id: "token",
      icon: "♟️",
      title: "Add Pawns / Token Image"
    },
    {
      id: "ai",
      icon: AI_ICONS[engine.aiTool || "enhance"] || AI_ICONS.enhance,
      title: "AI Tools (Map Enhance, AI Token, AI VTTFX)"
    }
  ];

  const bar = document.createElement("div");
  bar.className = "bottom-toolbar";

  const toolPopover = document.createElement("div");
  toolPopover.className = "tool-options-popover";
  toolPopover.style.cssText =
    "display: none; position: absolute; bottom: 68px; left: 16px; background: rgba(15, 23, 42, 0.96); border: 1px solid rgba(56, 189, 248, 0.45); border-radius: 12px; padding: 12px 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.65); z-index: 1000; flex-direction: column; gap: 10px; min-width: 230px; color: #f8fafc; font-family: Outfit, sans-serif;";
  bar.appendChild(toolPopover);

  const hasOptions = (id: ToolType) => id === "draw" || id === "line" || id === "fill" || id === "erase" || id === "ephemeral" || id === "ai";

  const renderPopover = (toolId: ToolType) => {
    toolPopover.innerHTML = "";
    if (toolId === "draw" || toolId === "line") {
      if (toolId === "line") {
        const shapeHeader = document.createElement("div");
        shapeHeader.style.cssText = "font-weight: 600; font-size: 13px; color: #38bdf8; margin-bottom: 4px;";
        shapeHeader.textContent = "📐 Drawing Tools";
        toolPopover.appendChild(shapeHeader);

        const shapeGrid = document.createElement("div");
        shapeGrid.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;";
        const shapes: { id: typeof engine.lineShape; label: string; icon: string }[] = [
          { id: "doodle", label: "Doodle", icon: SHAPE_ICONS.doodle },
          { id: "select", label: "Select", icon: SHAPE_ICONS.select },
          { id: "straight", label: "Straight", icon: SHAPE_ICONS.straight },
          { id: "rectangle", label: "Rectangle", icon: SHAPE_ICONS.rectangle },
          { id: "circle", label: "Circle", icon: SHAPE_ICONS.circle },
          { id: "cone", label: "Cone", icon: SHAPE_ICONS.cone },
          { id: "hexagon", label: "Hexagon", icon: SHAPE_ICONS.hexagon },
          { id: "spiral", label: "Spiral", icon: SHAPE_ICONS.spiral },
          { id: "arrow", label: "Arrow", icon: SHAPE_ICONS.arrow }
        ];
        shapes.forEach((s) => {
          const b = document.createElement("button");
          const active = engine.lineShape === s.id;
          b.className = `btn-glass btn-sm ${active ? "btn-active" : ""}`;
          b.style.cssText = `padding: 6px 4px; font-size: 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; ${active ? "background: #38bdf8; color: #0f172a; font-weight: 700;" : ""}`;
          b.innerHTML = `<span>${s.icon}</span><span>${s.label}</span>`;
          b.addEventListener("click", () => {
            if (engine.lineShape === "select" && s.id !== "select" && engine.selectedDrawingIds.size > 0) {
              engine.selectedDrawingIds.clear();
              engine.notifyDrawingSelectionChanged();
            }
            engine.lineShape = s.id;
            updateMainLineIcon();
            engine.notifyToolOptionsChanged();
            renderPopover(toolId);
          });
          shapeGrid.appendChild(b);
        });
        toolPopover.appendChild(shapeGrid);
      }

      if (engine.lineShape !== "select") {
        const header = document.createElement("div");
        header.style.cssText = "font-weight: 600; font-size: 13px; color: #38bdf8; display: flex; justify-content: space-between; align-items: center;";
        header.innerHTML = `<span>📏 Thickness</span><span id="pop-draw-label">${engine.drawWidth}px</span>`;
        toolPopover.appendChild(header);

        const presetsRow = document.createElement("div");
        presetsRow.style.cssText = "display: flex; gap: 6px;";
        const presets = [
          { label: "Fine (2px)", val: 2 },
          { label: "Med (6px)", val: 6 },
          { label: "Bold (14px)", val: 14 },
          { label: "Heavy (28px)", val: 28 }
        ];
        presets.forEach((p) => {
          const b = document.createElement("button");
          const active = engine.drawWidth === p.val;
          b.className = `btn-glass btn-sm ${active ? "btn-active" : ""}`;
          b.style.cssText = `flex: 1; padding: 5px 2px; font-size: 11px; border-radius: 6px; cursor: pointer; ${active ? "background: #38bdf8; color: #0f172a; font-weight: 700;" : ""}`;
          b.textContent = p.label;
          b.addEventListener("click", () => {
            engine.drawWidth = p.val;
            engine.notifyToolOptionsChanged();
            renderPopover(toolId);
          });
          presetsRow.appendChild(b);
        });
        toolPopover.appendChild(presetsRow);

        const sliderRow = document.createElement("div");
        sliderRow.style.cssText = "display: flex; align-items: center; gap: 8px; margin-top: 2px;";
        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = "2";
        slider.max = "60";
        slider.value = String(engine.drawWidth);
        slider.style.cssText = "flex: 1; cursor: pointer; accent-color: #38bdf8;";
        slider.addEventListener("input", () => {
          engine.drawWidth = Number(slider.value);
          const label = toolPopover.querySelector("#pop-draw-label");
          if (label) label.textContent = `${engine.drawWidth}px`;
          engine.notifyToolOptionsChanged();
        });
        sliderRow.appendChild(slider);
        toolPopover.appendChild(sliderRow);
      }

      const hint = document.createElement("div");
      hint.style.cssText = "font-size: 11px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;";
      hint.textContent = "💡 Shortcut: [ / ] or Shift+Wheel to resize";
      toolPopover.appendChild(hint);
    } else if (toolId === "fill") {
      const header = document.createElement("div");
      header.style.cssText = "font-weight: 600; font-size: 13px; color: #38bdf8;";
      header.textContent = "🔲 Grid Fill Mode";
      toolPopover.appendChild(header);

      const gridRow = document.createElement("div");
      gridRow.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 6px;";
      const modes = [
        { label: "1x1 Cell", size: 1, bucket: false },
        { label: "2x2 Stamp", size: 2, bucket: false },
        { label: "3x3 Stamp", size: 3, bucket: false },
        { label: "🪣 Flood Bucket", size: 1, bucket: true }
      ];
      modes.forEach((m) => {
        const b = document.createElement("button");
        const active = m.bucket ? engine.fillBucket : (!engine.fillBucket && engine.fillSize === m.size);
        b.className = `btn-glass btn-sm ${active ? "btn-active" : ""}`;
        b.style.cssText = `padding: 6px 4px; font-size: 12px; border-radius: 6px; cursor: pointer; ${active ? "background: #38bdf8; color: #0f172a; font-weight: 700;" : ""}`;
        b.textContent = m.label;
        b.addEventListener("click", () => {
          engine.fillBucket = m.bucket;
          if (!m.bucket) engine.fillSize = m.size;
          engine.notifyToolOptionsChanged();
          renderPopover(toolId);
        });
        gridRow.appendChild(b);
      });
      toolPopover.appendChild(gridRow);

      const hint = document.createElement("div");
      hint.style.cssText = "font-size: 11px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;";
      hint.textContent = "💡 Shortcut: [ / ] or Shift+Wheel to change mode";
      toolPopover.appendChild(hint);
    } else if (toolId === "erase") {
      const header = document.createElement("div");
      header.style.cssText = "font-weight: 600; font-size: 13px; color: #ef4444;";
      header.textContent = "🧹 Eraser Area";
      toolPopover.appendChild(header);

      const gridRow = document.createElement("div");
      gridRow.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 6px;";
      const modes = [
        { label: "1x1 Cell", size: 1 },
        { label: "3x3 Area", size: 3 },
        { label: "5x5 Area", size: 5 },
        { label: "20x20 Massive", size: 20 }
      ];
      modes.forEach((m) => {
        const b = document.createElement("button");
        const active = engine.eraseSize === m.size;
        b.className = `btn-glass btn-sm ${active ? "btn-active" : ""}`;
        b.style.cssText = `padding: 6px 4px; font-size: 12px; border-radius: 6px; cursor: pointer; ${active ? "background: #ef4444; color: #ffffff; font-weight: 700;" : ""}`;
        b.textContent = m.label;
        b.addEventListener("click", () => {
          engine.eraseSize = m.size;
          engine.notifyToolOptionsChanged();
          renderPopover(toolId);
        });
        gridRow.appendChild(b);
      });
      toolPopover.appendChild(gridRow);

      const modeRow = document.createElement("div");
      modeRow.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;";
      const allBtn = document.createElement("button");
      const allActive = !engine.eraseOnlyMine;
      allBtn.className = `btn-glass btn-sm ${allActive ? "btn-active" : ""}`;
      allBtn.style.cssText = `padding: 6px 4px; font-size: 12px; border-radius: 6px; cursor: pointer; ${allActive ? "background: #ef4444; color: #ffffff; font-weight: 700;" : ""}`;
      allBtn.textContent = "all drawings";
      allBtn.addEventListener("click", () => {
        engine.eraseOnlyMine = false;
        engine.notifyToolOptionsChanged();
        renderPopover(toolId);
      });
      modeRow.appendChild(allBtn);

      const mineBtn = document.createElement("button");
      const mineActive = engine.eraseOnlyMine;
      mineBtn.className = `btn-glass btn-sm ${mineActive ? "btn-active" : ""}`;
      mineBtn.style.cssText = `padding: 6px 4px; font-size: 12px; border-radius: 6px; cursor: pointer; ${mineActive ? "background: #ef4444; color: #ffffff; font-weight: 700;" : ""}`;
      mineBtn.textContent = "my drawings";
      mineBtn.addEventListener("click", () => {
        engine.eraseOnlyMine = true;
        engine.notifyToolOptionsChanged();
        renderPopover(toolId);
      });
      modeRow.appendChild(mineBtn);
      toolPopover.appendChild(modeRow);

      const hint = document.createElement("div");
      hint.style.cssText = "font-size: 11px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;";
      hint.textContent = "💡 Shortcut: [ / ] or Shift+Wheel to scale eraser";
      toolPopover.appendChild(hint);
    } else if (toolId === "ephemeral") {
      const header = document.createElement("div");
      header.style.cssText = "font-weight: 600; font-size: 13px; color: #38bdf8; margin-bottom: 4px;";
      header.textContent = "⚡ Ephemeral Tools";
      toolPopover.appendChild(header);

      const grid = document.createElement("div");
      grid.style.cssText = "display: grid; grid-template-columns: 1fr; gap: 6px; margin-bottom: 4px;";
      const modes: { id: typeof engine.ephemeralTool; label: string; icon: string }[] = [
        { id: "ping", label: "Ping (Double-click or click)", icon: EPHEMERAL_ICONS.ping },
        { id: "measure", label: "Measure (Drag line)", icon: EPHEMERAL_ICONS.measure },
        { id: "laser", label: "Laser (Fading doodle)", icon: EPHEMERAL_ICONS.laser }
      ];
      modes.forEach((m) => {
        const b = document.createElement("button");
        const active = engine.ephemeralTool === m.id;
        b.className = `btn-glass btn-sm ${active ? "btn-active" : ""}`;
        b.style.cssText = `padding: 8px 10px; font-size: 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: flex-start; gap: 8px; ${active ? "background: #38bdf8; color: #0f172a; font-weight: 700;" : ""}`;
        b.innerHTML = `<span>${m.icon}</span><span>${m.label}</span>`;
        b.addEventListener("click", () => {
          engine.ephemeralTool = m.id;
          updateMainEphemeralIcon();
          engine.notifyToolOptionsChanged();
          renderPopover(toolId);
        });
        grid.appendChild(b);
      });
      toolPopover.appendChild(grid);

      const pingAnimSection = document.createElement("div");
      pingAnimSection.style.cssText = "display: flex; flex-direction: column; gap: 6px; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;";

      const pingAnimHeader = document.createElement("div");
      pingAnimHeader.style.cssText = "display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 600; color: #cbd5e1;";
      pingAnimHeader.innerHTML = `<span>✨ Ping Animation (VTTFX)</span>`;

      const previewBtn = document.createElement("button");
      previewBtn.className = "btn-glass";
      previewBtn.style.cssText = "padding: 2px 6px; font-size: 10px; border-radius: 4px; color: #38bdf8; cursor: pointer;";
      previewBtn.textContent = "▶ Preview";
      previewBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const centerWorld = engine.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
        engine.triggerPing(centerWorld.x, centerWorld.y);
      });
      pingAnimHeader.appendChild(previewBtn);
      pingAnimSection.appendChild(pingAnimHeader);

      const selectEl = document.createElement("select");
      selectEl.className = "btn-glass";
      selectEl.style.cssText = "width: 100%; padding: 6px 8px; font-size: 12px; border-radius: 6px; background: rgba(15, 23, 42, 0.95); color: #f8fafc; border: 1px solid rgba(56, 189, 248, 0.45); cursor: pointer; outline: none; font-family: Outfit, sans-serif;";

      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "Default (Ripple Arc Only)";
      defaultOpt.style.background = "#0f172a";
      selectEl.appendChild(defaultOpt);

      Object.values(EFFECT_REGISTRY).forEach((effect) => {
        const opt = document.createElement("option");
        opt.value = effect.id;
        opt.textContent = effect.name ? `${effect.name}` : effect.id;
        opt.style.background = "#0f172a";
        if (engine.pingEffectId === effect.id) {
          opt.selected = true;
        }
        selectEl.appendChild(opt);
      });

      selectEl.addEventListener("change", (e) => {
        e.stopPropagation();
        engine.pingEffectId = selectEl.value || null;
      });

      selectEl.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      pingAnimSection.appendChild(selectEl);
      toolPopover.appendChild(pingAnimSection);

      const hint = document.createElement("div");
      hint.style.cssText = "font-size: 11px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;";
      hint.textContent = "💡 Shortcut: Double-click canvas anytime to ping";
      toolPopover.appendChild(hint);
    }

    if (toolId === "ai") {
      const header = document.createElement("div");
      header.style.cssText = "font-weight: 600; font-size: 13px; color: #c084fc; margin-bottom: 4px;";
      header.textContent = "✨ AI Tools & Generators";
      toolPopover.appendChild(header);

      const grid = document.createElement("div");
      grid.style.cssText = "display: flex; flex-direction: column; gap: 6px;";
      
      const aiOptions: { id: "enhance" | "token" | "vttfx" | "imageGen"; label: string; desc: string; icon: string }[] = [
        { id: "enhance", label: "AI Map Enhance", desc: "/enhance - Draw selection box on canvas", icon: AI_ICONS.enhance },
        { id: "token", label: "AI Token Generator", desc: "Generate token art from description", icon: AI_ICONS.token },
        { id: "vttfx", label: "AI VTTFX Generator", desc: "Generate animated spell & status VFX", icon: AI_ICONS.vttfx },
        { id: "imageGen", label: "AI Scene / Illustration", desc: "Generate Dark Fantasy scene art referencing tokens", icon: AI_ICONS.imageGen }
      ];

      aiOptions.forEach((o) => {
        const b = document.createElement("button");
        const active = (engine.aiTool || "enhance") === o.id;
        b.className = `btn-glass btn-sm ${active ? "btn-active" : ""}`;
        b.style.cssText = `padding: 8px 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 10px; text-align: left; ${active ? "background: rgba(192, 132, 252, 0.25); border: 1px solid #c084fc; color: #ffffff; font-weight: 700;" : "color: #cbd5e1;"}`;
        b.innerHTML = `<span style="font-size: 18px; display: flex; align-items: center;">${o.icon}</span><div style="display: flex; flex-direction: column;"><span style="font-size: 13px;">${o.label}</span><span style="font-size: 11px; color: #94a3b8; font-weight: 400;">${o.desc}</span></div>`;
        b.addEventListener("click", () => {
          engine.aiTool = o.id;
          updateMainAiIcon();
          engine.setTool("ai");
          bar.querySelectorAll(".tool-btn[data-tool-id]").forEach((btnEl) => btnEl.classList.remove("active"));
          const aiBtn = bar.querySelector('.tool-btn[data-tool-id="ai"]');
          aiBtn?.classList.add("active");
          toolPopover.style.display = "none";

          if (o.id === "enhance") {
            engine.setTool("enhance");
            showEnhanceToast("✨ AI Map Enhancement active: Draw a selection box over your map sketch area on the canvas!", 5000);
          } else if (o.id === "token") {
            openAiTokenGenerateModal(engine, createAndDispatchToken);
          } else if (o.id === "vttfx") {
            openVttfxGenerateModal();
          } else if (o.id === "imageGen") {
            openAiImageGenerateModal(engine);
          }
        });
        grid.appendChild(b);
      });
      toolPopover.appendChild(grid);
    }
  };

  const createToolBtn = (tool: typeof tools[0]) => {
    const btn = document.createElement("button");
    btn.className = `tool-btn ${engine.activeTool === tool.id ? "active" : ""}`;
    btn.setAttribute("data-tooltip", tool.title + (hasOptions(tool.id) ? " (Click active or right-click for size & options)" : ""));
    btn.innerHTML = tool.icon;
    btn.setAttribute("data-tool-id", tool.id);

    btn.addEventListener("click", (e) => {
      if (engine.activeTool === tool.id && hasOptions(tool.id)) {
        e.stopPropagation();
        if (toolPopover.style.display === "flex" && toolPopover.getAttribute("data-popover-tool") === tool.id) {
          toolPopover.style.display = "none";
        } else {
          clearAllSelections();
          toolPopover.setAttribute("data-popover-tool", tool.id);
          renderPopover(tool.id);
          toolPopover.style.display = "flex";
          const rect = btn.getBoundingClientRect();
          const barRect = bar.getBoundingClientRect();
          toolPopover.style.left = `${Math.max(10, rect.left - barRect.left - 30)}px`;
        }
      } else {
        engine.setTool(tool.id);
        bar.querySelectorAll(".tool-btn[data-tool-id]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        toolPopover.style.display = "none";
        if (tool.id === "image") {
          fileInput.click();
        } else if (tool.id === "map") {
          mapFileInput.click();
        } else if (tool.id === "token") {
          tokenPickerActive = true;
          tokenInput.click();
        } else if (tool.id === "ai") {
          const curAi = engine.aiTool || "enhance";
          if (curAi === "enhance") {
            engine.setTool("enhance");
            showEnhanceToast("✨ AI Map Enhancement active: Draw a selection box over your map sketch area on the canvas!", 5000);
          } else if (curAi === "token") {
            openAiTokenGenerateModal(engine, createAndDispatchToken);
          } else if (curAi === "vttfx") {
            openVttfxGenerateModal();
          } else if (curAi === "imageGen") {
            openAiImageGenerateModal(engine);
          }
        }
      }
    });

    btn.addEventListener("contextmenu", (e) => {
      if (hasOptions(tool.id)) {
        e.preventDefault();
        e.stopPropagation();
        clearAllSelections();
        engine.setTool(tool.id);
        bar.querySelectorAll(".tool-btn[data-tool-id]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        toolPopover.setAttribute("data-popover-tool", tool.id);
        renderPopover(tool.id);
        toolPopover.style.display = "flex";
        const rect = btn.getBoundingClientRect();
        const barRect = bar.getBoundingClientRect();
        toolPopover.style.left = `${Math.max(10, rect.left - barRect.left - 30)}px`;
      }
    });

    return btn;
  };

  const drawingTools = tools.filter((t) => t.id === "select" || t.id === "line" || t.id === "fill" || t.id === "erase" || t.id === "ephemeral");
  const mediaTools = tools.filter((t) => t.id === "image" || t.id === "token" || t.id === "ai");

  drawingTools.forEach((tool) => {
    bar.appendChild(createToolBtn(tool));
  });

  updateMainLineIcon();
  updateMainEphemeralIcon();
  updateMainAiIcon();

  const deleteFloatingBar = document.createElement("div");
  deleteFloatingBar.className = "drawing-selection-bar";
  deleteFloatingBar.style.cssText =
    "display: none; position: fixed; bottom: 84px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.96); border: 1px solid #f43f5e; border-radius: 12px; padding: 10px 18px; box-shadow: 0 10px 30px rgba(244, 63, 94, 0.3); z-index: 2000; align-items: center; gap: 12px; font-family: Outfit, sans-serif; color: #f8fafc;";
  document.body.appendChild(deleteFloatingBar);

  const updateDeleteFloatingBar = () => {
    if (engine.selectedDrawingIds.size > 0) {
      deleteFloatingBar.style.display = "flex";
      deleteFloatingBar.innerHTML = `
        <span style="font-weight: 600; font-size: 14px;">Selected Drawings (${engine.selectedDrawingIds.size})</span>
        <button id="btn-delete-selected-drawings" class="btn-glass" style="background: #f43f5e; color: #ffffff; font-weight: 700; padding: 6px 14px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
          <span>🗑️ Delete</span>
        </button>
      `;
      const btn = deleteFloatingBar.querySelector("#btn-delete-selected-drawings");
      btn?.addEventListener("click", () => {
        for (const id of engine.selectedDrawingIds) {
          sessionManager.dispatchOperation({
            opType: "DELETE_ENTITY",
            id
          });
        }
        engine.selectedDrawingIds.clear();
        engine.notifyDrawingSelectionChanged();
      });
    } else {
      deleteFloatingBar.style.display = "none";
    }
  };

  engine.onDrawingSelectionChanged(() => {
    updateDeleteFloatingBar();
  });

  engine.onToolChanged((toolId) => {
    bar.querySelectorAll(".tool-btn[data-tool-id]").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-tool-id") === toolId);
    });
    updateMainLineIcon();
    updateMainEphemeralIcon();
    updateMainAiIcon();
    const curPopTool = toolPopover.getAttribute("data-popover-tool");
    if (toolPopover.style.display === "flex" && curPopTool !== toolId) {
      toolPopover.style.display = "none";
    }
  });

  engine.onToolOptionsChanged(() => {
    updateMainLineIcon();
    updateMainEphemeralIcon();
    updateMainAiIcon();
    const curTool = toolPopover.getAttribute("data-popover-tool") as ToolType;
    if (toolPopover.style.display === "flex" && curTool && curTool === engine.activeTool) {
      renderPopover(curTool);
    }
  });

  const divider1 = document.createElement("div");
  divider1.className = "tool-divider";
  bar.appendChild(divider1);

  // Compact Single-Button Color Picker (Drawing Color Selector)
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
    clearAllSelections();
    colorPopover.style.display = colorPopover.style.display === "none" ? "flex" : "none";
  });

  document.addEventListener("click", (e) => {
    if (!colorGroup.contains(e.target as Node)) {
      colorPopover.style.display = "none";
    }
    if (!toolPopover.contains(e.target as Node) && !(e.target as HTMLElement).closest(".tool-btn")) {
      toolPopover.style.display = "none";
    }
  });

  colorGroup.appendChild(activeColorBtn);
  colorGroup.appendChild(colorPopover);
  bar.appendChild(colorGroup);

  const divider2 = document.createElement("div");
  divider2.className = "tool-divider";
  bar.appendChild(divider2);

  mediaTools.forEach((tool) => {
    bar.appendChild(createToolBtn(tool));
  });

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";

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
    const displayWidth = Math.round(origW * scale) * 3;
    const displayHeight = Math.round(origH * scale) * 3;

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
    const isEditingText = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

    // 1. Check files in clipboard first
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.name.endsWith(".vttfx") || (f.name.endsWith(".json") && !f.type.startsWith("image/"))) {
          e.preventDefault();
          try {
            const text = await f.text();
            const bundle = JSON.parse(text);
            if (bundle && Array.isArray(bundle.effects)) {
              openImportVttfxModal(bundle, bundle.bundleName || f.name);
              return;
            }
          } catch (err) {
            console.error("Failed to parse pasted vttfx/json file:", err);
          }
        }
      }
      if (!isEditingText) {
        for (let i = 0; i < files.length; i++) {
          if (files[i].type.indexOf("image") !== -1) {
            e.preventDefault();
            await createAndDispatchImage(files[i]);
            return;
          }
        }
      }
    }

    // 2. Check items in clipboard for files or images
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          const f = items[i].getAsFile();
          if (f && (f.name.endsWith(".vttfx") || f.name.endsWith(".json"))) {
            e.preventDefault();
            try {
              const text = await f.text();
              const bundle = JSON.parse(text);
              if (bundle && Array.isArray(bundle.effects)) {
                openImportVttfxModal(bundle, bundle.bundleName || f.name);
                return;
              }
            } catch (err) {
              console.error("Failed to parse pasted item file:", err);
            }
          } else if (f && f.type.indexOf("image") !== -1 && !isEditingText) {
            e.preventDefault();
            await createAndDispatchImage(f);
            return;
          }
        }
      }
    }

    // 3. If not inside an input box, check if pasted raw text is a valid .vttfx JSON bundle
    if (!isEditingText) {
      const text = e.clipboardData?.getData("text");
      if (text && text.trim().startsWith("{") && text.includes('"effects"')) {
        try {
          const bundle = JSON.parse(text);
          if (bundle && Array.isArray(bundle.effects)) {
            e.preventDefault();
            openImportVttfxModal(bundle, bundle.bundleName || "Pasted VFX Bundle");
            return;
          }
        } catch (err) {
          // Not valid JSON or VTTFX, ignore and let default happen if any
        }
      }
    }
  });

  bar.appendChild(fileInput);

  const mapFileInput = document.createElement("input");
  mapFileInput.type = "file";
  mapFileInput.accept = "image/*";
  mapFileInput.style.display = "none";

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

    const displayWidth = normalDisplayWidth * 15;
    const displayHeight = normalDisplayHeight * 15;

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

  bar.appendChild(mapFileInput);

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

    const myUname = sessionManager.myUsername || localStorage.getItem("maury_vtt_username") || "Me";
    const alreadyHasClaimedToken = Boolean(
      doc.primaryTokens?.[myUname] ||
      Object.values(doc.entities).some(
        (e) => e.type === "token" && (e as any).primaryOwnerUsername === myUname
      )
    );

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
      ownerPeerIds: [sessionManager.myPeerId || "local"],
      primaryOwnerUsername: alreadyHasClaimedToken ? undefined : myUname,
      statusEffects: []
    };

    sessionManager.dispatchOperation({
      opType: "CREATE_ENTITY",
      entity: newToken
    });
    engine.zoomToWorldPos(snappedPos.x, snappedPos.y, newToken.id);

    sessionManager.uploadAsset(processed.assetHash, processed.blob)
      .catch((err) => console.error("[toolbarUI] Network upload failed for token asset:", err));
  };

  setupTokenProxyListeners(engine, createAndDispatchToken);

  let tokenPickerActive = false;

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

  bar.appendChild(tokenInput);

  const divider3 = document.createElement("div");
  divider3.className = "tool-divider";
  bar.appendChild(divider3);

  // Character Sheet Button (left of Simple Mode)
  const charSheetBtn = document.createElement("button");
  charSheetBtn.className = "tool-btn";
  charSheetBtn.setAttribute("data-tooltip", "Open Character Sheet (/sheet)");
  charSheetBtn.innerHTML = SHEET_ICON_SVG;
  charSheetBtn.addEventListener("click", () => openCharacterSheetModal(engine));
  bar.appendChild(charSheetBtn);

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
    <button class="btn-glass btn-sm" id="btn-simple-sheet" title="Open Character Sheet (/sheet)" style="cursor: pointer; padding: 8px 14px; font-size: 14px; font-weight: 600; border-radius: 999px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.45); color: #f8fafc; margin-right: 8px; display: flex; align-items: center; justify-content: center;">${SHEET_ICON_SVG}</button>
    <button class="btn-glass btn-sm" id="btn-simple-chat" style="cursor: pointer; padding: 8px 16px; font-size: 14px; font-weight: 600; border-radius: 999px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.45); color: #f8fafc; margin-right: 8px;">💬 Chat & Dice</button>
    <button class="btn-glass btn-sm btn-primary" id="btn-toggle-advanced" style="cursor: pointer; padding: 8px 14px; font-size: 14px; font-weight: 600; border-radius: 999px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);">⚙️ Adv Mode</button>
  `;
  document.body.appendChild(simpleBar);

  let preSimpleChatWasMinimized = false;

  const applySimpleMode = (enabled: boolean) => {
    (window as any).vttSimpleMode = enabled;
    document.body.classList.toggle("simple-mode-active", enabled);

    const topHeader = document.querySelector<HTMLElement>(".top-header");
    const chatWindow = document.querySelector<HTMLElement>(".chat-window");
    const selectionToolbar = document.querySelector<HTMLElement>("#selection-toolbar");

    if (enabled) {
      if (topHeader) topHeader.style.display = "none";
      if (chatWindow) {
        if (!isMobilePhone()) {
          preSimpleChatWasMinimized = chatWindow.classList.contains("minimized") || chatWindow.style.display === "none";
        }
        chatWindow.classList.add("minimized");
        chatWindow.style.display = "none";
      }
      bar.style.display = "none";
      simpleBar.style.display = "flex";

      engine.activeTool = "select";
      (window as any).vttActiveTool = "select";
      engine.selectedEntityId = null;
    } else {
      if (topHeader) topHeader.style.display = "flex";
      if (chatWindow) {
        if (isMobilePhone()) {
          chatWindow.style.display = "flex";
        } else {
          if (preSimpleChatWasMinimized) {
            chatWindow.classList.add("minimized");
          } else {
            chatWindow.classList.remove("minimized");
          }
          chatWindow.style.display = "flex";
          const toggleBtn = chatWindow.querySelector<HTMLButtonElement>("#btn-toggle-chat");
          if (toggleBtn) {
            toggleBtn.textContent = chatWindow.classList.contains("minimized") ? "▲" : "▼";
          }
        }
      }
      bar.style.display = "flex";
      simpleBar.style.display = "none";
      document.body.classList.remove("token-selected-in-simple");
    }
  };

  (window as any).setVTTSimpleMode = applySimpleMode;

  simpleModeBtn.addEventListener("click", () => applySimpleMode(true));
  simpleBar.querySelector<HTMLButtonElement>("#btn-simple-sheet")!.addEventListener("click", () => openCharacterSheetModal(engine));
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
