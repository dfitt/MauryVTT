import { docStore } from "../state/documentStore.js";
import { sessionManager } from "../network/sessionManager.js";
import { assetStore } from "../state/idbAssetStore.js";
import { CanvasEngine } from "../canvas/canvasEngine.js";
import { VTTDocument, CharacterSheetData, CharacterEntry, CharacterStats, TokenEntity, ChatMessage } from "../types/vtt.js";
import { triggerQuickRollToChat } from "./chatPanel.js";
import { ALL_ROLL_ICONS } from "./rollIcons.js";

export const SHEET_ICON_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="rgba(56, 189, 248, 0.15)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="12" r="2.2" stroke="currentColor" stroke-width="1.8"/><line x1="14" y1="11" x2="16.5" y2="11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="14" y1="13.5" x2="16.5" y2="13.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="7.5" y1="17.5" x2="16.5" y2="17.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

export function formatTimeAgo(timestamp?: number): string {
  if (!timestamp) return "";
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return `${Math.max(1, diffSec)} second${diffSec === 1 ? "" : "s"} ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) return diffWeek === 1 ? "last week" : `${diffWeek} weeks ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return diffMonth === 1 ? "last month" : `${diffMonth} months ago`;
  const diffYear = Math.floor(diffDay / 365);
  return diffYear <= 1 ? "last year" : `${diffYear} years ago`;
}

export function getAbilityModifier(score?: number): string {
  if (score === undefined || isNaN(score)) return "(+0)";
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `(+${mod})` : `(${mod})`;
}

export function roll3d6(): number {
  return (
    (Math.floor(Math.random() * 6) + 1) +
    (Math.floor(Math.random() * 6) + 1) +
    (Math.floor(Math.random() * 6) + 1)
  );
}

export function getNormalizedCharacters(sheet?: CharacterSheetData): CharacterEntry[] {
  if (!sheet) {
    return [{
      id: "char-1",
      characterName: "",
      hp: "",
      maxHp: "",
      description: "",
      inventory: "",
      notes: "",
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, cha: 10 }
    }];
  }
  if (sheet.characters !== undefined) {
    return sheet.characters;
  }
  return [{
    id: "char-1",
    characterName: sheet.characterName || "",
    description: sheet.description || "",
    inventory: sheet.inventory || "",
    notes: sheet.notes || "",
    hp: sheet.hp !== undefined ? String(sheet.hp) : "",
    maxHp: sheet.maxHp !== undefined ? String(sheet.maxHp) : "",
    hpHistory: sheet.hpHistory || [],
    stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, cha: 10 }
  }];
}

let modalEl: HTMLElement | null = null;
let unsubscribeDocStore: (() => void) | null = null;
let debounceTimer: any = null;
let activePortraitUrls: Map<string, string> = new Map();
let outsideClickListener: ((e: PointerEvent | MouseEvent) => void) | null = null;

export function closeCharacterSheetModal(): void {
  if (outsideClickListener) {
    document.removeEventListener("pointerdown", outsideClickListener);
    outsideClickListener = null;
  }
  if (unsubscribeDocStore) {
    unsubscribeDocStore();
    unsubscribeDocStore = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  activePortraitUrls.forEach((url) => URL.revokeObjectURL(url));
  activePortraitUrls.clear();

  if (modalEl && modalEl.parentNode) {
    modalEl.parentNode.removeChild(modalEl);
  }
  modalEl = null;
}

export function openCharacterSheetModal(engine?: CanvasEngine): void {
  const username = sessionManager.myUsername || localStorage.getItem("maury_vtt_username") || "Me";

  if (modalEl) {
    closeCharacterSheetModal();
    return;
  }

  const doc = docStore.getDocument();
  const rawSheet = doc.characterSheets?.[username] || { username };
  let characters = getNormalizedCharacters(rawSheet);

  modalEl = document.createElement("div");
  modalEl.id = "vtt-character-sheet-modal";
  modalEl.className = "btn-glass";

  const isMobile = window.innerWidth <= 768;
  const isMulti = characters.length > 1;

  const widthStyle = isMobile
    ? "width: 100vw; height: 100vh; max-height: 100vh; border-radius: 0;"
    : isMulti
      ? "width: 980px; max-width: 95vw; max-height: 88vh; border-radius: 16px;"
      : "width: 560px; max-height: 85vh; border-radius: 16px;";

  modalEl.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); ${widthStyle} background: rgba(15, 23, 42, 0.96); backdrop-filter: blur(24px); border: 1px solid rgba(56, 189, 248, 0.4); box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8); display: flex; flex-direction: column; z-index: 10000; overflow: hidden; color: #f8fafc; font-family: inherit; transition: width 0.2s ease, opacity 0.2s ease;`;

  const renderModalContent = () => {
    if (!modalEl) return;
    const currentDoc = docStore.getDocument();
    const sheetData = currentDoc.characterSheets?.[username] || { username };
    characters = getNormalizedCharacters(sheetData);

    const isMultiNow = characters.length > 1;
    if (!isMobile) {
      modalEl.style.width = isMultiNow ? "980px" : "560px";
    }

    const addDisabled = characters.length >= 4;

    const renderBodyContent = () => {
      if (characters.length === 0) {
        return `
          <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; gap: 14px;">
            <span style="font-size: 3.5em; opacity: 0.6;">📜</span>
            <strong style="font-size: 1.25em; color: #cbd5e1;">No Characters on Sheet</strong>
            <span style="font-size: 13px; color: #94a3b8; max-width: 340px; line-height: 1.4;">Click the <strong style="color: #38bdf8;">➕ Add Character</strong> button at the top right to create a new character!</span>
          </div>
        `;
      }

      return characters.map((char, k) => `
        <div class="character-card" data-char-id="${char.id}" style="background: rgba(30, 41, 59, 0.5); padding: 16px; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.25); display: flex; flex-direction: column; gap: 14px; position: relative; box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.25);">
          
          <!-- Delete Button (X) -->
          <button class="delete-char-card-btn" data-char-id="${char.id}" title="Delete Character" style="position: absolute; top: 12px; right: 12px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); color: #f87171; border-radius: 6px; width: 28px; height: 28px; cursor: pointer; font-weight: 800; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; z-index: 5;">✕</button>

          <!-- Card Header Subtitle -->
          <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: -6px;">
            Character #${k + 1}
          </div>

          <!-- Top Row: Portrait, Name & Compact HP -->
          <div style="display: flex; gap: 12px; align-items: center;">
            <!-- Portrait Box -->
            <div class="char-portrait-box" data-char-id="${char.id}" style="width: 64px; height: 64px; flex-shrink: 0; position: relative; display: flex; align-items: center; justify-content: center;">
              <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(56, 189, 248, 0.12); border: 2px dashed rgba(56, 189, 248, 0.4); display: flex; align-items: center; justify-content: center; font-size: 1.6em; color: #38bdf8; box-shadow: inset 0 2px 8px rgba(0,0,0,0.3);" title="Claim a token on the map to display portrait here">👤</div>
            </div>
            
            <!-- Name Input -->
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
              <label style="font-size: 10px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px;">Character Name</label>
              <input class="char-name-input" data-char-id="${char.id}" type="text" value="${char.characterName || ""}" placeholder="e.g. Valen Shadowhunter..." style="width: 100%; padding: 6px 10px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.45); border-radius: 6px; color: #fff; font-size: 1.05em; font-weight: 700; outline: none; box-sizing: border-box;" />
            </div>

            <!-- Compact HP / MAX HP Input -->
            <div style="width: 124px; display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; position: relative;">
              <label style="font-size: 9.5px; font-weight: 800; color: #f43f5e; text-transform: uppercase; letter-spacing: 0.5px;">❤️ HP / MAX</label>
              <div style="display: flex; align-items: center; gap: 3px;">
                <input class="char-hp-input" data-char-id="${char.id}" type="text" value="${char.hp !== undefined ? char.hp : ""}" placeholder="HP" style="width: 50%; padding: 4px 2px; background: rgba(244, 63, 94, 0.12); border: 1.5px solid rgba(244, 63, 94, 0.55); border-radius: 6px; color: #fda4af; font-size: 1em; font-weight: 900; text-align: center; outline: none; box-sizing: border-box;" />
                <span style="color: #f43f5e; font-weight: 900; font-size: 1em;">/</span>
                <input class="char-max-hp-input" data-char-id="${char.id}" type="text" value="${char.maxHp !== undefined ? char.maxHp : ""}" placeholder="Max" style="width: 50%; padding: 4px 2px; background: rgba(244, 63, 94, 0.12); border: 1.5px solid rgba(244, 63, 94, 0.55); border-radius: 6px; color: #fda4af; font-size: 1em; font-weight: 900; text-align: center; outline: none; box-sizing: border-box;" />
              </div>
            </div>
          </div>

          <!-- Compact Stats Display Box (STR, INT, WIS, DEX, CON, CHA) -->
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 6px 10px; display: flex; flex-direction: column; gap: 4px;">
            <div style="font-size: 9.5px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px;">
              📊 Stats & Modifiers
            </div>
            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px;">
              ${(['str', 'int', 'wis', 'dex', 'con', 'cha'] as const).map((statKey) => {
                const val = char.stats?.[statKey] ?? 10;
                const modStr = getAbilityModifier(val);
                return `
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                    <label style="font-size: 9px; font-weight: 800; color: #cbd5e1; text-transform: uppercase;">${statKey}</label>
                    <input class="char-stat-input" data-char-id="${char.id}" data-stat="${statKey}" type="number" value="${val}" style="width: 100%; max-width: 40px; padding: 2px 2px; background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 4px; color: #fff; font-size: 11px; font-weight: 700; text-align: center; outline: none; box-sizing: border-box;" />
                    <span class="stat-mod-label" data-char-id="${char.id}" data-stat="${statKey}" style="font-size: 10px; color: #38bdf8; font-weight: 800;">${modStr}</span>
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <!-- Saved Named Rolls (ONLY SHOWN IF SINGLE CHARACTER) -->
          ${characters.length === 1 ? `
            <div style="background: rgba(15, 23, 42, 0.6); padding: 12px; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.25); display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 11px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px;">🎯 Saved Named Rolls</label>
                <span id="char-sheet-rolls-count" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700;">0 / 8</span>
              </div>
              <div id="char-sheet-rolls-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 6px;">
                <div style="font-size: 11px; color: #64748b; font-style: italic; grid-column: 1 / -1; padding: 4px 0;">No saved Named Rolls yet. Use the Chat+Dice window (/r 1d20+5 #Attack) to create up to 8 saved rolls!</div>
              </div>
            </div>
          ` : ""}

          <!-- 3 Textboxes: Description, Inventory, Notes -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div>
              <label style="font-size: 10.5px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.5px;">📝 Description</label>
              <textarea class="char-desc-input" data-char-id="${char.id}" placeholder="Appearance, ancestry, traits..." rows="2" style="width: 100%; padding: 6px 8px; background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 6px; color: #f8fafc; font-family: inherit; font-size: 12px; resize: vertical; box-sizing: border-box; outline: none;"></textarea>
            </div>
            <div>
              <label style="font-size: 10.5px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.5px;">🎒 Inventory</label>
              <textarea class="char-inv-input" data-char-id="${char.id}" placeholder="Weapons, equipment, gold..." rows="2" style="width: 100%; padding: 6px 8px; background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 6px; color: #f8fafc; font-family: inherit; font-size: 12px; resize: vertical; box-sizing: border-box; outline: none;"></textarea>
            </div>
            <div>
              <label style="font-size: 10.5px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.5px;">📜 Notes</label>
              <textarea class="char-notes-input" data-char-id="${char.id}" placeholder="Abilities, quests, secrets..." rows="2" style="width: 100%; padding: 6px 8px; background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 6px; color: #f8fafc; font-family: inherit; font-size: 12px; resize: vertical; box-sizing: border-box; outline: none;"></textarea>
            </div>
          </div>

        </div>
      `).join("");
    };

    modalEl.innerHTML = `
      <div class="sheet-header" style="padding: 10px 14px 2px 14px; display: flex; align-items: center; justify-content: flex-end; cursor: ${isMobile ? "default" : "move"}; user-select: none; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="add-char-btn" class="btn-glass" title="Add Character (Max 4)" style="padding: 6px 12px; border-radius: 8px; border: 1px solid ${addDisabled ? 'rgba(255,255,255,0.1)' : '#38bdf8'}; background: ${addDisabled ? 'rgba(255,255,255,0.05)' : 'rgba(56, 189, 248, 0.2)'}; color: ${addDisabled ? '#64748b' : '#38bdf8'}; font-size: 13px; font-weight: 800; cursor: ${addDisabled ? 'not-allowed' : 'pointer'}; opacity: ${addDisabled ? 0.5 : 1}; display: flex; align-items: center; gap: 4px;">
            <span>➕ Add Character</span>
            <span style="font-size: 11px; opacity: 0.8;">(${characters.length}/4)</span>
          </button>
          <button id="close-char-sheet-btn" class="btn-glass" title="Close (/sheet)" style="width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.15); background: rgba(255, 255, 255, 0.08); color: #cbd5e1; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">✕</button>
        </div>
      </div>

      <div class="sheet-body" style="padding: 18px; overflow-y: auto; flex: 1; display: grid; grid-template-columns: ${characters.length <= 1 ? '1fr' : 'repeat(2, 1fr)'}; gap: 16px;">
        ${renderBodyContent()}
      </div>
    `;

    bindModalEvents();
  };

  const findClaimedTokenForChar = (doc: VTTDocument, uname: string, char: CharacterEntry): TokenEntity | undefined => {
    if (char.tokenId && doc.entities[char.tokenId]?.type === "token") {
      return doc.entities[char.tokenId] as TokenEntity;
    }
    for (const ent of Object.values(doc.entities)) {
      if (ent.type === "token") {
        const t = ent as TokenEntity;
        if (t.primaryOwnerUsername === uname && t.characterId === char.id) {
          return t;
        }
      }
    }
    if (characters.length === 1) {
      let tokenId = doc.primaryTokens?.[uname];
      if (tokenId && doc.entities[tokenId]?.type === "token") {
        return doc.entities[tokenId] as TokenEntity;
      }
      for (const ent of Object.values(doc.entities)) {
        if (ent.type === "token") {
          const t = ent as TokenEntity;
          if (t.primaryOwnerUsername === uname || t.label === uname || (char.characterName && t.label === char.characterName)) {
            return t;
          }
        }
      }
    }
    return undefined;
  };

  const bindModalEvents = () => {
    if (!modalEl) return;

    const closeBtn = modalEl.querySelector<HTMLButtonElement>("#close-char-sheet-btn");
    if (closeBtn) closeBtn.onclick = () => closeCharacterSheetModal();

    const addBtn = modalEl.querySelector<HTMLButtonElement>("#add-char-btn");
    if (addBtn) {
      addBtn.onclick = () => {
        if (characters.length >= 4) return;
        const currentDoc = docStore.getDocument();
        const sheetData = currentDoc.characterSheets?.[username] || { username };
        const currentChars = getNormalizedCharacters(sheetData);

        // Roll 3d6 for each stat
        const str = roll3d6();
        const int = roll3d6();
        const wis = roll3d6();
        const dex = roll3d6();
        const con = roll3d6();
        const cha = roll3d6();

        const charName = `Character ${currentChars.length + 1}`;
        const newChar: CharacterEntry = {
          id: "char-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          characterName: charName,
          hp: "",
          maxHp: "",
          description: "",
          inventory: "",
          notes: "",
          stats: { str, int, wis, dex, con, cha }
        };

        const updatedChars = [...currentChars, newChar];
        sessionManager.dispatchOperation({
          opType: "UPDATE_CHARACTER_SHEET",
          username,
          sheet: { ...sheetData, username, characters: updatedChars }
        });

        // Broadcast 3d6 rolls to chat
        const modStr = getAbilityModifier(str);
        const modInt = getAbilityModifier(int);
        const modWis = getAbilityModifier(wis);
        const modDex = getAbilityModifier(dex);
        const modCon = getAbilityModifier(con);
        const modCha = getAbilityModifier(cha);

        const rollMsg: ChatMessage = {
          id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          timestamp: Date.now(),
          senderPeerId: sessionManager.myPeerId || "local",
          senderUsername: username,
          content: `🎲 <strong>${username}</strong> created new character <strong>${charName}</strong> (Rolled 3d6 Stats):<br/>` +
            `<strong>STR:</strong> ${str} ${modStr} | <strong>INT:</strong> ${int} ${modInt} | <strong>WIS:</strong> ${wis} ${modWis} | ` +
            `<strong>DEX:</strong> ${dex} ${modDex} | <strong>CON:</strong> ${con} ${modCon} | <strong>CHA:</strong> ${cha} ${modCha}`,
          type: "text"
        };

        sessionManager.dispatchOperation({
          opType: "APPEND_CHAT_MESSAGE",
          message: rollMsg
        });

        renderModalContent();
      };
    }

    // Attach listeners to input fields across all cards
    characters.forEach((char) => {
      const cardEl = modalEl!.querySelector<HTMLElement>(`.character-card[data-char-id="${char.id}"]`);
      if (!cardEl) return;

      const nameInp = cardEl.querySelector<HTMLInputElement>(".char-name-input");
      const hpInp = cardEl.querySelector<HTMLInputElement>(".char-hp-input");
      const maxHpInp = cardEl.querySelector<HTMLInputElement>(".char-max-hp-input");
      const descInp = cardEl.querySelector<HTMLTextAreaElement>(".char-desc-input");
      const invInp = cardEl.querySelector<HTMLTextAreaElement>(".char-inv-input");
      const notesInp = cardEl.querySelector<HTMLTextAreaElement>(".char-notes-input");

      if (nameInp) nameInp.value = char.characterName || "";
      if (hpInp) hpInp.value = char.hp !== undefined ? String(char.hp) : "";
      if (maxHpInp) maxHpInp.value = char.maxHp !== undefined ? String(char.maxHp) : "";
      if (descInp) descInp.value = char.description || "";
      if (invInp) invInp.value = char.inventory || "";
      if (notesInp) notesInp.value = char.notes || "";

      // Attach stat input listeners
      const statInputs = cardEl.querySelectorAll<HTMLInputElement>(".char-stat-input");
      statInputs.forEach((sInp) => {
        const statKey = sInp.getAttribute("data-stat") as keyof CharacterStats;
        if (statKey && char.stats) {
          sInp.value = String(char.stats[statKey] ?? 10);
        }
        sInp.oninput = () => {
          const val = parseInt(sInp.value, 10);
          const modSpan = cardEl.querySelector<HTMLElement>(`.stat-mod-label[data-stat="${statKey}"]`);
          if (modSpan) {
            modSpan.textContent = getAbilityModifier(isNaN(val) ? 10 : val);
          }
          saveCardFields(false);
        };
        sInp.onchange = () => saveCardFields(true);
        sInp.onblur = () => saveCardFields(true);
      });

      const saveCardFields = (flushNow = false) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        const doSave = () => {
          const currentDoc = docStore.getDocument();
          const sheetData = currentDoc.characterSheets?.[username] || { username };
          const currentChars = getNormalizedCharacters(sheetData);

          const updatedChars = currentChars.map((c) => {
            if (c.id === char.id) {
              const statsObj: CharacterStats = { ...c.stats };
              statInputs.forEach((sInp) => {
                const statKey = sInp.getAttribute("data-stat") as keyof CharacterStats;
                const val = parseInt(sInp.value, 10);
                if (statKey) {
                  statsObj[statKey] = isNaN(val) ? 10 : val;
                }
              });

              return {
                ...c,
                characterName: nameInp ? nameInp.value.trim() : c.characterName,
                hp: hpInp ? hpInp.value.trim() : c.hp,
                maxHp: maxHpInp ? maxHpInp.value.trim() : c.maxHp,
                description: descInp ? descInp.value : c.description,
                inventory: invInp ? invInp.value : c.inventory,
                notes: notesInp ? notesInp.value : c.notes,
                stats: statsObj
              };
            }
            return c;
          });

          sessionManager.dispatchOperation({
            opType: "UPDATE_CHARACTER_SHEET",
            username,
            sheet: {
              ...sheetData,
              username,
              characterName: updatedChars[0]?.characterName,
              description: updatedChars[0]?.description,
              inventory: updatedChars[0]?.inventory,
              notes: updatedChars[0]?.notes,
              hp: updatedChars[0]?.hp,
              maxHp: updatedChars[0]?.maxHp,
              characters: updatedChars
            }
          });

          // Sync with claimed token if present
          const tok = findClaimedTokenForChar(currentDoc, username, char);
          if (tok) {
            const tokenPatch: Partial<TokenEntity> = {};
            const newName = nameInp ? nameInp.value.trim() : "";
            if (newName && tok.label !== newName) tokenPatch.label = newName;
            const newHp = hpInp ? hpInp.value.trim() : "";
            if (newHp !== String(tok.hp || "")) tokenPatch.hp = newHp;
            const newMax = maxHpInp ? maxHpInp.value.trim() : "";
            if (newMax !== String(tok.maxHp || "")) tokenPatch.maxHp = newMax;
            const newDesc = descInp ? descInp.value : "";
            if (newDesc !== (tok.description || "")) tokenPatch.description = newDesc;

            if (Object.keys(tokenPatch).length > 0) {
              sessionManager.dispatchOperation({
                opType: "UPDATE_ENTITY",
                id: tok.id,
                patch: tokenPatch as any
              });
            }
          }
        };

        if (flushNow) doSave();
        else debounceTimer = setTimeout(doSave, 400);
      };

      [nameInp, hpInp, maxHpInp, descInp, invInp, notesInp].forEach((inp) => {
        if (inp) {
          inp.oninput = () => saveCardFields(false);
          inp.onchange = () => saveCardFields(true);
          inp.onblur = () => saveCardFields(true);
        }
      });

      // Character Deletion X Button
      const delBtn = cardEl.querySelector<HTMLButtonElement>(".delete-char-card-btn");
      if (delBtn) {
        delBtn.onclick = () => {
          const currentDoc = docStore.getDocument();
          const claimedToken = findClaimedTokenForChar(currentDoc, username, char);
          showDeleteCharacterConfirmationModal(char, claimedToken, () => renderModalContent());
        };
      }

      // Update Portrait & Token click handler
      const pBox = cardEl.querySelector<HTMLElement>(".char-portrait-box");
      if (pBox) {
        const currentDoc = docStore.getDocument();
        const claimedToken = findClaimedTokenForChar(currentDoc, username, char);
        if (claimedToken && engine) {
          const targetTokenId = claimedToken.id;
          const wx = claimedToken.position.x + claimedToken.size.width / 2;
          const wy = claimedToken.position.y + claimedToken.size.height / 2;
          pBox.style.cursor = "pointer";
          pBox.onclick = () => {
            if (isMobile) {
              engine.zoomToWorldPos(wx, wy, targetTokenId);
              closeCharacterSheetModal();
            } else {
              const offsetLeftPx = Math.min(-260, -window.innerWidth * 0.22);
              engine.zoomToWorldPos(wx, wy, targetTokenId, offsetLeftPx);
            }
          };
        }

        if (claimedToken && claimedToken.assetHash) {
          assetStore.getAsset(claimedToken.assetHash).then((blob) => {
            if (blob && pBox) {
              const existingUrl = activePortraitUrls.get(char.id);
              if (existingUrl) URL.revokeObjectURL(existingUrl);
              const url = URL.createObjectURL(blob);
              activePortraitUrls.set(char.id, url);
              pBox.innerHTML = `<img src="${url}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2.5px solid #38bdf8; box-shadow: 0 4px 16px rgba(56, 189, 248, 0.45); background: #0f172a;" title="Click to zoom to token (${claimedToken.label || username}) on map" />`;
            }
          });
        }
      }
    });

    if (characters.length === 1) {
      const currentDoc = docStore.getDocument();
      renderSheetRolls(currentDoc, username);
    }
  };

  const renderSheetRolls = (doc: VTTDocument, uname: string) => {
    const container = modalEl?.querySelector<HTMLElement>("#char-sheet-rolls-container");
    const countEl = modalEl?.querySelector<HTMLElement>("#char-sheet-rolls-count");
    if (!container || !countEl) return;

    const list = (doc.quickRolls?.[uname] || []).slice(0, 8);
    countEl.textContent = `${list.length} / 8`;

    if (list.length === 0) {
      container.innerHTML = `<div style="font-size: 11px; color: #64748b; font-style: italic; grid-column: 1 / -1; padding: 4px 0;">No saved Named Rolls yet. Use the Chat+Dice window (/r 1d20+5 #Attack) to create up to 8 saved rolls!</div>`;
      return;
    }

    container.innerHTML = list
      .map(
        (qr, idx) => `
          <button class="btn-glass sheet-quickroll-btn" data-idx="${idx}" title="Click to roll ${qr.label} (${qr.expr})" style="padding: 6px 10px; font-size: 12px; display: flex; align-items: center; gap: 6px; border: 1px solid rgba(56, 189, 248, 0.4); background: rgba(15, 23, 42, 0.85); border-radius: 6px; color: #f8fafc; cursor: pointer; text-align: left;">
            <span style="color: #38bdf8; font-size: 1.2em; flex-shrink: 0;">${qr.icon || ALL_ROLL_ICONS[0]}</span>
            <div style="overflow: hidden;">
              <div style="font-weight: 700; color: ${qr.isDamage ? '#fda4af' : '#f8fafc'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${qr.isDamage ? '⚔️ ' : ''}${qr.label}</div>
              <div style="color: #94a3b8; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${qr.expr}</div>
            </div>
          </button>
        `
      )
      .join("");

    container.querySelectorAll<HTMLButtonElement>(".sheet-quickroll-btn").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute("data-idx") || "0", 10);
        const qr = list[idx];
        if (qr) triggerQuickRollToChat(qr, engine);
      };
    });
  };

  renderModalContent();
  document.body.appendChild(modalEl);

  if (!outsideClickListener) {
    outsideClickListener = (e: PointerEvent | MouseEvent) => {
      if (!modalEl) return;
      if (!modalEl.contains(e.target as Node)) {
        const targetEl = e.target as HTMLElement;
        if (targetEl && targetEl.closest && (targetEl.closest("[data-tooltip*='Character Sheet']") || targetEl.closest("#btn-simple-sheet") || targetEl.closest("#vtt-delete-char-modal"))) {
          return;
        }
        closeCharacterSheetModal();
      }
    };
    setTimeout(() => {
      if (outsideClickListener && modalEl) {
        document.addEventListener("pointerdown", outsideClickListener);
      }
    }, 0);
  }

  // Subscribe to document updates
  unsubscribeDocStore = docStore.subscribe((doc) => {
    if (!modalEl) return;
    const uname = sessionManager.myUsername || localStorage.getItem("maury_vtt_username") || "Me";
    const sheetData = doc.characterSheets?.[uname] || { username: uname };
    const currentChars = getNormalizedCharacters(sheetData);

    currentChars.forEach((char) => {
      const cardEl = modalEl!.querySelector<HTMLElement>(`.character-card[data-char-id="${char.id}"]`);
      if (!cardEl) return;

      const nameInp = cardEl.querySelector<HTMLInputElement>(".char-name-input");
      const hpInp = cardEl.querySelector<HTMLInputElement>(".char-hp-input");
      const maxHpInp = cardEl.querySelector<HTMLInputElement>(".char-max-hp-input");
      const descInp = cardEl.querySelector<HTMLTextAreaElement>(".char-desc-input");
      const invInp = cardEl.querySelector<HTMLTextAreaElement>(".char-inv-input");
      const notesInp = cardEl.querySelector<HTMLTextAreaElement>(".char-notes-input");

      const claimedTok = findClaimedTokenForChar(doc, uname, char);
      let displayHp = char.hp !== undefined ? String(char.hp || "") : "";
      if (claimedTok && claimedTok.hp !== undefined && String(claimedTok.hp) !== "") {
        displayHp = String(claimedTok.hp);
      }
      let displayMax = char.maxHp !== undefined ? String(char.maxHp || "") : "";
      if (claimedTok && claimedTok.maxHp !== undefined && String(claimedTok.maxHp) !== "") {
        displayMax = String(claimedTok.maxHp);
      }

      if (nameInp && document.activeElement !== nameInp && nameInp.value !== (char.characterName || "")) {
        nameInp.value = char.characterName || "";
      }
      if (hpInp && document.activeElement !== hpInp && hpInp.value !== displayHp) {
        hpInp.value = displayHp;
      }
      if (maxHpInp && document.activeElement !== maxHpInp && maxHpInp.value !== displayMax) {
        maxHpInp.value = displayMax;
      }
      if (descInp && document.activeElement !== descInp && descInp.value !== (char.description || "")) {
        descInp.value = char.description || "";
      }
      if (invInp && document.activeElement !== invInp && invInp.value !== (char.inventory || "")) {
        invInp.value = char.inventory || "";
      }
      if (notesInp && document.activeElement !== notesInp && notesInp.value !== (char.notes || "")) {
        notesInp.value = char.notes || "";
      }
    });

    if (currentChars.length === 1) {
      renderSheetRolls(doc, uname);
    }
  });
}

function showDeleteCharacterConfirmationModal(
  char: CharacterEntry,
  claimedToken: TokenEntity | undefined,
  onComplete: () => void
): void {
  const username = sessionManager.myUsername || localStorage.getItem("maury_vtt_username") || "Me";
  const existingModal = document.getElementById("vtt-delete-char-modal");
  if (existingModal) existingModal.remove();

  const overlay = document.createElement("div");
  overlay.id = "vtt-delete-char-modal";
  overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 100001;";

  const box = document.createElement("div");
  box.className = "btn-glass";
  box.style.cssText = "background: rgba(15, 23, 42, 0.98); border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 14px; padding: 20px 24px; width: 440px; max-width: 90vw; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.9); color: #f8fafc;";

  const hasToken = Boolean(claimedToken);
  const charDisplayName = char.characterName || "this character";

  box.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 1.5em; color: #ef4444;">⚠️</span>
      <strong style="font-size: 1.15em; color: #f87171;">Delete ${charDisplayName}?</strong>
    </div>
    <div style="font-size: 13px; color: #cbd5e1; line-height: 1.5;">
      Are you sure you want to remove <strong>${charDisplayName}</strong> from your character sheet?
      ${hasToken ? `<br/><span style="color: #fda4af; font-size: 12px;">(This character currently has a claimed token on the map: "${claimedToken?.label || charDisplayName}")</span>` : ""}
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
      ${hasToken ? `
        <button id="btn-del-char-and-token" class="btn-glass" style="padding: 10px; border-radius: 8px; background: rgba(239, 68, 68, 0.25); border: 1px solid #ef4444; color: #ffffff; font-weight: 800; cursor: pointer; text-align: center;">
          🗑️ Clear Character and Delete Token
        </button>
      ` : ""}
      <button id="btn-del-char-only" class="btn-glass" style="padding: 10px; border-radius: 8px; background: rgba(56, 189, 248, 0.18); border: 1px solid #38bdf8; color: #ffffff; font-weight: 700; cursor: pointer; text-align: center;">
        🧹 Clear Character
      </button>
      <button id="btn-del-cancel" class="btn-glass" style="padding: 8px; border-radius: 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); color: #cbd5e1; font-weight: 600; cursor: pointer; text-align: center;">
        Cancel
      </button>
    </div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const doRemoveCharacter = (deleteToken: boolean) => {
    const currentDoc = docStore.getDocument();
    const sheetData = currentDoc.characterSheets?.[username] || { username };
    let currentChars = getNormalizedCharacters(sheetData);

    if (deleteToken && claimedToken) {
      sessionManager.dispatchOperation({
        opType: "DELETE_ENTITY",
        id: claimedToken.id
      });
    } else if (claimedToken) {
      // Unclaim token
      sessionManager.dispatchOperation({
        opType: "UPDATE_ENTITY",
        id: claimedToken.id,
        patch: {
          primaryOwnerUsername: undefined,
          characterId: undefined
        } as any
      });
    }

    currentChars = currentChars.filter((c) => c.id !== char.id);

    sessionManager.dispatchOperation({
      opType: "UPDATE_CHARACTER_SHEET",
      username,
      sheet: {
        ...sheetData,
        username,
        characterName: currentChars[0]?.characterName || "",
        description: currentChars[0]?.description || "",
        inventory: currentChars[0]?.inventory || "",
        notes: currentChars[0]?.notes || "",
        hp: currentChars[0]?.hp !== undefined ? currentChars[0].hp : "",
        maxHp: currentChars[0]?.maxHp !== undefined ? currentChars[0].maxHp : "",
        characters: currentChars
      }
    });

    overlay.remove();
    onComplete();
  };

  const delTokenBtn = box.querySelector<HTMLButtonElement>("#btn-del-char-and-token");
  if (delTokenBtn) {
    delTokenBtn.onclick = () => doRemoveCharacter(true);
  }

  const delCharBtn = box.querySelector<HTMLButtonElement>("#btn-del-char-only");
  if (delCharBtn) {
    delCharBtn.onclick = () => doRemoveCharacter(false);
  }

  const cancelBtn = box.querySelector<HTMLButtonElement>("#btn-del-cancel");
  if (cancelBtn) {
    cancelBtn.onclick = () => overlay.remove();
  }
}
