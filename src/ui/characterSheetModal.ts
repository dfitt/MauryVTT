import { docStore } from "../state/documentStore.js";
import { sessionManager } from "../network/sessionManager.js";
import { assetStore } from "../state/idbAssetStore.js";
import { CanvasEngine } from "../canvas/canvasEngine.js";
import { VTTDocument, CharacterSheetData, TokenEntity } from "../types/vtt.js";
import { triggerQuickRollToChat } from "./chatPanel.js";
import { ALL_ROLL_ICONS } from "./rollIcons.js";

export const SHEET_ICON_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="rgba(56, 189, 248, 0.15)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="12" r="2.2" stroke="currentColor" stroke-width="1.8"/><line x1="14" y1="11" x2="16.5" y2="11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="14" y1="13.5" x2="16.5" y2="13.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="7.5" y1="17.5" x2="16.5" y2="17.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

let modalEl: HTMLElement | null = null;
let unsubscribeDocStore: (() => void) | null = null;
let debounceTimer: any = null;
let currentPortraitUrl: string | null = null;

export function closeCharacterSheetModal(): void {
  if (unsubscribeDocStore) {
    unsubscribeDocStore();
    unsubscribeDocStore = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (currentPortraitUrl) {
    URL.revokeObjectURL(currentPortraitUrl);
    currentPortraitUrl = null;
  }
  if (modalEl && modalEl.parentNode) {
    modalEl.parentNode.removeChild(modalEl);
  }
  modalEl = null;
}

export function openCharacterSheetModal(engine?: CanvasEngine): void {
  const username = sessionManager.myUsername || localStorage.getItem("maury_vtt_username") || "Me";

  if (modalEl) {
    // Bring to front and update
    modalEl.style.display = "flex";
    return;
  }

  modalEl = document.createElement("div");
  modalEl.id = "vtt-character-sheet-modal";
  modalEl.className = "btn-glass";

  const isMobile = window.innerWidth <= 768;

  modalEl.style.cssText = isMobile
    ? "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; max-height: 100vh; border-radius: 0; background: rgba(15, 23, 42, 0.98); backdrop-filter: blur(20px); border: none; box-shadow: none; display: flex; flex-direction: column; z-index: 10000; overflow: hidden; color: #f8fafc; font-family: inherit;"
    : "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 560px; max-height: 85vh; border-radius: 16px; background: rgba(15, 23, 42, 0.96); backdrop-filter: blur(24px); border: 1px solid rgba(56, 189, 248, 0.4); box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8); display: flex; flex-direction: column; z-index: 10000; overflow: hidden; color: #f8fafc; font-family: inherit; transition: opacity 0.2s ease;";

  modalEl.innerHTML = `
    <div class="sheet-header" style="padding: 14px 18px; background: rgba(30, 41, 59, 0.85); border-bottom: 1px solid rgba(56, 189, 248, 0.25); display: flex; align-items: center; justify-content: space-between; cursor: ${isMobile ? "default" : "move"}; user-select: none; flex-shrink: 0;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.35em;">📜</span>
        <div>
          <strong style="font-size: 1.15em; color: #38bdf8; font-weight: 800; letter-spacing: 0.3px;">Character Sheet</strong>
          <div style="font-size: 11px; color: #94a3b8; font-weight: 500;">User account: <span id="char-sheet-username-display" style="color: #e2e8f0; font-weight: 700;">${username}</span></div>
        </div>
      </div>
      <button id="close-char-sheet-btn" class="btn-glass" title="Close (/sheet)" style="width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.15); background: rgba(255, 255, 255, 0.08); color: #cbd5e1; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">✕</button>
    </div>

    <div class="sheet-body" style="padding: 18px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 18px;">
      
      <!-- Top Section: Portrait & Character Name -->
      <div style="display: flex; gap: 16px; align-items: center; background: rgba(30, 41, 59, 0.5); padding: 16px; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.25); box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.25);">
        <!-- Portrait Box -->
        <div id="char-sheet-portrait-box" style="width: 84px; height: 84px; flex-shrink: 0; position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="width: 84px; height: 84px; border-radius: 50%; background: rgba(56, 189, 248, 0.12); border: 2px dashed rgba(56, 189, 248, 0.4); display: flex; align-items: center; justify-content: center; font-size: 2.2em; color: #38bdf8; box-shadow: inset 0 2px 8px rgba(0,0,0,0.3);" title="Claim a token on the map to display portrait here">👤</div>
        </div>
        <!-- Name Input -->
        <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
          <label for="char-sheet-name" style="font-size: 11px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.6px;">Character Name</label>
          <input id="char-sheet-name" type="text" placeholder="e.g. Valen Shadowhunter..." style="width: 100%; padding: 10px 14px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.45); border-radius: 8px; color: #fff; font-size: 1.25em; font-weight: 700; outline: none; box-sizing: border-box; transition: border-color 0.2s;" />
        </div>
        <!-- HP Input -->
        <div style="width: 115px; display: flex; flex-direction: column; gap: 6px; flex-shrink: 0;">
          <label for="char-sheet-hp" style="font-size: 11px; font-weight: 800; color: #f43f5e; text-transform: uppercase; letter-spacing: 0.6px; display: flex; align-items: center; gap: 4px;"><span>❤️ HP</span></label>
          <input id="char-sheet-hp" type="text" placeholder="HP..." style="width: 100%; padding: 10px 10px; background: rgba(244, 63, 94, 0.12); border: 1.5px solid rgba(244, 63, 94, 0.55); border-radius: 8px; color: #fda4af; font-size: 1.25em; font-weight: 900; text-align: center; outline: none; box-sizing: border-box; transition: border-color 0.2s; box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.3);" />
        </div>
      </div>

      <!-- Saved Named Rolls -->
      <div style="background: rgba(30, 41, 59, 0.5); padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.25); display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <label style="font-size: 12px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px;">
            <span>🎯 Saved Named Rolls</span>
            <span id="char-sheet-rolls-count" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;">0 / 12</span>
          </label>
          <span style="font-size: 11px; color: #94a3b8; font-style: italic;">Click any roll to send directly to chat</span>
        </div>
        <div id="char-sheet-rolls-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px;">
          <div style="font-size: 12px; color: #64748b; font-style: italic; grid-column: 1 / -1; padding: 6px 0;">No saved Named Rolls yet. Use the Chat+Dice window (/r 1d20+5 #Attack) to create up to 12 saved rolls!</div>
        </div>
      </div>

      <!-- 3 Editable Text Boxes: Description, Inventory, Notes -->
      <div style="display: flex; flex-direction: column; gap: 16px;">
        
        <!-- Description -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label for="char-sheet-desc" style="font-size: 12px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.5px;">📝 Description</label>
          <textarea id="char-sheet-desc" placeholder="Character appearance, ancestry, class traits, backstory..." rows="3" style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; color: #f8fafc; font-family: inherit; font-size: 13.5px; line-height: 1.5; resize: vertical; box-sizing: border-box; outline: none; transition: border-color 0.2s;"></textarea>
        </div>

        <!-- Inventory -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label for="char-sheet-inv" style="font-size: 12px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.5px;">🎒 Inventory</label>
          <textarea id="char-sheet-inv" placeholder="Weapons, armor, equipment, magical items, gold & currency..." rows="4" style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; color: #f8fafc; font-family: inherit; font-size: 13.5px; line-height: 1.5; resize: vertical; box-sizing: border-box; outline: none; transition: border-color 0.2s;"></textarea>
        </div>

        <!-- Notes -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label for="char-sheet-notes" style="font-size: 12px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.5px;">📜 Notes</label>
          <textarea id="char-sheet-notes" placeholder="Spells prepared, abilities, quest logs, party notes, secrets..." rows="4" style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; color: #f8fafc; font-family: inherit; font-size: 13.5px; line-height: 1.5; resize: vertical; box-sizing: border-box; outline: none; transition: border-color 0.2s;"></textarea>
        </div>

      </div>

    </div>
  `;

  document.body.appendChild(modalEl);

  const closeBtn = modalEl.querySelector<HTMLButtonElement>("#close-char-sheet-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => closeCharacterSheetModal());
  }

  // Handle dragging on desktop
  if (!isMobile) {
    const headerEl = modalEl.querySelector<HTMLElement>(".sheet-header");
    if (headerEl) {
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let startLeft = 0;
      let startTop = 0;

      headerEl.addEventListener("mousedown", (e) => {
        if ((e.target as HTMLElement).tagName === "BUTTON") return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = modalEl!.getBoundingClientRect();
        startLeft = rect.left + rect.width / 2;
        startTop = rect.top + rect.height / 2;
        e.preventDefault();
      });

      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging || !modalEl) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        modalEl.style.left = `${startLeft + dx}px`;
        modalEl.style.top = `${startTop + dy}px`;
        modalEl.style.transform = "translate(-50%, -50%)";
      };

      const onMouseUp = () => {
        isDragging = false;
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }
  }

  // Handle window resize between mobile and desktop
  window.addEventListener("resize", () => {
    if (!modalEl) return;
    const mobileNow = window.innerWidth <= 768;
    const header = modalEl.querySelector<HTMLElement>(".sheet-header");
    if (mobileNow) {
      modalEl.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; max-height: 100vh; border-radius: 0; background: rgba(15, 23, 42, 0.98); backdrop-filter: blur(20px); border: none; box-shadow: none; display: flex; flex-direction: column; z-index: 10000; overflow: hidden; color: #f8fafc; font-family: inherit;";
      if (header) header.style.cursor = "default";
    } else if (modalEl.style.width === "100vw") {
      modalEl.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 560px; max-height: 85vh; border-radius: 16px; background: rgba(15, 23, 42, 0.96); backdrop-filter: blur(24px); border: 1px solid rgba(56, 189, 248, 0.4); box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8); display: flex; flex-direction: column; z-index: 10000; overflow: hidden; color: #f8fafc; font-family: inherit; transition: opacity 0.2s ease;";
      if (header) header.style.cursor = "move";
    }
  });

  const nameInput = modalEl.querySelector<HTMLInputElement>("#char-sheet-name")!;
  const hpInput = modalEl.querySelector<HTMLInputElement>("#char-sheet-hp")!;
  const descInput = modalEl.querySelector<HTMLTextAreaElement>("#char-sheet-desc")!;
  const invInput = modalEl.querySelector<HTMLTextAreaElement>("#char-sheet-inv")!;
  const notesInput = modalEl.querySelector<HTMLTextAreaElement>("#char-sheet-notes")!;
  const rollsContainer = modalEl.querySelector<HTMLElement>("#char-sheet-rolls-container")!;
  const rollsCountEl = modalEl.querySelector<HTMLElement>("#char-sheet-rolls-count")!;
  const portraitBox = modalEl.querySelector<HTMLElement>("#char-sheet-portrait-box")!;

  const findMyClaimedToken = (doc: VTTDocument, uname: string): TokenEntity | undefined => {
    let tokenId = doc.primaryTokens?.[uname];
    if (tokenId) {
      const e = doc.entities[tokenId];
      if (e && e.type === "token") return e as TokenEntity;
    }
    const sheetName = doc.characterSheets?.[uname]?.characterName;
    for (const ent of Object.values(doc.entities)) {
      if (ent.type === "token") {
        const t = ent as TokenEntity;
        if (t.primaryOwnerUsername === uname || t.label === uname || (sheetName && t.label === sheetName)) {
          if (t.ownerPeerIds?.includes(sessionManager.myPeerId || "") || t.primaryOwnerUsername === uname || !t.primaryOwnerUsername) {
            return t;
          }
        }
      }
    }
    return undefined;
  };

  const saveSheetFields = (flushNow = false) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    const doSave = () => {
      const uname = sessionManager.myUsername || localStorage.getItem("maury_vtt_username") || "Me";
      const currentDoc = docStore.getDocument();
      const existing = currentDoc.characterSheets?.[uname] || { username: uname };

      const patch: CharacterSheetData = {
        username: uname,
        characterName: nameInput.value.trim(),
        description: descInput.value,
        inventory: invInput.value,
        notes: notesInput.value,
        hp: hpInput.value.trim()
      };

      // Only dispatch if something changed
      if (
        patch.characterName !== (existing.characterName || "") ||
        patch.description !== (existing.description || "") ||
        patch.inventory !== (existing.inventory || "") ||
        patch.notes !== (existing.notes || "") ||
        (patch.hp || "") !== (existing.hp || "")
      ) {
        sessionManager.dispatchOperation({
          opType: "UPDATE_CHARACTER_SHEET",
          username: uname,
          sheet: patch
        });
      }

      // Synchronize with claimed token
      const tokenEnt = findMyClaimedToken(currentDoc, uname);
      if (tokenEnt) {
        const tokenPatch: Partial<TokenEntity> = {};
        if (patch.characterName && patch.characterName.trim() !== "" && (!tokenEnt.label || tokenEnt.label.trim() === "" || tokenEnt.label === uname)) {
          tokenPatch.label = patch.characterName.trim();
        }
        if (patch.hp !== undefined && String(patch.hp || "") !== String(tokenEnt.hp || "")) {
          tokenPatch.hp = patch.hp;
          const numHp = Number(patch.hp);
          if (!isNaN(numHp) && numHp > (tokenEnt.maxHp || 0)) {
            tokenPatch.maxHp = numHp;
          }
        }
        if (Object.keys(tokenPatch).length > 0) {
          sessionManager.dispatchOperation({
            opType: "UPDATE_ENTITY",
            id: tokenEnt.id,
            patch: tokenPatch as any
          });
        }
      }
    };

    if (flushNow) {
      doSave();
    } else {
      debounceTimer = setTimeout(doSave, 400);
    }
  };

  [nameInput, descInput, invInput, notesInput, hpInput].forEach((el) => {
    el.addEventListener("input", () => saveSheetFields(false));
    el.addEventListener("change", () => saveSheetFields(true));
    el.addEventListener("blur", () => saveSheetFields(true));
  });

  const updatePortrait = async (doc: VTTDocument, uname: string) => {
    const tokenEnt = findMyClaimedToken(doc, uname);
    if (tokenEnt && engine) {
      const targetTokenId = tokenEnt.id;
      const wx = tokenEnt.position.x + tokenEnt.size.width / 2;
      const wy = tokenEnt.position.y + tokenEnt.size.height / 2;
      portraitBox.style.cursor = "pointer";
      portraitBox.onclick = () => {
        engine.zoomToWorldPos(wx, wy, targetTokenId);
        closeCharacterSheetModal();
      };
    } else {
      portraitBox.style.cursor = "default";
      portraitBox.onclick = null;
    }

    if (tokenEnt && tokenEnt.assetHash) {
      const blob = await assetStore.getAsset(tokenEnt.assetHash);
      if (blob) {
        if (currentPortraitUrl) URL.revokeObjectURL(currentPortraitUrl);
        currentPortraitUrl = URL.createObjectURL(blob);
        portraitBox.innerHTML = `<img src="${currentPortraitUrl}" style="width: 84px; height: 84px; border-radius: 50%; object-fit: cover; border: 2.5px solid #38bdf8; box-shadow: 0 4px 16px rgba(56, 189, 248, 0.45); background: #0f172a;" title="Click to zoom to token (${tokenEnt.label || uname}) on map" />`;
        return;
      }
    }

    // Fallback silhouette if no claimed token or asset
    if (currentPortraitUrl) {
      URL.revokeObjectURL(currentPortraitUrl);
      currentPortraitUrl = null;
    }
    const fallbackTitle = tokenEnt && engine ? `Click to zoom to token (${tokenEnt.label || uname}) on map` : "Claim a token on the map to display portrait here";
    portraitBox.innerHTML = `<div style="width: 84px; height: 84px; border-radius: 50%; background: rgba(56, 189, 248, 0.12); border: 2px dashed rgba(56, 189, 248, 0.4); display: flex; align-items: center; justify-content: center; font-size: 2.2em; color: #38bdf8; box-shadow: inset 0 2px 8px rgba(0,0,0,0.3);" title="${fallbackTitle}">👤</div>`;
  };

  const renderSheetRolls = (doc: VTTDocument, uname: string) => {
    const list = doc.quickRolls?.[uname] || [];
    rollsCountEl.textContent = `${list.length} / 12`;

    if (list.length === 0) {
      rollsContainer.innerHTML = `<div style="font-size: 12px; color: #64748b; font-style: italic; grid-column: 1 / -1; padding: 6px 0;">No saved Named Rolls yet. Use the Chat+Dice window (/r 1d20+5 #Attack) to create up to 12 saved rolls!</div>`;
      return;
    }

    rollsContainer.innerHTML = list
      .map(
        (qr, idx) => `
          <button class="btn-glass sheet-quickroll-btn" data-idx="${idx}" title="Click to roll ${qr.label} (${qr.expr})" style="padding: 8px 12px; font-size: 13px; display: flex; align-items: center; gap: 8px; border: 1px solid rgba(56, 189, 248, 0.4); background: rgba(15, 23, 42, 0.85); border-radius: 8px; color: #f8fafc; cursor: pointer; text-align: left; transition: all 0.15s ease; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
            <span style="color: #38bdf8; font-size: 1.3em; flex-shrink: 0;">${qr.icon || ALL_ROLL_ICONS[0]}</span>
            <div style="overflow: hidden;">
              <div style="font-weight: 700; color: ${qr.isDamage ? '#fda4af' : '#f8fafc'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${qr.isDamage ? '⚔️ ' : ''}${qr.label}</div>
              <div style="color: #94a3b8; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${qr.expr}</div>
            </div>
          </button>
        `
      )
      .join("");

    rollsContainer.querySelectorAll<HTMLButtonElement>(".sheet-quickroll-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute("data-idx") || "0", 10);
        const qr = list[idx];
        if (qr) {
          triggerQuickRollToChat(qr, engine);
        }
      });
    });
  };

  // Subscribe to document updates
  unsubscribeDocStore = docStore.subscribe((doc) => {
    if (!modalEl) return;
    const uname = sessionManager.myUsername || localStorage.getItem("maury_vtt_username") || "Me";
    const sheet = doc.characterSheets?.[uname] || { username: uname };

    if (document.activeElement !== nameInput && nameInput.value !== (sheet.characterName || "")) {
      nameInput.value = sheet.characterName || "";
    }
    const tokenEnt = findMyClaimedToken(doc, uname);
    let displayHp = sheet.hp !== undefined ? String(sheet.hp || "") : "";
    if (tokenEnt && tokenEnt.hp !== undefined && tokenEnt.hp !== "" && String(tokenEnt.hp) !== displayHp) {
      displayHp = String(tokenEnt.hp);
    }
    if (document.activeElement !== hpInput && hpInput.value !== displayHp) {
      hpInput.value = displayHp;
    }
    if (document.activeElement !== descInput && descInput.value !== (sheet.description || "")) {
      descInput.value = sheet.description || "";
    }
    if (document.activeElement !== invInput && invInput.value !== (sheet.inventory || "")) {
      invInput.value = sheet.inventory || "";
    }
    if (document.activeElement !== notesInput && notesInput.value !== (sheet.notes || "")) {
      notesInput.value = sheet.notes || "";
    }

    renderSheetRolls(doc, uname);
    updatePortrait(doc, uname);
  });
}
