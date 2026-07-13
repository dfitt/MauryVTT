import { CanvasEngine } from "../canvas/canvasEngine.js";
import { docStore } from "../state/documentStore.js";
import { sessionManager } from "../network/sessionManager.js";

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

    const title = document.createElement("span");
    title.className = "selection-title";
    title.textContent = ent.type === "image" ? "🖼️ Image" : ent.type === "token" ? "♟️ Token" : "Entity";
    bar.appendChild(title);

    // Move to Front
    const frontBtn = document.createElement("button");
    frontBtn.className = "btn-glass btn-sm";
    frontBtn.title = "Move to Front";
    frontBtn.innerHTML = "⬆️ Front";
    frontBtn.addEventListener("click", () => {
      const allZ = Object.values(docStore.getDocument().entities).map((e) => e.zIndex);
      const maxZ = Math.max(...allZ, Date.now()) + 10;
      sessionManager.dispatchOperation({
        opType: "UPDATE_ENTITY",
        id: ent.id,
        patch: { zIndex: maxZ } as any
      });
    });
    bar.appendChild(frontBtn);

    // Move to Back
    const backBtn = document.createElement("button");
    backBtn.className = "btn-glass btn-sm";
    backBtn.title = "Move to Back";
    backBtn.innerHTML = "⬇️ Back";
    backBtn.addEventListener("click", () => {
      const allZ = Object.values(docStore.getDocument().entities).map((e) => e.zIndex);
      const minZ = Math.min(...allZ, 0) - 10;
      sessionManager.dispatchOperation({
        opType: "UPDATE_ENTITY",
        id: ent.id,
        patch: { zIndex: minZ } as any
      });
    });
    bar.appendChild(backBtn);

    // Lock / Unlock (anyone can lock or unlock)
    const lockBtn = document.createElement("button");
    lockBtn.className = `btn-glass btn-sm ${ent.locked ? "btn-warn" : ""}`;
    lockBtn.title = ent.locked ? "Click to Unlock" : "Click to Lock";
    lockBtn.innerHTML = ent.locked ? "🔓 Unlock" : "🔒 Lock";
    lockBtn.addEventListener("click", () => {
      sessionManager.dispatchOperation({
        opType: "UPDATE_ENTITY",
        id: ent.id,
        patch: { locked: !ent.locked } as any
      });
      updateBar(ent.id);
    });
    bar.appendChild(lockBtn);

    // Delete
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-glass btn-sm btn-danger";
    deleteBtn.title = "Delete Entity";
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
