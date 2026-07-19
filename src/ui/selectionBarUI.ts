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

  let isCondPopoverOpen = false;
  let activeCondContainer: HTMLElement | null = null;
  let activeCondPopover: HTMLElement | null = null;
  let activeCondBtn: HTMLButtonElement | null = null;
  let activeNameInput: HTMLInputElement | null = null;
  let activeMineCheckbox: HTMLInputElement | null = null;
  let activeMineSpan: HTMLSpanElement | null = null;
  let lastSelectedId: string | null = null;
  const conditionCheckboxesMap = new Map<string, HTMLInputElement>();

  window.addEventListener("pointerdown", (e) => {
    if (isCondPopoverOpen && activeCondContainer && activeCondPopover) {
      if (!activeCondContainer.contains(e.target as Node) && !activeCondPopover.contains(e.target as Node)) {
        isCondPopoverOpen = false;
        activeCondPopover.style.display = "none";
      }
    }
  }, true);

  const updateBar = (selectedId: string | null) => {
    const doc = docStore.getDocument();
    const ent = selectedId ? doc.entities[selectedId] : null;

    if ((window as any).vttSimpleMode && (!ent || ent.type !== "token")) {
      bar.style.display = "none";
      if (activeCondPopover && activeCondPopover.parentNode) {
        activeCondPopover.parentNode.removeChild(activeCondPopover);
      }
      lastSelectedId = null;
      isCondPopoverOpen = false;
      document.body.classList.remove("token-selected-in-simple");
      return;
    }

    if (!selectedId || !ent) {
      bar.style.display = "none";
      if (activeCondPopover && activeCondPopover.parentNode) {
        activeCondPopover.parentNode.removeChild(activeCondPopover);
      }
      lastSelectedId = null;
      isCondPopoverOpen = false;
      document.body.classList.remove("token-selected-in-simple");
      return;
    }

    if ((window as any).vttSimpleMode && ent.type === "token") {
      document.body.classList.add("token-selected-in-simple");
    } else {
      document.body.classList.remove("token-selected-in-simple");
    }

    bar.style.display = "flex";

    if (selectedId === lastSelectedId && ent.type === "token" && activeCondPopover) {
      const token = ent as TokenEntity;
      if (activeNameInput && document.activeElement !== activeNameInput) {
        activeNameInput.value = token.label || "";
      }
      const myUsername = sessionManager.myUsername || localStorage.getItem("maury_vtt_username") || "Me";
      const myPeerId = sessionManager.myPeerId || "local";
      const isMine = token.primaryOwnerUsername === myUsername || (doc.primaryTokens?.[myUsername] === token.id);
      if (activeMineCheckbox) activeMineCheckbox.checked = isMine;
      if (activeMineSpan) activeMineSpan.textContent = isMine ? "Mine ✓" : "Mine";

      const activeCondCount = (token.statusEffects || []).length;
      if (activeCondBtn) {
        activeCondBtn.className = `btn-glass btn-sm ${activeCondCount > 0 ? "btn-active" : ""}`;
        activeCondBtn.innerHTML = activeCondCount > 0 ? `🏷️ Conditions (${activeCondCount})` : "🏷️ Conditions";
      }

      for (const [condId, cb] of conditionCheckboxesMap.entries()) {
        cb.checked = (token.statusEffects || []).includes(condId);
      }
      return;
    }

    lastSelectedId = selectedId;
    isCondPopoverOpen = false;
    conditionCheckboxesMap.clear();
    if (activeCondPopover && activeCondPopover.parentNode) {
      activeCondPopover.parentNode.removeChild(activeCondPopover);
    }
    bar.innerHTML = "";

    if (ent.type === "token") {
      const token = ent as TokenEntity;
      const title = document.createElement("span");
      title.className = "selection-title";
      title.textContent = "♟️ Token";
      bar.appendChild(title);

      // Name Input Field
      const nameInput = document.createElement("input");
      activeNameInput = nameInput;
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

      // Mine Button (full button collision area!)
      const myUsername = sessionManager.myUsername || localStorage.getItem("maury_vtt_username") || "Me";
      const myPeerId = sessionManager.myPeerId || "local";
      const isMine = token.primaryOwnerUsername === myUsername || (doc.primaryTokens?.[myUsername] === token.id);

      const mineBtn = document.createElement("button");
      mineBtn.className = `btn-glass btn-sm ${isMine ? "btn-active" : ""}`;
      mineBtn.style.cssText = "display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; margin: 0 4px; border-radius: 8px; padding: 6px 14px; min-height: 32px;";
      mineBtn.setAttribute("data-tooltip", "Claim as your primary token (Each user can have one primary token)");

      const mineCheckbox = document.createElement("input");
      activeMineCheckbox = mineCheckbox;
      mineCheckbox.type = "checkbox";
      mineCheckbox.checked = isMine;
      mineCheckbox.style.cssText = "pointer-events: none; width: 15px; height: 15px; accent-color: #38bdf8;";

      mineBtn.appendChild(mineCheckbox);
      const mineSpan = document.createElement("span");
      activeMineSpan = mineSpan;
      mineSpan.textContent = isMine ? "Mine ✓" : "Mine";
      mineBtn.appendChild(mineSpan);

      mineBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        mineCheckbox.checked = !mineCheckbox.checked;
        if (mineCheckbox.checked) {
          const newOwnerPeerIds = Array.from(new Set([...(token.ownerPeerIds || []), myPeerId]));
          sessionManager.dispatchOperation({
            opType: "UPDATE_ENTITY",
            id: token.id,
            patch: {
              primaryOwnerUsername: myUsername,
              ownerPeerIds: newOwnerPeerIds
            } as any
          });
        } else {
          const filteredPeers = (token.ownerPeerIds || []).filter((id) => id !== myPeerId);
          sessionManager.dispatchOperation({
            opType: "UPDATE_ENTITY",
            id: token.id,
            patch: {
              primaryOwnerUsername: undefined,
              ownerPeerIds: filteredPeers
            } as any
          });
        }
      });

      bar.appendChild(mineBtn);

      // Conditions Selector
      const AVAILABLE_CONDITIONS = [
        { id: "concentrating", label: "🧘 Concentrating" },
        { id: "bloodied", label: "🩸 Bloodied" },
        { id: "restrained", label: "⛓️ Restrained" },
        { id: "stunned", label: "💫 Stunned" },
        { id: "exhausted", label: "🥱 Exhausted" },
        { id: "down", label: "💀 Down" },
        { id: "flying", label: "🪽 Flying" },
        { id: "blessed", label: "✨ Blessed" },
        { id: "blind", label: "🕶️ Blind" },
        { id: "charmed", label: "😍 Charmed" },
        { id: "frightened", label: "😱 Frightened" },
        { id: "drunk", label: "🥴 Drunk" },
        { id: "invisible", label: "🫥 Invisible" },
        { id: "paralyzed", label: "⚡ Paralyzed" },
        { id: "prone", label: "🛌 Prone" },
        { id: "unconscious", label: "😴 Unconscious" },
        { id: "bitchy", label: "💅 Bitchy" },
        { id: "bitchin", label: "🔥 Bitchin'" },
        { id: "inspired", label: "💡 Inspired" },
        { id: "frenzied", label: "💢 Frenzied" },
        { id: "hidden", label: "🥷 Hidden" },
        { id: "hungry", label: "🍗 Hungry" },
        { id: "sleepy", label: "😪 Sleepy" },
        { id: "poisoned", label: "🤢 Poisoned" },
        { id: "confused", label: "❓ Confused" }
      ];

      const condContainer = document.createElement("div");
      activeCondContainer = condContainer;
      condContainer.style.cssText = "position: relative; display: inline-flex; align-items: center; margin: 0 4px;";

      const condBtn = document.createElement("button");
      activeCondBtn = condBtn;
      const activeCondCount = (token.statusEffects || []).length;
      condBtn.className = `btn-glass btn-sm ${activeCondCount > 0 ? "btn-active" : ""}`;
      condBtn.setAttribute("data-tooltip", "Set token status conditions");
      condBtn.innerHTML = activeCondCount > 0 ? `🏷️ Conditions (${activeCondCount})` : "🏷️ Conditions";
      condContainer.appendChild(condBtn);

      const condPopover = document.createElement("div");
      activeCondPopover = condPopover;
      condPopover.className = "conditions-popover";
      condPopover.style.cssText = `
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        bottom: 140px;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(56, 189, 248, 0.45);
        border-radius: 12px;
        padding: 10px;
        display: none;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        width: calc(100vw - 28px);
        max-width: 380px;
        max-height: calc(100vh - 150px);
        overflow-y: auto;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
        z-index: 3500;
      `;

      AVAILABLE_CONDITIONS.forEach((c) => {
        const hasCond = (token.statusEffects || []).includes(c.id);
        const itemLabel = document.createElement("label");
        itemLabel.style.cssText = "display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; font-size: 13px; color: #f8fafc; padding: 4px 6px; border-radius: 6px; transition: background 0.15s;";
        itemLabel.addEventListener("mouseenter", () => itemLabel.style.background = "rgba(56, 189, 248, 0.15)");
        itemLabel.addEventListener("mouseleave", () => itemLabel.style.background = "transparent");

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = hasCond;
        cb.style.cssText = "cursor: pointer; width: 14px; height: 14px; accent-color: #38bdf8;";
        conditionCheckboxesMap.set(c.id, cb);

        cb.addEventListener("change", (e) => {
          e.stopPropagation();
          const currentStatus = new Set(docStore.getDocument().entities[token.id] && (docStore.getDocument().entities[token.id] as TokenEntity).statusEffects || []);
          if (cb.checked) {
            currentStatus.add(c.id);
          } else {
            currentStatus.delete(c.id);
          }
          const nextEffects = Array.from(currentStatus);
          sessionManager.dispatchOperation({
            opType: "UPDATE_ENTITY",
            id: token.id,
            patch: { statusEffects: nextEffects } as any
          });
        });

        itemLabel.appendChild(cb);
        const textSpan = document.createElement("span");
        textSpan.textContent = c.label;
        itemLabel.appendChild(textSpan);
        condPopover.appendChild(itemLabel);
      });

      condBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isCondPopoverOpen) {
          isCondPopoverOpen = false;
          condPopover.style.display = "none";
        } else {
          isCondPopoverOpen = true;
          const barRect = bar.getBoundingClientRect();
          condPopover.style.bottom = (window.innerHeight - barRect.top + 10) + "px";
          condPopover.style.display = "grid";
        }
      });

      document.body.appendChild(condPopover);
      bar.appendChild(condContainer);

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
    syncPrimaryTokenOwnership();
    updateBar(engine.selectedEntityId);
  });
}

export function syncPrimaryTokenOwnership(): void {
  const doc = docStore.getDocument();
  const myUsername = sessionManager.myUsername || localStorage.getItem("maury_vtt_username");
  const myPeerId = sessionManager.myPeerId || "local";
  if (!myUsername || !doc || !doc.entities) return;

  const tokenId = doc.primaryTokens?.[myUsername] || Object.values(doc.entities).find(
    (e) => e.type === "token" && (e as TokenEntity).primaryOwnerUsername === myUsername
  )?.id;

  if (tokenId && doc.entities[tokenId]) {
    const token = doc.entities[tokenId] as TokenEntity;
    if (token && (!token.ownerPeerIds || !token.ownerPeerIds.includes(myPeerId))) {
      const newOwnerPeerIds = Array.from(new Set([...(token.ownerPeerIds || []), myPeerId]));
      sessionManager.dispatchOperation({
        opType: "UPDATE_ENTITY",
        id: token.id,
        patch: { ownerPeerIds: newOwnerPeerIds, primaryOwnerUsername: myUsername } as any
      });
    }
  }
}
