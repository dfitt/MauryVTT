import { CanvasEngine } from "../canvas/canvasEngine.js";
import { docStore } from "../state/documentStore.js";
import { sessionManager } from "../network/sessionManager.js";
import { TokenEntity } from "../types/vtt.js";
import { formatTimeAgo } from "./characterSheetModal.js";
import { openConditionGenerateModal } from "./conditionAiModal.js";

export const BASE_CONDITIONS: { id: string; label: string }[] = [
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

export function arrangeItemsForBottomUpGrid<T>(pageItems: T[]): T[] {
  const M = pageItems.length;
  if (M <= 1) return [...pageItems];

  const R = Math.ceil(M / 2);
  const domArray: T[] = new Array(M);

  for (let k = 0; k < M; k++) {
    const bRow = Math.floor(k / 2); // 0-indexed row from bottom
    const row = (R - 1) - bRow;     // 0-indexed row from top
    const col = k % 2;              // 0 = left, 1 = right

    let domIndex: number;
    if (M % 2 === 0) {
      domIndex = row * 2 + col;
    } else {
      if (row === 0) {
        domIndex = 0;
      } else {
        domIndex = row * 2 + col - 1;
      }
    }
    domArray[domIndex] = pageItems[k];
  }
  return domArray;
}

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

  let isDescPopoverOpen = false;
  let activeDescContainer: HTMLElement | null = null;
  let activeDescPopover: HTMLElement | null = null;
  let activeDescBtn: HTMLButtonElement | null = null;
  let activeDescTextarea: HTMLTextAreaElement | null = null;

  let activeNameInput: HTMLInputElement | null = null;
  let activeHpInput: HTMLInputElement | null = null;
  let activeMaxHpInput: HTMLInputElement | null = null;
  let activeMineCheckbox: HTMLInputElement | null = null;
  let activeMineSpan: HTMLSpanElement | null = null;
  let activeSecretCheckbox: HTMLInputElement | null = null;
  let activeSecretSpan: HTMLSpanElement | null = null;
  let lastSelectedId: string | null = null;
  const conditionCheckboxesMap = new Map<string, HTMLInputElement>();

  window.addEventListener("pointerdown", (e) => {
    if (isCondPopoverOpen && activeCondContainer && activeCondPopover) {
      if (!activeCondContainer.contains(e.target as Node) && !activeCondPopover.contains(e.target as Node)) {
        isCondPopoverOpen = false;
        activeCondPopover.style.display = "none";
      }
    }
    if (isDescPopoverOpen && activeDescContainer && activeDescPopover) {
      if (!activeDescContainer.contains(e.target as Node) && !activeDescPopover.contains(e.target as Node)) {
        isDescPopoverOpen = false;
        activeDescPopover.style.display = "none";
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
      if (activeDescPopover && activeDescPopover.parentNode) {
        activeDescPopover.parentNode.removeChild(activeDescPopover);
      }
      lastSelectedId = null;
      isCondPopoverOpen = false;
      isDescPopoverOpen = false;
      document.body.classList.remove("token-selected-in-simple");
      return;
    }

    if (!selectedId || !ent) {
      bar.style.display = "none";
      if (activeCondPopover && activeCondPopover.parentNode) {
        activeCondPopover.parentNode.removeChild(activeCondPopover);
      }
      if (activeDescPopover && activeDescPopover.parentNode) {
        activeDescPopover.parentNode.removeChild(activeDescPopover);
      }
      lastSelectedId = null;
      isCondPopoverOpen = false;
      isDescPopoverOpen = false;
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
      if (activeHpInput && document.activeElement !== activeHpInput) {
        const myUsername = sessionManager.myUsername || localStorage.getItem("maury_vtt_username") || "Me";
        const isMine = token.primaryOwnerUsername === myUsername || (doc.primaryTokens?.[myUsername] === token.id);
        const sheetHp = isMine ? (doc.characterSheets?.[myUsername]?.hp !== undefined ? String(doc.characterSheets[myUsername].hp) : undefined) : undefined;
        const displayHp = token.hp !== undefined ? String(token.hp) : (sheetHp || "");
        activeHpInput.value = displayHp;
      }
      if (activeMaxHpInput && document.activeElement !== activeMaxHpInput) {
        const myUsername = sessionManager.myUsername || localStorage.getItem("maury_vtt_username") || "Me";
        const isMine = token.primaryOwnerUsername === myUsername || (doc.primaryTokens?.[myUsername] === token.id);
        const sheetMaxHp = isMine ? (doc.characterSheets?.[myUsername]?.maxHp !== undefined ? String(doc.characterSheets[myUsername].maxHp) : undefined) : undefined;
        const displayMaxHp = token.maxHp !== undefined ? String(token.maxHp) : (sheetMaxHp || "");
        activeMaxHpInput.value = displayMaxHp;
      }
      const myUsername = sessionManager.myUsername || localStorage.getItem("maury_vtt_username") || "Me";
      const myPeerId = sessionManager.myPeerId || "local";
      const isMine = token.primaryOwnerUsername === myUsername || (doc.primaryTokens?.[myUsername] === token.id);
      if (activeMineCheckbox) activeMineCheckbox.checked = isMine;
      if (activeMineSpan) activeMineSpan.textContent = isMine ? "Mine ✓" : "Mine";
      const isSecret = Boolean(token.secret);
      if (activeSecretCheckbox) activeSecretCheckbox.checked = isSecret;
      if (activeSecretSpan) activeSecretSpan.textContent = isSecret ? "Secret 🤫 ✓" : "Secret 🤫";

      const activeCondCount = (token.statusEffects || []).length;
      if (activeCondBtn) {
        activeCondBtn.className = `btn-glass btn-sm ${activeCondCount > 0 ? "btn-active" : ""}`;
        activeCondBtn.innerHTML = activeCondCount > 0 ? `🏷️ Conditions (${activeCondCount})` : "🏷️ Conditions";
      }

      const hasDesc = Boolean(token.description && token.description.trim());
      if (activeDescBtn) {
        activeDescBtn.className = `btn-glass btn-sm ${hasDesc ? "btn-active" : ""}`;
        activeDescBtn.innerHTML = hasDesc ? "📝 Description ✓" : "📝 Description";
      }
      if (activeDescTextarea && document.activeElement !== activeDescTextarea) {
        activeDescTextarea.value = token.description || "";
      }

      for (const [condId, cb] of conditionCheckboxesMap.entries()) {
        cb.checked = (token.statusEffects || []).includes(condId);
      }
      return;
    }

    lastSelectedId = selectedId;
    isCondPopoverOpen = false;
    isDescPopoverOpen = false;
    conditionCheckboxesMap.clear();
    if (activeCondPopover && activeCondPopover.parentNode) {
      activeCondPopover.parentNode.removeChild(activeCondPopover);
    }
    if (activeDescPopover && activeDescPopover.parentNode) {
      activeDescPopover.parentNode.removeChild(activeDescPopover);
    }
    bar.innerHTML = "";

    if (ent.type === "token") {
      const token = ent as TokenEntity;
      const title = document.createElement("span");
      title.className = "selection-title";
      title.textContent = "♟️ Token";
      bar.appendChild(title);

      const myUsername = sessionManager.myUsername || localStorage.getItem("maury_vtt_username") || "Me";
      const myPeerId = sessionManager.myPeerId || "local";
      const isMine = token.primaryOwnerUsername === myUsername || (doc.primaryTokens?.[myUsername] === token.id);

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

          const currentDoc = docStore.getDocument();
          const currentlyMine = token.primaryOwnerUsername === myUsername || (currentDoc.primaryTokens?.[myUsername] === token.id);
          if (currentlyMine && newLabel) {
            const sheet = currentDoc.characterSheets?.[myUsername];
            if (!sheet || sheet.characterName !== newLabel) {
              sessionManager.dispatchOperation({
                opType: "UPDATE_CHARACTER_SHEET",
                username: myUsername,
                sheet: {
                  ...(sheet || { username: myUsername }),
                  characterName: newLabel
                }
              });
            }
          }
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

      // HP & Max HP Input Container next to Name Input
      const hpBox = document.createElement("div");
      hpBox.style.cssText = "display: flex; align-items: center; gap: 4px; position: relative; margin: 0 4px;";

      const sheetHp = isMine ? (doc.characterSheets?.[myUsername]?.hp !== undefined ? String(doc.characterSheets[myUsername].hp) : undefined) : undefined;
      const initialHp = token.hp !== undefined ? String(token.hp) : (sheetHp || "");
      const sheetMaxHp = isMine ? (doc.characterSheets?.[myUsername]?.maxHp !== undefined ? String(doc.characterSheets[myUsername].maxHp) : undefined) : undefined;
      const initialMaxHp = token.maxHp !== undefined ? String(token.maxHp) : (sheetMaxHp || "");

      const hpInput = document.createElement("input");
      activeHpInput = hpInput;
      hpInput.type = "text";
      hpInput.className = "token-hp-input";
      hpInput.placeholder = "HP";
      hpInput.value = initialHp;
      hpInput.style.cssText =
        "background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.55); border-radius: 6px; color: #fda4af; padding: 4px 6px; font-size: 13px; font-weight: 700; outline: none; width: 48px; text-align: center;";

      const hpSlash = document.createElement("span");
      hpSlash.textContent = "/";
      hpSlash.style.cssText = "color: #f43f5e; font-weight: 800; font-size: 13px;";

      const maxHpInput = document.createElement("input");
      activeMaxHpInput = maxHpInput;
      maxHpInput.type = "text";
      maxHpInput.className = "token-max-hp-input";
      maxHpInput.placeholder = "Max";
      maxHpInput.value = initialMaxHp;
      maxHpInput.style.cssText =
        "background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.55); border-radius: 6px; color: #fda4af; padding: 4px 6px; font-size: 13px; font-weight: 700; outline: none; width: 48px; text-align: center;";

      const hpHistoryPopup = document.createElement("div");
      hpHistoryPopup.style.cssText = "display: none; position: absolute; bottom: 100%; left: 0; min-width: 160px; background: rgba(15, 23, 42, 0.98); border: 1px solid #f43f5e; border-radius: 8px; padding: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.7); z-index: 3000; flex-direction: column; gap: 4px; margin-bottom: 6px;";

      const commitHpAndMax = () => {
        const newHp = hpInput.value.trim();
        const newMaxHp = maxHpInput.value.trim();
        const currentDoc = docStore.getDocument();
        const latestToken = currentDoc.entities[token.id] as TokenEntity || token;
        const patch: Partial<TokenEntity> = {};
        if (newHp !== String(latestToken.hp || "")) {
          patch.hp = newHp;
        }
        if (newMaxHp !== String(latestToken.maxHp || "")) {
          patch.maxHp = newMaxHp;
        }
        if (Object.keys(patch).length > 0) {
          sessionManager.dispatchOperation({
            opType: "UPDATE_ENTITY",
            id: token.id,
            patch: patch as any
          });
        }
      };

      hpInput.addEventListener("change", commitHpAndMax);
      hpInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          commitHpAndMax();
          hpInput.blur();
        }
      });
      maxHpInput.addEventListener("change", commitHpAndMax);
      maxHpInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          commitHpAndMax();
          maxHpInput.blur();
        }
      });

      let hpFocusClicks = 0;
      const showSelectionHpHistoryPopup = () => {
        const currentDoc = docStore.getDocument();
        const latestToken = currentDoc.entities[token.id] as TokenEntity || token;
        const history = (latestToken.hpHistory || []).slice(-6);
        if (history.length === 0) return;

        hpHistoryPopup.innerHTML = `<div style="font-size: 10px; color: #cbd5e1; font-weight: 800; text-transform: uppercase; padding: 2px 4px; border-bottom: 1px solid rgba(244, 63, 94, 0.3); margin-bottom: 2px;">Recent HP</div>`;
        history.forEach((entry) => {
          const val = typeof entry === "object" && entry !== null ? String((entry as any).val ?? (entry as any).hp) : String(entry);
          const ts = typeof entry === "object" && entry !== null ? (entry as any).timestamp : undefined;
          const timeAgo = formatTimeAgo(ts);

          const btn = document.createElement("button");
          btn.className = "btn-glass btn-sm";
          btn.style.cssText = "width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 8px; font-weight: 800; color: #fda4af; cursor: pointer; font-size: 12px; border-radius: 4px;";
          btn.innerHTML = `<span style="font-size: 13px; font-weight: 900;">${val}</span>` + (timeAgo ? `<span style="font-size: 10px; color: #94a3b8; font-weight: 500;">${timeAgo}</span>` : "");
          btn.addEventListener("mousedown", (e) => {
            e.preventDefault();
            hpInput.value = val;
            commitHpAndMax();
            hpHistoryPopup.style.display = "none";
          });
          hpHistoryPopup.appendChild(btn);
        });
        hpHistoryPopup.style.display = "flex";
      };

      hpInput.addEventListener("focus", () => {
        hpFocusClicks++;
        if (hpFocusClicks >= 2) {
          showSelectionHpHistoryPopup();
        }
      });
      hpInput.addEventListener("click", () => {
        if (document.activeElement === hpInput) {
          hpFocusClicks++;
          if (hpFocusClicks >= 2) {
            showSelectionHpHistoryPopup();
          }
        }
      });
      hpInput.addEventListener("blur", () => {
        hpFocusClicks = 0;
        setTimeout(() => {
          hpHistoryPopup.style.display = "none";
        }, 200);
      });

      hpBox.appendChild(hpInput);
      hpBox.appendChild(hpSlash);
      hpBox.appendChild(maxHpInput);
      hpBox.appendChild(hpHistoryPopup);
      bar.appendChild(hpBox);

      // Mine Button (full button collision area!)
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

      // Secret Checkbox Button
      const secretBtn = document.createElement("button");
      secretBtn.className = "btn-glass btn-sm";
      secretBtn.setAttribute("data-tooltip", "Toggle Secret token (Visible only to you as semi-transparent)");
      secretBtn.style.cssText = "margin: 0 4px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;";

      const secretCheckbox = document.createElement("input");
      activeSecretCheckbox = secretCheckbox;
      secretCheckbox.type = "checkbox";
      const isSecret = Boolean(token.secret);
      secretCheckbox.checked = isSecret;
      secretCheckbox.style.cssText = "cursor: pointer; accent-color: #c084fc;";

      secretBtn.appendChild(secretCheckbox);
      const secretSpan = document.createElement("span");
      activeSecretSpan = secretSpan;
      secretSpan.textContent = isSecret ? "Secret 🤫 ✓" : "Secret 🤫";
      secretBtn.appendChild(secretSpan);

      secretBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        secretCheckbox.checked = !secretCheckbox.checked;
        const newSecret = secretCheckbox.checked;
        sessionManager.dispatchOperation({
          opType: "UPDATE_ENTITY",
          id: token.id,
          patch: {
            secret: newSecret,
            secretPeerId: newSecret ? myPeerId : undefined,
            secretUsername: newSecret ? myUsername : undefined
          } as any
        });
      });

      bar.appendChild(secretBtn);

      // Description Popover & Button
      const descContainer = document.createElement("div");
      activeDescContainer = descContainer;
      descContainer.style.cssText = "position: relative; display: inline-flex; align-items: center; margin: 0 4px;";

      const descBtn = document.createElement("button");
      activeDescBtn = descBtn;
      const initialDesc = token.description || "";
      const hasInitialDesc = Boolean(initialDesc.trim());
      descBtn.className = `btn-glass btn-sm ${hasInitialDesc ? "btn-active" : ""}`;
      descBtn.setAttribute("data-tooltip", "Edit token physical description / background");
      descBtn.innerHTML = hasInitialDesc ? "📝 Description ✓" : "📝 Description";
      descContainer.appendChild(descBtn);

      const descPopover = document.createElement("div");
      activeDescPopover = descPopover;
      descPopover.className = "token-description-popover";
      descPopover.style.cssText = `
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        bottom: 140px;
        background: rgba(15, 23, 42, 0.96);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(56, 189, 248, 0.45);
        border-radius: 12px;
        padding: 12px;
        display: none;
        flex-direction: column;
        gap: 8px;
        width: calc(100vw - 28px);
        max-width: 380px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
        z-index: 3500;
      `;

      const descHeader = document.createElement("div");
      descHeader.style.cssText = "display: flex; align-items: center; justify-content: space-between;";
      descHeader.innerHTML = `
        <span style="font-size: 12px; font-weight: 700; color: #38bdf8;">📝 Token Description</span>
        <span style="font-size: 10px; color: #94a3b8;">Auto-syncs with Sheet if claimed</span>
      `;
      descPopover.appendChild(descHeader);

      const descTextarea = document.createElement("textarea");
      activeDescTextarea = descTextarea;
      descTextarea.rows = 4;
      descTextarea.placeholder = "Enter token physical description, background, or visual details...";
      descTextarea.value = initialDesc;
      descTextarea.style.cssText = "width: 100%; background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 8px; color: #f8fafc; padding: 8px; font-size: 13px; font-family: inherit; resize: vertical; outline: none; box-sizing: border-box;";

      const commitDescription = () => {
        const newDesc = descTextarea.value;
        const currentDoc = docStore.getDocument();
        const latestToken = currentDoc.entities[token.id] as TokenEntity || token;
        if (newDesc !== (latestToken.description || "")) {
          sessionManager.dispatchOperation({
            opType: "UPDATE_ENTITY",
            id: token.id,
            patch: { description: newDesc } as any
          });
        }
      };

      descTextarea.addEventListener("input", commitDescription);
      descTextarea.addEventListener("change", commitDescription);
      descTextarea.addEventListener("blur", commitDescription);

      descPopover.appendChild(descTextarea);

      descBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isDescPopoverOpen) {
          isDescPopoverOpen = false;
          descPopover.style.display = "none";
        } else {
          isDescPopoverOpen = true;
          if (isCondPopoverOpen && activeCondPopover) {
            isCondPopoverOpen = false;
            activeCondPopover.style.display = "none";
          }
          const barRect = bar.getBoundingClientRect();
          descPopover.style.bottom = (window.innerHeight - barRect.top + 10) + "px";
          descPopover.style.display = "flex";
          descTextarea.focus();
        }
      });

      document.body.appendChild(descPopover);
      bar.appendChild(descContainer);

      // Conditions Selector
      // Add custom conditions saved in session vttdoc
      const currentDoc = docStore.getDocument();
      const customCondMap = currentDoc.customConditions || {};
      const customBundles = currentDoc.customVttfxBundles || {};
      const customConditions: { id: string; label: string; iconSvg?: string }[] = [];
      const addedIds = new Set<string>(BASE_CONDITIONS.map(bc => bc.id));

      // 1. From currentDoc.customConditions
      for (const cond of Object.values(customCondMap)) {
        if (cond && cond.id && !addedIds.has(cond.id)) {
          addedIds.add(cond.id);
          customConditions.push({
            id: cond.id,
            label: cond.name || cond.id,
            iconSvg: cond.iconSvg
          });
        }
      }

      // 2. From currentDoc.customVttfxBundles (for legacy/imported condition bundles)
      for (const bundle of Object.values(customBundles)) {
        if (bundle) {
          if (Array.isArray((bundle as any).conditions)) {
            for (const cond of (bundle as any).conditions) {
              if (cond && cond.id && !addedIds.has(cond.id)) {
                addedIds.add(cond.id);
                customConditions.push({
                  id: cond.id,
                  label: cond.name || cond.id,
                  iconSvg: cond.iconSvg
                });
              }
            }
          }
          if (Array.isArray(bundle.effects)) {
            const isBundleCond = bundle.isCondition === true || (bundle.bundleName && bundle.bundleName.startsWith("Condition:"));
            for (const eff of bundle.effects) {
              const isEffCond = eff.isCondition === true || (isBundleCond && eff.isCondition !== false);
              if (isEffCond && eff.id && !addedIds.has(eff.id)) {
                addedIds.add(eff.id);
                customConditions.push({
                  id: eff.id,
                  label: eff.name || eff.id,
                  iconSvg: eff.iconSvg
                });
              }
            }
          }
        }
      }

      const AVAILABLE_CONDITIONS = [...BASE_CONDITIONS, ...customConditions];

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

      // Top Action: AI Condition Generator Button
      const aiGenBtn = document.createElement("button");
      aiGenBtn.style.cssText = "grid-column: span 2; padding: 6px 10px; border-radius: 8px; background: linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(192, 132, 252, 0.25)); border: 1px solid #38bdf8; color: #f8fafc; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 4px; transition: all 0.15s ease;";
      aiGenBtn.innerHTML = `<span>✨ Generate AI Condition (with Animation)</span>`;
      aiGenBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        isCondPopoverOpen = false;
        condPopover.style.display = "none";
        openConditionGenerateModal();
      });
      condPopover.appendChild(aiGenBtn);

      // Items container inside popover
      const itemsContainer = document.createElement("div");
      itemsContainer.style.cssText = "grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;";
      condPopover.appendChild(itemsContainer);

      // Pagination controls container
      const paginationContainer = document.createElement("div");
      paginationContainer.style.cssText = "grid-column: span 2; display: flex; align-items: center; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(56, 189, 248, 0.3); user-select: none;";

      const prevBtn = document.createElement("button");
      prevBtn.className = "btn-glass btn-sm";
      prevBtn.style.cssText = "padding: 2px 8px; font-size: 11px; cursor: pointer;";
      prevBtn.textContent = "◀ Prev";

      const pageInfoSpan = document.createElement("span");
      pageInfoSpan.style.cssText = "color: #94a3b8; font-size: 11px; font-weight: 600;";

      const nextBtn = document.createElement("button");
      nextBtn.className = "btn-glass btn-sm";
      nextBtn.style.cssText = "padding: 2px 8px; font-size: 11px; cursor: pointer;";
      nextBtn.textContent = "Next ▶";

      paginationContainer.appendChild(prevBtn);
      paginationContainer.appendChild(pageInfoSpan);
      paginationContainer.appendChild(nextBtn);
      condPopover.appendChild(paginationContainer);

      const ITEMS_PER_PAGE = 30;
      let currentCondPage = 1;
      let totalCondPages = 1;

      const renderCondPage = (page: number) => {
        const latestDoc = docStore.getDocument();
        const usage = latestDoc.conditionUsage || {};
        const initialIndexMap = new Map<string, number>(AVAILABLE_CONDITIONS.map((c, i) => [c.id, i]));

        const sortedConditions = [...AVAILABLE_CONDITIONS].sort((a, b) => {
          const timeA = usage[a.id] || 0;
          const timeB = usage[b.id] || 0;
          if (timeB !== timeA) {
            return timeB - timeA;
          }
          return (initialIndexMap.get(a.id) ?? 0) - (initialIndexMap.get(b.id) ?? 0);
        });

        totalCondPages = Math.max(1, Math.ceil(sortedConditions.length / ITEMS_PER_PAGE));
        currentCondPage = Math.min(Math.max(1, page), totalCondPages);
        itemsContainer.innerHTML = "";
        conditionCheckboxesMap.clear();

        const startIdx = (currentCondPage - 1) * ITEMS_PER_PAGE;
        const endIdx = startIdx + ITEMS_PER_PAGE;
        const pageItems = sortedConditions.slice(startIdx, endIdx);
        const gridOrderedItems = arrangeItemsForBottomUpGrid(pageItems);

        gridOrderedItems.forEach((c) => {
          const currentToken = (docStore.getDocument().entities[token.id] as TokenEntity) || token;
          const hasCond = (currentToken.statusEffects || []).includes(c.id);
          const itemLabel = document.createElement("label");
          itemLabel.style.cssText = "display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; font-size: 13px; color: #f8fafc; padding: 4px 6px; border-radius: 6px; transition: background 0.15s;";
          itemLabel.addEventListener("mouseenter", () => (itemLabel.style.background = "rgba(56, 189, 248, 0.15)"));
          itemLabel.addEventListener("mouseleave", () => (itemLabel.style.background = "transparent"));

          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = hasCond;
          cb.style.cssText = "cursor: pointer; width: 14px; height: 14px; accent-color: #38bdf8;";
          conditionCheckboxesMap.set(c.id, cb);

          cb.addEventListener("change", (e) => {
            e.stopPropagation();
            const currentStatus = new Set((docStore.getDocument().entities[token.id] as TokenEntity)?.statusEffects || []);
            if (cb.checked) {
              currentStatus.add(c.id);
              sessionManager.dispatchOperation({
                opType: "RECORD_CONDITION_USAGE",
                conditionId: c.id,
                timestamp: Date.now()
              });
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
          if ((c as any).iconSvg) {
            const iconSpan = document.createElement("span");
            iconSpan.style.cssText = "display: inline-flex; align-items: center; justify-content: center; width: 1.3em; height: 1.3em; flex-shrink: 0; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6));";
            iconSpan.innerHTML = (c as any).iconSvg;
            itemLabel.appendChild(iconSpan);
          }
          const textSpan = document.createElement("span");
          textSpan.textContent = c.label;
          itemLabel.appendChild(textSpan);
          itemsContainer.appendChild(itemLabel);
        });

        if (totalCondPages > 1) {
          paginationContainer.style.display = "flex";
          pageInfoSpan.textContent = `Page ${currentCondPage} of ${totalCondPages}`;
          prevBtn.disabled = currentCondPage <= 1;
          prevBtn.style.opacity = currentCondPage <= 1 ? "0.4" : "1";
          prevBtn.style.cursor = currentCondPage <= 1 ? "not-allowed" : "pointer";

          nextBtn.disabled = currentCondPage >= totalCondPages;
          nextBtn.style.opacity = currentCondPage >= totalCondPages ? "0.4" : "1";
          nextBtn.style.cursor = currentCondPage >= totalCondPages ? "not-allowed" : "pointer";
        } else {
          paginationContainer.style.display = "none";
        }
      };

      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (currentCondPage > 1) {
          renderCondPage(currentCondPage - 1);
        }
      });

      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (currentCondPage < totalCondPages) {
          renderCondPage(currentCondPage + 1);
        }
      });

      renderCondPage(1);

      condBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isCondPopoverOpen) {
          isCondPopoverOpen = false;
          condPopover.style.display = "none";
        } else {
          isCondPopoverOpen = true;
          renderCondPage(currentCondPage);
          const barRect = bar.getBoundingClientRect();
          condPopover.style.bottom = (window.innerHeight - barRect.top + 10) + "px";
          condPopover.style.display = "grid";
        }
      });

      document.body.appendChild(condPopover);
      bar.appendChild(condContainer);

      // Resize Button next to Condition popover
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
        patch: {
          locked: !ent.locked,
          lockedBy: !ent.locked ? (sessionManager.myPeerId || "local") : undefined
        } as any
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
