import { CanvasEngine } from "../canvas/canvasEngine.js";
import { docStore } from "../state/documentStore.js";
import { sessionManager } from "../network/sessionManager.js";
import { TokenEntity } from "../types/vtt.js";

export function setupSelectionBarUI(engine: CanvasEngine): void {
  const bar = document.createElement("div");
  bar.id = "selection-toolbar";
  bar.className = "selection-toolbar";
  bar.style.display = "none";

  document.body.appendChild(bar);

  const updateBar = (selectedId: string | null) => {
    if (!selectedId) {
      bar.style.display = "none";
      return;
    }

    const doc = docStore.getDocument();
    const ent = doc.entities[selectedId];
    if (!ent) {
      bar.style.display = "none";
      return;
    }

    bar.style.display = "flex";
    bar.innerHTML = "";

    if (ent.type === "token") {
      const token = ent as TokenEntity;
      const title = document.createElement("span");
      title.className = "selection-title";
      title.textContent = "♟️ Token";
      bar.appendChild(title);

      // Name Input Field
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "token-name-input";
      nameInput.placeholder = "Token Name...";
      nameInput.value = token.label || "";
      nameInput.style.cssText =
        "background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(56, 189, 248, 0.45); border-radius: 6px; color: #f8fafc; padding: 4px 10px; font-size: 13px; outline: none; width: 140px; margin: 0 4px;";
      const commitName = () => {
        const newLabel = nameInput.value.trim();
        if (newLabel !== (token.label || "")) {
          sessionManager.dispatchOperation({
            opType: "UPDATE_ENTITY",
            id: token.id,
            patch: { label: newLabel } as any
          });
        }
      };
      nameInput.addEventListener("change", commitName);
      nameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          commitName();
          nameInput.blur();
        }
      });
      bar.appendChild(nameInput);

      // Duplicate Button (1 cell right)
      const dupBtn = document.createElement("button");
      dupBtn.className = "btn-glass btn-sm";
      dupBtn.setAttribute("data-tooltip", "Duplicate Token 1 cell to the right");
      dupBtn.innerHTML = "📋 Duplicate";
      dupBtn.addEventListener("click", () => {
        const gridSizePx = doc.canvasSettings.gridSizePx || 50;
        const cloneId = "tok-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
        const clone: TokenEntity = {
          ...token,
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
        engine.setTool("select");
        engine.selectedEntityId = cloneId;
      });
      bar.appendChild(dupBtn);

      // Resize Button next to Duplicate
      const isResizingToken = engine.resizingTokenId === token.id;
      const resizeBtn = document.createElement("button");
      resizeBtn.className = `btn-glass btn-sm ${isResizingToken ? "btn-active" : ""}`;
      resizeBtn.setAttribute("data-tooltip", isResizingToken ? "Click to disable resize handles" : "Click to enable resize handles");
      resizeBtn.innerHTML = isResizingToken ? "📐 Resize ✓" : "📐 Resize";
      resizeBtn.addEventListener("click", () => {
        engine.resizingTokenId = engine.resizingTokenId === token.id ? null : token.id;
        updateBar(token.id);
      });
      bar.appendChild(resizeBtn);

      // Delete Button
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-glass btn-sm btn-danger";
      deleteBtn.setAttribute("data-tooltip", "Delete Token");
      deleteBtn.innerHTML = "🗑️ Delete";
      deleteBtn.addEventListener("click", () => {
        sessionManager.dispatchOperation({
          opType: "DELETE_ENTITY",
          id: token.id
        });
        engine.selectedEntityId = null;
      });
      bar.appendChild(deleteBtn);
      return;
    }

    const title = document.createElement("span");
    title.className = "selection-title";
    title.textContent = ent.type === "image" ? (ent.locked ? "🖼️ Image (Locked)" : "🖼️ Image") : "Entity";
    bar.appendChild(title);

    // Lock / Unlock (anyone can lock or unlock)
    const lockBtn = document.createElement("button");
    lockBtn.className = `btn-glass btn-sm ${ent.locked ? "btn-warn" : ""}`;
    lockBtn.setAttribute("data-tooltip", ent.locked ? "Click to Unlock" : "Click to Lock");
    lockBtn.innerHTML = ent.locked ? "🔓 Unlock" : "🔒 Lock";
    lockBtn.addEventListener("click", () => {
      sessionManager.dispatchOperation({
        opType: "UPDATE_ENTITY",
        id: ent.id,
        patch: { locked: !ent.locked } as any
      });
      updateBar(ent.id);
    });

    if (ent.locked && ent.type === "image") {
      bar.appendChild(lockBtn);
      return;
    }

    // Move to Front
    const frontBtn = document.createElement("button");
    frontBtn.className = "btn-glass btn-sm";
    frontBtn.setAttribute("data-tooltip", "Move to Front");
    frontBtn.innerHTML = "⬆️ Front";
    frontBtn.addEventListener("click", () => {
      const allZ = Object.values(docStore.getDocument().entities).map((e) => e.zIndex);
      const maxZ = Math.max(...allZ, Date.now()) + 10;
      sessionManager.dispatchOperation({
        opType: "UPDATE_ENTITY",
        id: ent.id,
        patch: { zIndex: maxZ, isMap: false } as any
      });
    });
    bar.appendChild(frontBtn);

    // Move to Back
    const backBtn = document.createElement("button");
    backBtn.className = "btn-glass btn-sm";
    backBtn.setAttribute("data-tooltip", "Move to Back");
    backBtn.innerHTML = "⬇️ Back";
    backBtn.addEventListener("click", () => {
      const allZ = Object.values(docStore.getDocument().entities).map((e) => e.zIndex);
      const minZ = Math.min(...allZ, 0) - 10;
      sessionManager.dispatchOperation({
        opType: "UPDATE_ENTITY",
        id: ent.id,
        patch: { zIndex: minZ, isMap: false } as any
      });
    });
    bar.appendChild(backBtn);

    // Set as Map (behind grid)
    if (ent.type === "image") {
      const isMap = Boolean((ent as any).isMap);
      const mapBtn = document.createElement("button");
      mapBtn.className = `btn-glass btn-sm ${isMap ? "btn-active" : ""}`;
      mapBtn.setAttribute("data-tooltip", isMap
        ? "Currently Map Layer behind grid lines (Click to toggle)"
        : "Send to Map Layer behind grid lines"
      );
      mapBtn.innerHTML = isMap ? "🗺️ Map ✓" : "🗺️ Map";
      mapBtn.addEventListener("click", () => {
        const allZ = Object.values(docStore.getDocument().entities).map((e) => e.zIndex);
        const minZ = Math.min(...allZ, 0) - 10;
        sessionManager.dispatchOperation({
          opType: "UPDATE_ENTITY",
          id: ent.id,
          patch: { zIndex: minZ, isMap: !isMap } as any
        });
      });
      bar.appendChild(mapBtn);
    }

    bar.appendChild(lockBtn);

    // Delete
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-glass btn-sm btn-danger";
    deleteBtn.setAttribute("data-tooltip", "Delete Entity");
    deleteBtn.innerHTML = "🗑️ Delete";
    deleteBtn.addEventListener("click", () => {
      sessionManager.dispatchOperation({
        opType: "DELETE_ENTITY",
        id: ent.id
      });
      engine.selectedEntityId = null;
    });
    bar.appendChild(deleteBtn);
  };

  engine.onSelectionChanged((id) => updateBar(id));

  docStore.subscribe(() => {
    updateBar(engine.selectedEntityId);
  });
}
