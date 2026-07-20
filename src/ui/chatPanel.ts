import { docStore } from "../state/documentStore.js";
import { sessionManager } from "../network/sessionManager.js";
import { ChatMessage, TokenEntity, VTTDocument } from "../types/vtt.js";
import { CanvasEngine } from "../canvas/canvasEngine.js";
import { EffectEngine } from "../effects/effectEngine.js";
import { getEffectIdForIcon } from "../effects/effectDefs.js";
import { ALL_ROLL_ICONS, COIN_ICON_SVG } from "./rollIcons.js";
import { openImportVttfxModal } from "./vttfxImportModal.js";
import { openGeminiApiKeyModal } from "./enhanceModal.js";
import { openVttfxGenerateModal } from "./vttfxGenerateModal.js";
import { openCharacterSheetModal } from "./characterSheetModal.js";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace(/^#/, "");
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const num = parseInt(c, 16) || 0x38bdf8;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function formatLinks(input: string): string {
  if (!input) return input;
  const parts = input.split(/(<[^>]+>)/g);
  let insideAnchor = false;

  return parts
    .map((part) => {
      if (part.startsWith("<")) {
        if (/^<a\b/i.test(part)) insideAnchor = true;
        else if (/^<\/a>/i.test(part)) insideAnchor = false;
        return part;
      }
      if (insideAnchor) return part;

      const urlRegex = /(https?:\/\/[^\s<"']+|www\.[^\s<"']+)/gi;
      return part.replace(urlRegex, (rawUrl) => {
        let url = rawUrl;
        let trailing = "";
        const matchTrailing = url.match(/([.,!?;:]+|\)+)$/);
        if (matchTrailing) {
          trailing = matchTrailing[0];
          url = url.slice(0, -trailing.length);
        }

        const href = url.startsWith("http") ? url : `https://${url}`;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="chat-link" style="color: #38bdf8; text-decoration: underline; word-break: break-all;">${url}</a>${trailing}`;
      });
    })
    .join("");
}

function playEffectAtUserToken(engine: CanvasEngine | undefined, doc: VTTDocument, senderUsername?: string, senderPeerId?: string, effectId?: string, targetTokenIds?: string[]): void {
  if (!effectId || !engine || !doc || !doc.entities) return;

  if (targetTokenIds && targetTokenIds.length > 0) {
    for (const tid of targetTokenIds) {
      const ent = doc.entities[tid];
      if (ent && ent.type === "token") {
        const tok = ent as TokenEntity;
        const screenPos = engine.worldToScreen(tok.position.x, tok.position.y);
        const sizePx = Math.max(140, tok.size.width * engine.zoom * 1.6);
        console.log("[DiceAnimation] Playing roll animation at target token:", tok.id, "effectId:", effectId, "screenPos:", screenPos);
        EffectEngine.playAtScreenCoord(screenPos.x, screenPos.y, effectId, sizePx);
      }
    }
    return;
  }

  let userToken: TokenEntity | undefined;

  if (senderUsername && doc.primaryTokens?.[senderUsername]) {
    const ent = doc.entities[doc.primaryTokens[senderUsername]];
    if (ent && ent.type === "token") userToken = ent as TokenEntity;
  }

  if (!userToken && senderUsername) {
    userToken = Object.values(doc.entities).find(
      (e) => e.type === "token" && (e as TokenEntity).primaryOwnerUsername === senderUsername
    ) as TokenEntity | undefined;
  }

  if (!userToken && senderPeerId) {
    userToken = Object.values(doc.entities).find(
      (e) => e.type === "token" && (e as TokenEntity).ownerPeerIds?.includes(senderPeerId)
    ) as TokenEntity | undefined;
  }

  if (userToken) {
    const screenPos = engine.worldToScreen(userToken.position.x, userToken.position.y);
    const sizePx = Math.max(140, userToken.size.width * engine.zoom * 1.6);
    console.log("[DiceAnimation] Playing roll animation at token:", userToken.id, "for user:", senderUsername, "effectId:", effectId, "screenPos:", screenPos);
    EffectEngine.playAtScreenCoord(screenPos.x, screenPos.y, effectId, sizePx);
  }
}

export function parseAndRollDice(cmd: string, customIcon: string = ALL_ROLL_ICONS[0]): string | null {
  const rawExpr = cmd.replace(/^\/(?:roll|r)\b\s*|^\/r\s*/i, "").replace(/\s+/g, "");
  if (!rawExpr) return null;

  const tokenRegex = /([+-]?)([^+-]+)/g;
  let match;
  let total = 0;
  const breakdowns: string[] = [];
  let valid = false;
  let hasD20 = false;
  let hasNat20 = false;
  let hasNat1 = false;

  while ((match = tokenRegex.exec(rawExpr)) !== null) {
    const signStr = match[1];
    const sign = signStr === "-" ? -1 : 1;
    const term = match[2];

    const diceMatch = term.match(/^(\d*)d(\d+)$/i);
    if (diceMatch) {
      valid = true;
      const count = diceMatch[1] === "" ? 1 : Math.min(parseInt(diceMatch[1], 10), 50);
      const sides = parseInt(diceMatch[2], 10);
      if (sides <= 0 || count <= 0) continue;
      if (sides === 20) hasD20 = true;

      const rolls: number[] = [];
      let sum = 0;
      for (let i = 0; i < count; i++) {
        const r = Math.floor(Math.random() * sides) + 1;
        rolls.push(r);
        sum += r;
        if (sides === 20 && r === 20) hasNat20 = true;
        if (sides === 20 && r === 1) hasNat1 = true;
      }
      total += sign * sum;
      const prefix = breakdowns.length === 0 ? (sign === -1 ? "-" : "") : (sign === -1 ? " - " : " + ");
      breakdowns.push(`${prefix}[${rolls.join(", ")}]`);
    } else if (/^\d+$/.test(term)) {
      valid = true;
      const val = parseInt(term, 10);
      total += sign * val;
      const prefix = breakdowns.length === 0 ? (sign === -1 ? "-" : "") : (sign === -1 ? " - " : " + ");
      breakdowns.push(`${prefix}${val}`);
    } else {
      return null;
    }
  }

  if (!valid) return null;
  let rollIcon = customIcon || ALL_ROLL_ICONS[0];
  if (hasD20) {
    if (hasNat20) {
      rollIcon = '<strong style="color: #4ade80; font-weight: 900; letter-spacing: 0.5px;">CRIT!</strong>';
    } else if (hasNat1) {
      rollIcon = '<strong style="color: #f87171; font-weight: 900; letter-spacing: 0.5px;">NOPE</strong>';
    }
  }
  return `${rollIcon} ${rawExpr}: ${breakdowns.join("")} = <span style="color: #ffffff; font-weight: 800; font-size: 1.15em; text-shadow: 0 0 6px rgba(255, 255, 255, 0.35);">${total}</span>`;
}

export function triggerQuickRollToChat(qr: { label: string; expr: string; icon?: string }, engine?: CanvasEngine): void {
  const rollRes = parseAndRollDice(qr.expr, qr.icon || ALL_ROLL_ICONS[0]);
  if (!rollRes) return;

  const targetTokenIds = engine && engine.rollTargetTokenIds.size > 0 ? Array.from(engine.rollTargetTokenIds) : undefined;

  const newMsg: ChatMessage = {
    id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
    senderPeerId: sessionManager.myPeerId || "local",
    senderUsername: sessionManager.myUsername || "Me",
    content: rollRes,
    type: "roll",
    rollLabel: qr.label,
    rollIcon: qr.icon || ALL_ROLL_ICONS[0],
    targetTokenIds
  };

  sessionManager.dispatchOperation({
    opType: "APPEND_CHAT_MESSAGE",
    message: newMsg
  });

  if (engine && engine.isRollTargetingMode) {
    engine.toggleRollTargetingMode(false);
  }
}

export function setupChatPanel(engine?: CanvasEngine): void {
  const panel = document.createElement("div");
  panel.className = "chat-window";
  panel.id = "vtt-chat-panel";

  if (window.innerWidth <= 768) {
    panel.classList.add("minimized");
  }

  sessionManager.onEphemeral((payload: any) => {
    if (payload && payload.type === "REPLAY_ANIMATION" && payload.effectId) {
      if (payload.msgId) {
        const elList = document.querySelectorAll(`[data-msg-id="${payload.msgId}"]`);
        elList.forEach((el) => {
          EffectEngine.playOverElement(el as HTMLElement, payload.effectId);
        });
      }
      playEffectAtUserToken(engine, docStore.getDocument(), payload.senderUsername, payload.senderPeerId, payload.effectId, payload.targetTokenIds);
    }
  });

  panel.innerHTML = `
    <div class="chat-header" id="chat-header-bar" data-tooltip="Click to Minimize / Expand Chat">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>💬 Chat & Dice</span>
        <span class="chat-unread-badge" id="chat-unread-badge" style="display: none;">0</span>
      </div>
      <button class="chat-toggle-btn" id="btn-toggle-chat" data-tooltip="Toggle Chat Window">${panel.classList.contains("minimized") ? "▲" : "▼"}</button>
    </div>
    <div class="dice-builder-section" id="dice-builder-section">
      <div class="dice-builder-icons">
        <button class="dice-icon-btn" data-dice="d20" data-tooltip="Add d20">d20</button>
        <button class="dice-icon-btn" data-dice="d12" data-tooltip="Add d12">d12</button>
        <button class="dice-icon-btn" data-dice="d10" data-tooltip="Add d10">d10</button>
        <button class="dice-icon-btn" data-dice="d8" data-tooltip="Add d8">d8</button>
        <button class="dice-icon-btn" data-dice="d6" data-tooltip="Add d6">d6</button>
        <button class="dice-icon-btn" data-dice="d4" data-tooltip="Add d4">d4</button>
        <button class="dice-icon-btn mod-btn mod-btn-plus" data-dice="+1" data-tooltip="Add +1">+1</button>
        <button class="dice-icon-btn mod-btn mod-btn-minus" data-dice="-1" data-tooltip="Subtract 1">-1</button>
      </div>
      <div class="quickrolls-container" id="quickrolls-container" style="display: none; flex-wrap: wrap; gap: 6px; margin-top: 6px; padding: 4px 0;"></div>
      <div class="dice-builder-details" id="dice-builder-details" style="display: none;">
        <div class="dice-builder-expression">
          <span>Expression:</span>
          <strong id="dice-builder-expr-txt">---</strong>
        </div>
        <input type="text" id="dice-builder-label" class="dice-builder-label-input" placeholder="Label (e.g. Attack or Holy Damage)..." />
        <div class="dice-builder-actions" style="position: relative; display: flex; gap: 6px; align-items: center;">
          <button class="btn-glass" id="dice-builder-icon-btn" data-tooltip="Choose Animation" data-tooltip-align="left" style="padding: 6px 10px; font-size: 1.1em; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 6px;">${ALL_ROLL_ICONS[0]}</button>
          <button class="btn-glass" id="dice-builder-target-btn" data-tooltip="Token Targets: Click to select target tokens on the map" data-tooltip-align="left" style="padding: 6px 10px; font-size: 1.1em; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 6px;">🎯</button>
          <button class="btn-glass btn-primary" id="dice-builder-roll-btn" style="flex: 1; padding: 6px;">Roll</button>
          <button class="btn-glass" id="dice-builder-clear-btn" style="flex: 1; padding: 6px;">Clear</button>
        </div>
        <div id="dice-builder-icon-popover" style="display: none; width: 100%; box-sizing: border-box; background: rgba(15, 23, 42, 0.98); border: 1px solid rgba(56, 189, 248, 0.6); border-radius: 8px; padding: 8px; flex-direction: column; gap: 8px; box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.5);">
          <div id="popover-nav-header" style="display: flex; align-items: center; justify-content: space-between; width: 100%; border-bottom: 1px solid rgba(56, 189, 248, 0.2); padding-bottom: 4px;">
            <button id="popover-prev-btn" class="btn-glass" style="padding: 2px 10px; font-size: 0.9em; cursor: pointer; border-radius: 4px;" title="Previous Page">◀</button>
            <span id="popover-page-txt" style="font-size: 0.8em; color: #94a3b8; font-weight: 600;">Page 1</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <button id="popover-generate-vttfx-btn" class="btn-glass" style="padding: 2px 6px; font-size: 0.9em; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center;" title="Generate AI VTTFX Icon & Animation">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;"><path d="M12 2L14.4 8.4L21 10.8L14.4 13.2L12 19.6L9.6 13.2L3 10.8L9.6 8.4L12 2Z" fill="url(#enhance-grad-pop)" stroke="#c084fc" stroke-width="1.5"/><path d="M19 16L20.2 19.2L23 20.4L20.2 21.6L19 24.8L17.8 21.6L15 20.4L17.8 19.2L19 16Z" fill="#e879f9"/><defs><linearGradient id="enhance-grad-pop" x1="3" y1="2" x2="21" y2="20" gradientUnits="userSpaceOnUse"><stop stop-color="#c084fc"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs></svg>
              </button>
              <button id="popover-upload-btn" class="btn-glass" style="padding: 2px 8px; font-size: 0.9em; cursor: pointer; border-radius: 4px; color: #38bdf8; font-weight: bold;" title="Upload & Share .vttfx VFX Bundle">+</button>
              <button id="popover-next-btn" class="btn-glass" style="padding: 2px 10px; font-size: 0.9em; cursor: pointer; border-radius: 4px;" title="Next Page">▶</button>
            </div>
            <input type="file" id="popover-vttfx-file-input" accept=".vttfx,.json" style="display: none;" />
          </div>
          <div id="popover-icon-grid" style="display: flex; flex-direction: row; justify-content: center; flex-wrap: wrap; gap: 8px;"></div>
        </div>
      </div>
    </div>
    <div class="chat-messages" id="chat-messages-container"></div>
    <div class="chat-input-bar" style="position: relative;">
      <div id="whisper-quick-selector" style="display: none; position: absolute; bottom: 100%; left: 0; right: 0; background: rgba(15, 23, 42, 0.98); border: 1px solid #c084fc; border-radius: 8px 8px 0 0; padding: 8px; z-index: 100; max-height: 160px; overflow-y: auto; flex-direction: column; gap: 6px; box-shadow: 0 -4px 16px rgba(0,0,0,0.75);"></div>
      <input type="text" id="chat-input-el" class="chat-input" placeholder="Type a message or /roll (/r) 1d20..." />
    </div>
  `;

  document.body.appendChild(panel);

  const container = panel.querySelector("#chat-messages-container")!;
  const inputEl = panel.querySelector<HTMLInputElement>("#chat-input-el")!;
  const whisperSelectorEl = panel.querySelector<HTMLElement>("#whisper-quick-selector")!;
  const headerBar = panel.querySelector<HTMLElement>("#chat-header-bar")!;
  const toggleBtn = panel.querySelector<HTMLButtonElement>("#btn-toggle-chat")!;
  const badgeEl = panel.querySelector<HTMLElement>("#chat-unread-badge")!;
  const quickRollsContainerEl = panel.querySelector<HTMLElement>("#quickrolls-container")!;

  function updateWhisperQuickSelector() {
    const val = inputEl.value;
    const whisperMatch = val.match(/^\/(?:whisper|w)\b(?:\s+(.*))?$/i);
    if (!whisperMatch) {
      whisperSelectorEl.style.display = "none";
      return;
    }
    const arg = (whisperMatch[1] || "").trim();
    const activeUsers = sessionManager.getActiveUsers();
    let candidateUsers = activeUsers.filter((u) => u.username !== sessionManager.myUsername);
    if (candidateUsers.length === 0) candidateUsers = activeUsers;

    const firstToken = arg.split(/\s+/)[0].toLowerCase();
    const exactMatch = candidateUsers.find((u) => u.username.toLowerCase() === firstToken && (arg.length > firstToken.length && /\s/.test(arg.charAt(firstToken.length))));
    if (exactMatch) {
      whisperSelectorEl.style.display = "none";
      return;
    }

    const matchingUsers = candidateUsers.filter((u) => !firstToken || u.username.toLowerCase().includes(firstToken) || u.username.toLowerCase().startsWith(firstToken));
    if (matchingUsers.length === 0) {
      whisperSelectorEl.style.display = "none";
      return;
    }

    whisperSelectorEl.style.display = "flex";
    whisperSelectorEl.innerHTML = `
      <div style="font-size: 11px; font-weight: 700; color: #c084fc; padding: 2px 4px; border-bottom: 1px solid rgba(192, 132, 252, 0.2); display: flex; justify-content: space-between;">
        <span>🔮 Select user to whisper:</span>
        <span style="color: #94a3b8; font-weight: normal; font-size: 10px;">(Click or type name)</span>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px; padding-top: 4px;">
        ${matchingUsers.map((u) => `
          <button class="whisper-user-pill" data-username="${u.username}" style="background: rgba(30, 41, 59, 0.95); border: 1px solid ${u.color || '#c084fc'}; color: #fff; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; transition: transform 0.15s, background 0.15s;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${u.color || '#c084fc'};"></span>
            <span>${u.username}</span>
          </button>
        `).join("")}
      </div>
    `;

    whisperSelectorEl.querySelectorAll<HTMLButtonElement>(".whisper-user-pill").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const uname = btn.getAttribute("data-username");
        if (uname) {
          inputEl.value = `/whisper ${uname} `;
          whisperSelectorEl.style.display = "none";
          inputEl.focus();
        }
      });
    });
  }

  inputEl.addEventListener("input", updateWhisperQuickSelector);
  inputEl.addEventListener("focus", updateWhisperQuickSelector);
  document.addEventListener("click", (e) => {
    if (!whisperSelectorEl.contains(e.target as Node) && e.target !== inputEl) {
      whisperSelectorEl.style.display = "none";
    }
  });

  let unreadCount = 0;
  let lastMessageCount = 0;

  function toggleChat() {
    const isCurrentlyHiddenOrMin = panel.classList.contains("minimized") || panel.style.display === "none";
    if ((window as any).vttSimpleMode) {
      if (!isCurrentlyHiddenOrMin) {
        panel.classList.add("minimized");
        panel.style.display = "none";
        toggleBtn.textContent = "▲";
      } else {
        panel.classList.remove("minimized");
        panel.style.display = "flex";
        toggleBtn.textContent = "▼";
        unreadCount = 0;
        badgeEl.style.display = "none";
        container.scrollTop = container.scrollHeight;
      }
      return;
    }
    panel.classList.toggle("minimized");
    const isMin = panel.classList.contains("minimized");
    toggleBtn.textContent = isMin ? "▲" : "▼";
    if (!isMin) {
      unreadCount = 0;
      badgeEl.style.display = "none";
      container.scrollTop = container.scrollHeight;
    }
  }

  headerBar.addEventListener("click", () => toggleChat());
  (window as any).toggleVttChat = toggleChat;

  const builderState: Record<string, number> = {
    d20: 0,
    d12: 0,
    d10: 0,
    d8: 0,
    d6: 0,
    d4: 0,
    mod: 0
  };

  const detailsEl = panel.querySelector<HTMLElement>("#dice-builder-details")!;
  const exprTxtEl = panel.querySelector<HTMLElement>("#dice-builder-expr-txt")!;
  const labelInputEl = panel.querySelector<HTMLInputElement>("#dice-builder-label")!;
  const targetBtnEl = panel.querySelector<HTMLButtonElement>("#dice-builder-target-btn")!;
  const rollBtnEl = panel.querySelector<HTMLButtonElement>("#dice-builder-roll-btn")!;
  const clearBtnEl = panel.querySelector<HTMLButtonElement>("#dice-builder-clear-btn")!;

  const iconBtnEl = panel.querySelector<HTMLButtonElement>("#dice-builder-icon-btn")!;
  const iconPopoverEl = panel.querySelector<HTMLElement>("#dice-builder-icon-popover")!;
  let selectedRollIcon = ALL_ROLL_ICONS[0];

  let currentIconPage = 0;
  const ICONS_PER_PAGE = 20;

  function renderPopoverPage(): void {
    const gridEl = iconPopoverEl.querySelector<HTMLElement>("#popover-icon-grid");
    const prevBtn = iconPopoverEl.querySelector<HTMLButtonElement>("#popover-prev-btn");
    const nextBtn = iconPopoverEl.querySelector<HTMLButtonElement>("#popover-next-btn");
    const pageTxt = iconPopoverEl.querySelector<HTMLElement>("#popover-page-txt");
    if (!gridEl || !prevBtn || !nextBtn || !pageTxt) return;

    const totalPages = Math.ceil(ALL_ROLL_ICONS.length / ICONS_PER_PAGE);
    if (currentIconPage < 0) currentIconPage = 0;
    if (currentIconPage >= totalPages) currentIconPage = Math.max(0, totalPages - 1);

    pageTxt.textContent = `Page ${currentIconPage + 1} / ${totalPages}`;
    prevBtn.disabled = currentIconPage === 0;
    prevBtn.style.opacity = currentIconPage === 0 ? "0.4" : "1";
    nextBtn.disabled = currentIconPage === totalPages - 1;
    nextBtn.style.opacity = currentIconPage === totalPages - 1 ? "0.4" : "1";

    const startIdx = currentIconPage * ICONS_PER_PAGE;
    const pageIcons = ALL_ROLL_ICONS.slice(startIdx, startIdx + ICONS_PER_PAGE);

    gridEl.innerHTML = pageIcons.map((iconHtml) => {
      const isActive = selectedRollIcon === iconHtml;
      return `<button class="btn-glass roll-icon-swatch ${isActive ? "active" : ""}" data-icon="${encodeURIComponent(iconHtml)}" style="padding: 6px 10px; font-size: 1.25em; cursor: pointer; border-radius: 6px;">${iconHtml}</button>`;
    }).join("");

    gridEl.querySelectorAll<HTMLButtonElement>(".roll-icon-swatch").forEach((swatch) => {
      swatch.addEventListener("click", (e) => {
        e.stopPropagation();
        const chosen = decodeURIComponent(swatch.getAttribute("data-icon") || ALL_ROLL_ICONS[0]);
        selectedRollIcon = chosen;
        iconBtnEl.innerHTML = chosen;
        iconPopoverEl.style.display = "none";
        renderPopoverPage();
      });
    });
  }

  iconPopoverEl.querySelector<HTMLButtonElement>("#popover-prev-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (currentIconPage > 0) {
      currentIconPage--;
      renderPopoverPage();
    }
  });

  iconPopoverEl.querySelector<HTMLButtonElement>("#popover-next-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const totalPages = Math.ceil(ALL_ROLL_ICONS.length / ICONS_PER_PAGE);
    if (currentIconPage < totalPages - 1) {
      currentIconPage++;
      renderPopoverPage();
    }
  });

  const vttfxFileInput = iconPopoverEl.querySelector<HTMLInputElement>("#popover-vttfx-file-input");
  iconPopoverEl.querySelector<HTMLButtonElement>("#popover-generate-vttfx-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    iconPopoverEl.style.display = "none";
    openVttfxGenerateModal();
  });
  iconPopoverEl.querySelector<HTMLButtonElement>("#popover-upload-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    vttfxFileInput?.click();
  });

    vttfxFileInput?.addEventListener("change", async (e) => {
      e.stopPropagation();
      const file = vttfxFileInput.files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const bundle = JSON.parse(text);
          if (bundle && Array.isArray(bundle.effects)) {
            openImportVttfxModal(bundle, bundle.bundleName || file.name);
          } else {
            alert("Invalid .vttfx bundle format (missing effects array).");
          }
        } catch (err) {
          alert("Could not parse .vttfx file: " + (err as Error).message);
        }
        vttfxFileInput.value = "";
      }
    });

  iconBtnEl.addEventListener("click", (e) => {
    e.stopPropagation();
    if (iconPopoverEl.style.display === "none") {
      iconPopoverEl.style.display = "flex";
      renderPopoverPage();
    } else {
      iconPopoverEl.style.display = "none";
    }
  });

  document.addEventListener("click", (e) => {
    if (!iconBtnEl.contains(e.target as Node) && !iconPopoverEl.contains(e.target as Node)) {
      iconPopoverEl.style.display = "none";
    }
  });

  function formatBuilderExpression(): string {
    const terms: string[] = [];
    const diceTypes = ["d20", "d12", "d10", "d8", "d6", "d4"];
    for (const d of diceTypes) {
      const count = builderState[d];
      if (count > 0) {
        terms.push(`${count}${d}`);
      }
    }
    let expr = terms.join("+");
    if (builderState.mod > 0) {
      expr += `${expr ? "+" : ""}${builderState.mod}`;
    } else if (builderState.mod < 0) {
      expr += `${builderState.mod}`;
    }
    return expr;
  }

  function saveQuickRoll(label: string, expr: string, icon: string = ALL_ROLL_ICONS[0]): void {
    const cleanLabel = label.trim();
    const cleanExpr = expr.trim();
    const username = sessionManager.myUsername || "Me";
    if (!cleanLabel || !cleanExpr || !username) return;

    const doc = docStore.getDocument();
    const list = doc.quickRolls?.[username] ? [...doc.quickRolls[username]] : [];

    const filtered = list.filter((q) => q.label.toLowerCase() !== cleanLabel.toLowerCase());
    filtered.unshift({ label: cleanLabel, expr: cleanExpr, icon });
    const trimmed = filtered.slice(0, 12);

    sessionManager.dispatchOperation({
      opType: "UPDATE_QUICK_ROLLS",
      username,
      quickRolls: trimmed
    });

    renderQuickRolls();
  }

  function showTargetingToast(text: string): void {
    let toastEl = document.getElementById("vtt-targeting-toast");
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "vtt-targeting-toast";
      toastEl.style.cssText = "position: fixed; top: 18px; left: 50%; transform: translateX(-50%); background: rgba(244, 63, 94, 0.95); color: #ffffff; padding: 8px 16px; border-radius: 9999px; font-size: 13px; font-weight: 700; z-index: 10000; box-shadow: 0 4px 20px rgba(244, 63, 94, 0.4); pointer-events: none; transition: opacity 0.3s ease;";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.style.opacity = "1";
    toastEl.style.display = "block";
    if ((showTargetingToast as any).timer) clearTimeout((showTargetingToast as any).timer);
    (showTargetingToast as any).timer = setTimeout(() => {
      if (toastEl) toastEl.style.opacity = "0";
    }, 3500);
  }

  function executeQuickRollItem(qr: { label: string; expr: string; icon?: string }): void {
    triggerQuickRollToChat(qr, engine);
  }

  function renderQuickRolls(): void {
    if (!quickRollsContainerEl) return;
    const doc = docStore.getDocument();
    const username = sessionManager.myUsername || "Me";
    const list = (doc.quickRolls?.[username] || []).slice(0, 6);

    if (list.length === 0 || formatBuilderExpression() !== "") {
      quickRollsContainerEl.style.display = "none";
      return;
    }

    quickRollsContainerEl.style.display = "flex";
    quickRollsContainerEl.innerHTML = list
      .map(
        (qr, idx) => `
          <button class="btn-glass quickroll-btn" data-idx="${idx}" title="Quick roll: ${qr.label} (${qr.expr})" style="padding: 4px 8px; font-size: 0.85em; display: flex; align-items: center; gap: 4px; border: 1px solid rgba(56, 189, 248, 0.4); background: rgba(15, 23, 42, 0.75); border-radius: 4px; color: #f8fafc; cursor: pointer;">
            <span style="color: #38bdf8; font-size: 1.1em;">${qr.icon || ALL_ROLL_ICONS[0]}</span>
            <strong style="font-weight: 600;">${qr.label}</strong>
            <span style="color: #94a3b8; font-size: 0.8em;">(${qr.expr})</span>
          </button>
        `
      )
      .join("");

    let longPressTimer: any = null;
    let isLongPressTriggered = false;

    quickRollsContainerEl.querySelectorAll<HTMLButtonElement>(".quickroll-btn").forEach((btn) => {
      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      btn.addEventListener("pointerdown", () => {
        isLongPressTriggered = false;
        longPressTimer = setTimeout(() => {
          isLongPressTriggered = true;
          if (engine) {
            engine.toggleRollTargetingMode(true);
            const idx = parseInt(btn.getAttribute("data-idx") || "-1", 10);
            const qr = list[idx];
            if (qr) {
              showTargetingToast(`Targeting mode active for ${qr.label}! Click tokens to mark targets, then click this quickroll to launch.`);
            }
          }
        }, 450);
      });

      btn.addEventListener("pointerup", () => {
        if (longPressTimer) clearTimeout(longPressTimer);
      });
      btn.addEventListener("pointerleave", () => {
        if (longPressTimer) clearTimeout(longPressTimer);
      });

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (longPressTimer) clearTimeout(longPressTimer);
        if (isLongPressTriggered) {
          isLongPressTriggered = false;
          return;
        }

        const idx = parseInt(btn.getAttribute("data-idx") || "-1", 10);
        const qr = list[idx];
        if (!qr) return;

        executeQuickRollItem(qr);
      });
    });
  }

  function updateBuilderUI(): void {
    const expr = formatBuilderExpression();
    if (!expr) {
      detailsEl.style.display = "none";
    } else {
      if (detailsEl.style.display === "none") {
        selectedRollIcon = ALL_ROLL_ICONS[0];
        iconBtnEl.innerHTML = ALL_ROLL_ICONS[0];
        if (iconPopoverEl) {
          iconPopoverEl.style.display = "none";
          renderPopoverPage();
        }
      }
      detailsEl.style.display = "flex";
      exprTxtEl.textContent = expr;
    }
    renderQuickRolls();
  }

  (window as any).__selectIconIfRollBuilding = (iconSvg: string): boolean => {
    const expr = formatBuilderExpression();
    if (expr && detailsEl && detailsEl.style.display !== "none") {
      selectedRollIcon = iconSvg;
      if (iconBtnEl) iconBtnEl.innerHTML = iconSvg;
      if (iconPopoverEl) {
        iconPopoverEl.style.display = "none";
        renderPopoverPage();
      }
      return true;
    }
    return false;
  };

  function resetBuilderState(): void {
    for (const key of Object.keys(builderState)) {
      builderState[key] = 0;
    }
    labelInputEl.value = "";
    selectedRollIcon = ALL_ROLL_ICONS[0];
    iconBtnEl.innerHTML = ALL_ROLL_ICONS[0];
    if (iconPopoverEl) {
      iconPopoverEl.style.display = "none";
      renderPopoverPage();
    }
    if (engine && engine.isRollTargetingMode) {
      engine.toggleRollTargetingMode(false);
    }
    updateBuilderUI();
  }

  panel.querySelectorAll<HTMLButtonElement>(".dice-icon-btn").forEach((btn) => {
    btn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const type = btn.getAttribute("data-dice");
      if (!type || !type.startsWith("d")) return;
      const rollRes = parseAndRollDice("1" + type, selectedRollIcon);
      if (!rollRes) return;
      const newMsg: ChatMessage = {
        id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        timestamp: Date.now(),
        senderPeerId: sessionManager.myPeerId || "local",
        senderUsername: sessionManager.myUsername || "Me",
        content: rollRes,
        type: "roll",
        rollIcon: selectedRollIcon
      };
      sessionManager.dispatchOperation({
        opType: "APPEND_CHAT_MESSAGE",
        message: newMsg
      });
    });

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const type = btn.getAttribute("data-dice");
      if (!type) return;
      if (type === "+1") {
        builderState.mod += 1;
      } else if (type === "-1") {
        builderState.mod -= 1;
      } else if (type in builderState) {
        builderState[type] += 1;
      }
      updateBuilderUI();
    });
  });

  targetBtnEl.addEventListener("click", (e) => {
    e.stopPropagation();
    if (engine) {
      engine.toggleRollTargetingMode();
      if (engine.isRollTargetingMode) {
        showTargetingToast("Token Targeting ON: Click tokens on the map to target for the next roll");
      }
    }
  });

  if (engine) {
    engine.onRollTargetingChanged((active, targets) => {
      if (active || targets.size > 0) {
        targetBtnEl.style.background = "rgba(244, 63, 94, 0.45)";
        targetBtnEl.style.borderColor = "#f43f5e";
        targetBtnEl.style.color = "#ffffff";
        targetBtnEl.style.boxShadow = "0 0 10px rgba(244, 63, 94, 0.5)";
        if (targets.size > 0) {
          targetBtnEl.textContent = `🎯 (${targets.size})`;
        } else {
          targetBtnEl.textContent = "🎯";
        }
      } else {
        targetBtnEl.style.background = "";
        targetBtnEl.style.borderColor = "";
        targetBtnEl.style.color = "";
        targetBtnEl.style.boxShadow = "";
        targetBtnEl.textContent = "🎯";
      }
    });
  }

  clearBtnEl.addEventListener("click", (e) => {
    e.stopPropagation();
    resetBuilderState();
  });

  labelInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      rollBtnEl.click();
    }
  });

  rollBtnEl.addEventListener("click", (e) => {
    e.stopPropagation();
    const expr = formatBuilderExpression();
    if (!expr) return;
    const label = labelInputEl.value.trim();
    const rollRes = parseAndRollDice(expr, selectedRollIcon);
    if (!rollRes) return;

    const targetTokenIds = engine && engine.rollTargetTokenIds.size > 0 ? Array.from(engine.rollTargetTokenIds) : undefined;

    const newMsg: ChatMessage = {
      id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      senderPeerId: sessionManager.myPeerId || "local",
      senderUsername: sessionManager.myUsername || "Me",
      content: rollRes,
      type: "roll",
      rollLabel: label || undefined,
      rollIcon: selectedRollIcon,
      targetTokenIds
    };

    sessionManager.dispatchOperation({
      opType: "APPEND_CHAT_MESSAGE",
      message: newMsg
    });

    if (label) {
      saveQuickRoll(label, expr, selectedRollIcon);
    }

    resetBuilderState();
  });



  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && inputEl.value.trim()) {
      const val = inputEl.value.trim();
      inputEl.value = "";
      whisperSelectorEl.style.display = "none";

      const keyMatch = val.match(/^\/key(?:\s+(.+))?$/i);
      if (keyMatch) {
        const arg = (keyMatch[1] || "").trim();
        if (!arg || arg.toLowerCase() === "help") {
          const helpMsg: ChatMessage = {
            id: "sys-" + Date.now(),
            timestamp: Date.now(),
            senderPeerId: "system",
            senderUsername: "System",
            content: `🔑 **API Key Management:**<br/>• <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: underline;">Get a free Gemini API key ↗</a><br/>• Type <code>/key xxxxxxxxxxxx</code> to set and save your Gemini API key.<br/>• Type <code>/key delete</code> to remove your stored API key.`,
            type: "system"
          };
          sessionManager.dispatchOperation({ opType: "APPEND_CHAT_MESSAGE", message: helpMsg });
          return;
        }

        if (arg.toLowerCase() === "delete" || arg.toLowerCase() === "remove" || arg.toLowerCase() === "clear") {
          localStorage.removeItem("gemini_api_key");
          localStorage.removeItem("gemini_enhance_last_failed");
          (window as any).__geminiApiKeyInMemory = null;
          const sysMsg: ChatMessage = {
            id: "sys-" + Date.now(),
            timestamp: Date.now(),
            senderPeerId: "system",
            senderUsername: "System",
            content: `🗑️ **Gemini API Key Removed**<br/>Your API key has been deleted from memory and local storage.`,
            type: "system"
          };
          sessionManager.dispatchOperation({ opType: "APPEND_CHAT_MESSAGE", message: sysMsg });
          return;
        }

        localStorage.setItem("gemini_api_key", arg);
        localStorage.removeItem("gemini_enhance_last_failed");
        (window as any).__geminiApiKeyInMemory = arg;
        const sysMsg: ChatMessage = {
          id: "sys-" + Date.now(),
          timestamp: Date.now(),
          senderPeerId: "system",
          senderUsername: "System",
          content: `✅ **Gemini API Key Saved!**<br/>Your API key (ending in <code>...${arg.slice(-4)}</code>) has been securely saved in local storage and memory.`,
          type: "system"
        };
        sessionManager.dispatchOperation({ opType: "APPEND_CHAT_MESSAGE", message: sysMsg });
        return;
      }

      const whisperMatch = val.match(/^\/(?:whisper|w)\b(?:\s+(.*))?$/i);
      if (whisperMatch) {
        const rest = (whisperMatch[1] || "").trim();
        const activeUsers = sessionManager.getActiveUsers();
        const sortedUsers = [...activeUsers].sort((a, b) => b.username.length - a.username.length);
        let targetUser: { username: string; peerId?: string; color: string } | null = null;
        let messageContent = "";

        for (const u of sortedUsers) {
          if (rest.toLowerCase().startsWith(u.username.toLowerCase())) {
            if (rest.length === u.username.length || /\s/.test(rest.charAt(u.username.length))) {
              targetUser = u;
              messageContent = rest.substring(u.username.length).trim();
              break;
            }
          }
        }

        if (!targetUser && rest) {
          const firstWord = rest.split(/\s+/)[0];
          const firstMatch = activeUsers.find((u) => u.username.toLowerCase() === firstWord.toLowerCase());
          if (firstMatch) {
            targetUser = firstMatch;
            messageContent = rest.substring(firstWord.length).trim();
          }
        }

        if (!targetUser) {
          const enteredName = rest ? rest.split(/\s+/)[0] : "";
          const errMsg: ChatMessage = {
            id: "sys-" + Date.now(),
            timestamp: Date.now(),
            senderPeerId: "system",
            senderUsername: "System",
            content: enteredName
              ? `❌ **Whisper Error:** No connected user named '<code>${enteredName}</code>' found. Please select or enter an active username.`
              : `❌ **Whisper Error:** Please specify a username to whisper to. (e.g. <code>/whisper Alice Hello!</code>)`,
            type: "system"
          };
          sessionManager.dispatchOperation({ opType: "APPEND_CHAT_MESSAGE", message: errMsg });
          return;
        }

        if (!messageContent) {
          const errMsg: ChatMessage = {
            id: "sys-" + Date.now(),
            timestamp: Date.now(),
            senderPeerId: "system",
            senderUsername: "System",
            content: `❌ **Whisper Error:** Please enter a message to whisper to <strong>${targetUser.username}</strong>. (e.g. <code>/whisper ${targetUser.username} Hello!</code>)`,
            type: "system"
          };
          sessionManager.dispatchOperation({ opType: "APPEND_CHAT_MESSAGE", message: errMsg });
          return;
        }

        const whisperMsg: ChatMessage = {
          id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          timestamp: Date.now(),
          senderPeerId: sessionManager.myPeerId || "local",
          senderUsername: sessionManager.myUsername || "Me",
          content: messageContent,
          type: "whisper",
          recipientPeerId: targetUser.peerId || targetUser.username,
          recipientUsername: targetUser.username
        };

        sessionManager.dispatchOperation({
          opType: "APPEND_CHAT_MESSAGE",
          message: whisperMsg
        });
        return;
      }

      if (/^\/enhance$/i.test(val)) {
        const activate = () => {
          if (engine) {
            engine.setTool("enhance");
            const sysMsg: ChatMessage = {
              id: "sys-" + Date.now(),
              timestamp: Date.now(),
              senderPeerId: "system",
              senderUsername: "System",
              content: `✨ <strong>AI Map Enhancement (/enhance) Activated!</strong><br/>Drag a rectangle on the canvas over your sketch and fills to generate a stunning AI battlemap.`,
              type: "system"
            };
            sessionManager.dispatchOperation({ opType: "APPEND_CHAT_MESSAGE", message: sysMsg });
          }
        };

        openGeminiApiKeyModal(activate);
        return;
      }

      if (/^\/clear$/i.test(val)) {
        if (sessionManager.role === "host" || sessionManager.myPeerId === docStore.getDocument().documentId) {
          sessionManager.dispatchOperation({ opType: "CLEAR_CHAT_HISTORY" } as any);
        } else {
          container.innerHTML = "";
        }
        return;
      }

      if (/^\/sheet$/i.test(val)) {
        openCharacterSheetModal(engine);
        return;
      }

      if (/^\/resync$/i.test(val)) {
        const sysMsg: ChatMessage = {
          id: "sys-" + Date.now(),
          timestamp: Date.now(),
          senderPeerId: "system",
          senderUsername: "System",
          content: `🔄 Requesting full state resync from peers...`,
          type: "system"
        };
        sessionManager.dispatchOperation({ opType: "APPEND_CHAT_MESSAGE", message: sysMsg });
        sessionManager.resyncState().then(() => {
          const doneMsg: ChatMessage = {
            id: "sys-" + Date.now() + "-done",
            timestamp: Date.now(),
            senderPeerId: "system",
            senderUsername: "System",
            content: `✅ Resync complete!`,
            type: "system"
          };
          sessionManager.dispatchOperation({ opType: "APPEND_CHAT_MESSAGE", message: doneMsg });
        }).catch((err) => {
          console.error("[Resync] Error:", err);
        });
        return;
      }

      if (/^\/(help|\?)$/i.test(val)) {
        const helpMsg: ChatMessage = {
          id: "sys-" + Date.now(),
          timestamp: Date.now(),
          senderPeerId: "system",
          senderUsername: "System",
          content: `<div style="font-size: 12px; line-height: 1.4; display: flex; flex-direction: column; gap: 6px;">
  <div style="font-weight: 700; color: #38bdf8; border-bottom: 1px solid rgba(56, 189, 248, 0.3); padding-bottom: 2px;">💬 Commands</div>
  <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; align-items: baseline;">
    <code>/r &lt;expr&gt;</code><span>Roll dice or trigger QuickRoll by name (e.g. <code>/r 2d6+4</code> or <code>/r Fireball</code>)</span>
    <code>/sheet</code><span>Open character sheet (Name, Portrait, Inventory, Notes & all 12 Named Rolls)</span>
    <code>/whisper &lt;user&gt; &lt;msg&gt;</code><span>Whisper private message to connected user (shorthand <code>/w</code>)</span>
    <code>/key &lt;apikey&gt;</code><span>Set Gemini API key in memory & storage (or <code>/key delete</code>)</span>
    <code>/enhance</code><span>AI map enhancement from selection sketch & fills</span>
    <code>/flip</code><span>Flip a coin (Heads/Tails)</span>
    <code>/me &lt;act&gt;</code><span>Roleplay emote action</span>
    <code>/room</code><span>Show room code link &nbsp;•&nbsp; <code>/clear</code>: Clear view &nbsp;•&nbsp; <code>/resync</code>: Resync state</span>
  </div>
  <div style="font-weight: 700; color: #38bdf8; border-bottom: 1px solid rgba(56, 189, 248, 0.3); padding-bottom: 2px; margin-top: 4px;">🎯 QuickRolls & Target Selection</div>
  <div>• Click <strong>🎯</strong> before rolling to select map target tokens.</div>
  <div>• <strong>Long-press</strong> any QuickRoll button to enter targeting mode for that saved roll!</div>
</div>`,
          type: "system"
        };
        sessionManager.dispatchOperation({ opType: "APPEND_CHAT_MESSAGE", message: helpMsg });
        return;
      }

      let content = val;
      let msgType: ChatMessage["type"] = "text";
      let rollLabel: string | undefined = undefined;
      let rollExpr: string | undefined = undefined;

      const rollMatch = val.match(/^(.*?)(?:\/(?:roll|r)\b\s*|\/r\s*)(.+)$/i);
      if (rollMatch) {
        let labelText = rollMatch[1].trim();
        let expr = rollMatch[2].trim();

        if (!labelText) {
          const doc = docStore.getDocument();
          const username = sessionManager.myUsername || "Me";
          const userQuickRolls = doc.quickRolls?.[username] || [];
          const matchedQr = userQuickRolls.find((qr) => qr.label.trim().toLowerCase() === expr.trim().toLowerCase());
          if (matchedQr) {
            executeQuickRollItem(matchedQr);
            return;
          }

          const commentMatch = expr.match(/^([0-9dD+\-\s]+?)\s*(?:[#:\-]|--)\s*(.+)$/);
          if (commentMatch) {
            expr = commentMatch[1].trim();
            labelText = commentMatch[2].trim();
          } else {
            const spaceMatch = expr.match(/^([0-9dD+\-\s]+?)\s+([a-zA-Z].*)$/);
            if (spaceMatch) {
              expr = spaceMatch[1].trim();
              labelText = spaceMatch[2].trim();
            }
          }
        }
        const rollRes = parseAndRollDice(expr, selectedRollIcon);
        if (rollRes) {
          content = rollRes;
          msgType = "roll";
          rollExpr = expr;
          if (labelText) {
            rollLabel = labelText;
          }
        }
      } else if (/^\/flip$/i.test(val)) {
        const result = Math.random() < 0.5 ? "Heads" : "Tails";
        content = `🪙 Coin Flip: **${result}**`;
        msgType = "roll";
      } else if (/^\/me\s+/i.test(val)) {
        content = `*${val.replace(/^\/me\s+/i, "")}*`;
        msgType = "action";
      } else if (/^\/room$/i.test(val)) {
        content = `Room Code: **${sessionManager.hostRoomId || "Local / Host Not Started"}**`;
        msgType = "system";
      }

      const newMsg: ChatMessage = {
        id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        timestamp: Date.now(),
        senderPeerId: sessionManager.myPeerId || "local",
        senderUsername: sessionManager.myUsername || "Me",
        content,
        type: msgType,
        rollLabel,
        rollIcon: msgType === "roll" ? (/^\/flip$/i.test(val) ? COIN_ICON_SVG : selectedRollIcon) : undefined
      };

      sessionManager.dispatchOperation({
        opType: "APPEND_CHAT_MESSAGE",
        message: newMsg
      });

      if (rollLabel && rollExpr) {
        saveQuickRoll(rollLabel, rollExpr, selectedRollIcon);
      }
    }
  });

  const animatedRollMsgIds = new Set<string>();
  const activeRollIntervals = new Map<string, any>();
  let isFirstChatRender = true;
  let simpleToastTimeout: any = null;

  function showSimpleModeChatToast(msg: ChatMessage) {
    if (!(window as any).vttSimpleMode) return;
    const isChatHidden = panel.classList.contains("minimized") || panel.style.display === "none";
    if (!isChatHidden) return;

    let toastEl = document.getElementById("simple-mode-chat-toast");
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "simple-mode-chat-toast";
      toastEl.style.cssText = `
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        max-width: calc(100vw - 32px);
        width: 360px;
        background: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(56, 189, 248, 0.4);
        border-radius: 14px;
        padding: 12px 16px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
        display: flex;
        flex-direction: column;
        gap: 4px;
        pointer-events: auto;
        cursor: pointer;
        transition: opacity 0.2s ease, transform 0.2s ease;
      `;
      toastEl.addEventListener("click", () => {
        if (typeof (window as any).toggleVttChat === "function") {
          (window as any).toggleVttChat();
        }
        if (simpleToastTimeout) clearTimeout(simpleToastTimeout);
        toastEl?.remove();
      });
      document.body.appendChild(toastEl);
    }

    if (simpleToastTimeout) clearTimeout(simpleToastTimeout);

    const doc = docStore.getDocument();
    const senderUser = doc.users[msg.senderPeerId];
    const userColor = senderUser?.color || (msg.senderPeerId === (sessionManager.myPeerId || "local") ? sessionManager.myColor : "#38bdf8") || "#38bdf8";

    let contentHtml = formatLinks(msg.content);
    if (msg.type === "roll") {
      const iconToUse = msg.rollIcon || ALL_ROLL_ICONS[0];
      contentHtml = `${iconToUse} ${msg.rollLabel ? `<strong>${formatLinks(msg.rollLabel)}</strong>: ` : ""}${formatLinks(msg.content)}`;
    } else if (msg.type === "action") {
      contentHtml = `<em>* ${msg.senderUsername} ${formatLinks(msg.content)} *</em>`;
    } else if (msg.type === "whisper") {
      contentHtml = `<span style="color: #e879f9; font-weight: 800;">🔮 Whisper:</span> ${formatLinks(msg.content)}`;
    }

    toastEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 700; color: ${userColor};">
        <span>${msg.senderUsername || "User"}</span>
        <span style="color: #64748b; font-size: 10px;">Click to open</span>
      </div>
      <div style="color: #f8fafc; font-size: 13px; word-break: break-word; line-height: 1.4;">
        ${contentHtml}
      </div>
    `;

    toastEl.setAttribute("data-msg-id", msg.id);
    toastEl.style.opacity = "1";
    toastEl.style.display = "flex";

    if (msg.type === "roll" && msg.rollIcon) {
      const effId = getEffectIdForIcon(msg.rollIcon);
      if (effId && !toastEl.querySelector(".play-roll-anim-btn")) {
        const replayBtn = document.createElement("button");
        replayBtn.className = "play-roll-anim-btn";
        replayBtn.setAttribute("data-effect-id", effId);
        replayBtn.title = "Replay Animation";
        replayBtn.style.cssText = "position: absolute; bottom: 4px; right: 8px; background: transparent; border: none; color: #38bdf8; font-size: 11px; padding: 4px 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; transition: transform 0.15s ease, filter 0.15s ease;";
        replayBtn.textContent = "▶";
        replayBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          EffectEngine.playOverElement(toastEl, effId);
          playEffectAtUserToken(engine, docStore.getDocument(), msg.senderUsername, msg.senderPeerId, effId, msg.targetTokenIds);
          sessionManager.sendEphemeral({
            type: "REPLAY_ANIMATION",
            msgId: msg.id,
            effectId: effId,
            senderUsername: msg.senderUsername,
            senderPeerId: msg.senderPeerId,
            targetTokenIds: msg.targetTokenIds
          });
        });
        toastEl.appendChild(replayBtn);
      }
    }

    simpleToastTimeout = setTimeout(() => {
      toastEl?.remove();
    }, 4000);
  }

  // Subscribe to reactive document updates
  docStore.subscribe((doc) => {
    if (isFirstChatRender) {
      doc.chatHistory.forEach((msg) => {
        if (msg.type === "roll") animatedRollMsgIds.add(msg.id);
      });
      isFirstChatRender = false;
      console.log("[DiceAnimation] Initialized chat render. Existing roll messages marked as already animated:", animatedRollMsgIds.size);
    }

    const newCount = doc.chatHistory.length;
    const isChatHidden = panel.classList.contains("minimized") || panel.style.display === "none";
    if (newCount > lastMessageCount && isChatHidden && lastMessageCount > 0) {
      unreadCount += newCount - lastMessageCount;
      badgeEl.style.display = "inline-block";
      badgeEl.textContent = String(unreadCount);

      if ((window as any).vttSimpleMode) {
        const latestMsg = doc.chatHistory[doc.chatHistory.length - 1];
        if (latestMsg) {
          const myId = sessionManager.myPeerId || "local";
          const myName = (sessionManager.myUsername || "Me").toLowerCase();
          const isWhisper = latestMsg.type === "whisper" || latestMsg.recipientPeerId || latestMsg.recipientUsername;
          const canSee = !isWhisper || (latestMsg.senderPeerId === myId || latestMsg.senderUsername?.toLowerCase() === myName || latestMsg.recipientPeerId === myId || latestMsg.recipientUsername?.toLowerCase() === myName);
          if (canSee) {
            showSimpleModeChatToast(latestMsg);
          }
        }
      }
    }
    lastMessageCount = newCount;
    renderQuickRolls();

    const myId = sessionManager.myPeerId || "local";
    const myName = (sessionManager.myUsername || "Me").toLowerCase();
    const visibleHistory = doc.chatHistory.filter((msg) => {
      if (msg.type === "whisper" || msg.recipientPeerId || msg.recipientUsername) {
        const isSender = (msg.senderPeerId === myId) || (msg.senderUsername?.toLowerCase() === myName);
        const isRecipient = (msg.recipientPeerId && msg.recipientPeerId === myId) || (msg.recipientUsername && msg.recipientUsername.toLowerCase() === myName);
        return isSender || isRecipient;
      }
      return true;
    });

    if (visibleHistory.length === 0) {
      container.innerHTML = "";
      animatedRollMsgIds.clear();
      activeRollIntervals.forEach(clearInterval);
      activeRollIntervals.clear();
      return;
    } else {
      const existingIds = new Set(visibleHistory.map((m) => m.id));
      container.querySelectorAll(".chat-msg").forEach((el) => {
        const id = el.getAttribute("data-msg-id");
        if (id && !existingIds.has(id)) {
          el.remove();
        }
      });
    }

    // Smart DOM reconciliation so active roll animations are never destroyed midway by document updates
    visibleHistory.forEach((msg) => {
      const existingEl = container.querySelector(`[data-msg-id="${msg.id}"]`) as HTMLElement | null;
      const hasReactions = (msg.thumbsUp || 0) > 0 || (msg.thumbsDown || 0) > 0 || (msg.laugh || 0) > 0 || (msg.celebrate || 0) > 0;

      if (existingEl) {
        // Update reactions on existing elements without touching actively animating or completed message text
        const reactionsEl = existingEl.querySelector<HTMLElement>(".chat-reactions");
        if (reactionsEl) {
          reactionsEl.style.display = hasReactions ? "flex" : "none";
          const upBtn = reactionsEl.querySelector('[data-reaction="up"] span');
          const downBtn = reactionsEl.querySelector('[data-reaction="down"] span');
          const laughBtn = reactionsEl.querySelector('[data-reaction="laugh"] span');
          const celebBtn = reactionsEl.querySelector('[data-reaction="celebrate"] span');
          if (upBtn) upBtn.textContent = String(msg.thumbsUp || 0);
          if (downBtn) downBtn.textContent = String(msg.thumbsDown || 0);
          if (laughBtn) laughBtn.textContent = String(msg.laugh || 0);
          if (celebBtn) celebBtn.textContent = String(msg.celebrate || 0);
        }

        // Guarantee that if the roll animation is already completed or not active, the afterSpan total is never stuck hidden
        if (msg.type === "roll" && !activeRollIntervals.has(msg.id)) {
          const afterSpan = existingEl.querySelector<HTMLElement>(".roll-after-equals");
          if (afterSpan && (afterSpan.style.display === "none" || afterSpan.style.opacity === "0")) {
            console.log("[DiceAnimation] Reconciling existing completed roll - revealing afterSpan total for:", msg.id);
            afterSpan.style.removeProperty("display");
            afterSpan.style.removeProperty("opacity");
            afterSpan.style.display = "inline-block";
            afterSpan.style.opacity = "1";
          }
        }

        if (msg.type === "roll" && msg.rollIcon && getEffectIdForIcon(msg.rollIcon)) {
          const effId = getEffectIdForIcon(msg.rollIcon);
          if (effId && !existingEl.querySelector(".play-roll-anim-btn")) {
            existingEl.style.position = "relative";
            existingEl.style.paddingRight = "32px";
            const replayBtn = document.createElement("button");
            replayBtn.className = "play-roll-anim-btn";
            replayBtn.setAttribute("data-effect-id", effId);
            replayBtn.title = "Replay Animation";
            replayBtn.style.cssText = "position: absolute; bottom: 4px; right: 6px; background: transparent; border: none; color: #38bdf8; font-size: 11px; padding: 4px 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; transition: transform 0.15s ease, filter 0.15s ease;";
            replayBtn.textContent = "▶";
            replayBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              EffectEngine.playOverElement(existingEl, effId);
              playEffectAtUserToken(engine, docStore.getDocument(), msg.senderUsername, msg.senderPeerId, effId, msg.targetTokenIds);
              sessionManager.sendEphemeral({
                type: "REPLAY_ANIMATION",
                msgId: msg.id,
                effectId: effId,
                senderUsername: msg.senderUsername,
                senderPeerId: msg.senderPeerId,
                targetTokenIds: msg.targetTokenIds
              });
            });
            existingEl.appendChild(replayBtn);
          }
        }
        return;
      }

      // Create new message element
      const msgEl = document.createElement("div");
      msgEl.setAttribute("data-msg-id", msg.id);
      msgEl.className = `chat-msg ${msg.type === "roll" ? "roll" : ""}`;
      if (msg.type === "system") {
        msgEl.className = "chat-msg system";
        msgEl.innerHTML = formatLinks(msg.content);
        container.appendChild(msgEl);
        container.scrollTop = container.scrollHeight;
        return;
      }

      msgEl.title = "Click message to show/hide reactions";

      const senderUser = doc.users[msg.senderPeerId];
      const userColor = senderUser?.color || (msg.senderPeerId === (sessionManager.myPeerId || "local") ? sessionManager.myColor : "#38bdf8") || "#38bdf8";

      if (msg.type === "roll") {
        const { r, g, b } = hexToRgb(userColor);
        msgEl.style.background = `rgba(${r}, ${g}, ${b}, 0.15)`;
        msgEl.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.4)`;
        msgEl.style.color = userColor;
      } else if (msg.type === "whisper") {
        msgEl.style.background = "rgba(168, 85, 247, 0.18)";
        msgEl.style.borderColor = "rgba(192, 132, 252, 0.6)";
        msgEl.style.boxShadow = "inset 0 0 12px rgba(168, 85, 247, 0.25)";
      }

      let displayContent = msg.content;
      if (msg.type === "roll") {
        displayContent = displayContent
          .replace(/\*\*/g, "")
          .replace(/\bTotal:\s*/gi, "")
          .replace(/\bRolled\s+/gi, "");
      }

      const isNewRoll =
        msg.type === "roll" &&
        !animatedRollMsgIds.has(msg.id) &&
        displayContent.includes("=") &&
        displayContent.includes("[");

      let formattedText = formatLinks(displayContent);
      if (isNewRoll) {
        const eqMatch = displayContent.match(/(\s*=\s*)<span/i);
        const eqIdx = eqMatch && eqMatch.index !== undefined ? eqMatch.index : displayContent.indexOf("=");
        const beforeEquals = displayContent.substring(0, eqIdx);
        const afterEquals = displayContent.substring(eqIdx);
        formattedText = `<span class="roll-before-equals" data-final="${encodeURIComponent(beforeEquals)}">${formatLinks(beforeEquals)}</span><span class="roll-after-equals" style="display: none; opacity: 0;">${formatLinks(afterEquals)}</span>`;
        console.log("[DiceAnimation] Formatted new roll spans - beforeEquals:", beforeEquals, "afterEquals:", afterEquals);
      }

      const isMySender = msg.senderPeerId === (sessionManager.myPeerId || "local") || msg.senderUsername?.toLowerCase() === (sessionManager.myUsername || "Me").toLowerCase();
      const authorText = msg.type === "whisper"
        ? `<span style="color: #e879f9; font-weight: 800;">🔮 Whisper ${isMySender ? `to <strong>${msg.recipientUsername || "user"}</strong>` : `from <strong>${msg.senderUsername}</strong>`}</span>`
        : `<span style="color: ${userColor}">${msg.senderUsername}${msg.rollLabel ? ` - <span style="color: #cbd5e1; font-weight: normal;">${formatLinks(msg.rollLabel)}</span>` : ""}</span>`;

      msgEl.innerHTML = `
        <div class="msg-author">${authorText}</div>
        <div class="msg-text" ${msg.type === "whisper" ? 'style="color: #f8fafc; font-style: italic;"' : ''}>${formattedText}</div>
        <div class="chat-reactions" style="display: ${hasReactions ? "flex" : "none"};">
          <button class="chat-reaction-btn" data-reaction="up" data-id="${msg.id}" title="Thumbs Up">
            👍 <span>${msg.thumbsUp || 0}</span>
          </button>
          <button class="chat-reaction-btn" data-reaction="down" data-id="${msg.id}" title="Thumbs Down">
            👎 <span>${msg.thumbsDown || 0}</span>
          </button>
          <button class="chat-reaction-btn" data-reaction="laugh" data-id="${msg.id}" title="Laugh / LOL">
            😂 <span>${msg.laugh || 0}</span>
          </button>
          <button class="chat-reaction-btn" data-reaction="celebrate" data-id="${msg.id}" title="Celebrate">
            🎉 <span>${msg.celebrate || 0}</span>
          </button>
        </div>
        ${msg.type === "roll" && msg.rollIcon && getEffectIdForIcon(msg.rollIcon) ? `
          <button class="play-roll-anim-btn" data-effect-id="${getEffectIdForIcon(msg.rollIcon)}" title="Replay Animation" style="position: absolute; bottom: 4px; right: 6px; background: transparent; border: none; color: #38bdf8; font-size: 11px; padding: 4px 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; transition: transform 0.15s ease, filter 0.15s ease;">▶</button>
        ` : ""}
      `;

      container.appendChild(msgEl);
      container.scrollTop = container.scrollHeight;

      if (msg.type === "roll" && msg.rollIcon && getEffectIdForIcon(msg.rollIcon)) {
        msgEl.style.position = "relative";
        msgEl.style.paddingRight = "32px";
        const replayBtn = msgEl.querySelector<HTMLButtonElement>(".play-roll-anim-btn");
        if (replayBtn) {
          replayBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const effId = replayBtn.getAttribute("data-effect-id");
            if (effId) {
              EffectEngine.playOverElement(msgEl, effId);
              playEffectAtUserToken(engine, docStore.getDocument(), msg.senderUsername, msg.senderPeerId, effId, msg.targetTokenIds);
              sessionManager.sendEphemeral({
                type: "REPLAY_ANIMATION",
                msgId: msg.id,
                effectId: effId,
                senderUsername: msg.senderUsername,
                senderPeerId: msg.senderPeerId,
                targetTokenIds: msg.targetTokenIds
              });
            }
          });
        }
      }

      if (isNewRoll) {
        animatedRollMsgIds.add(msg.id);
        const beforeSpan = msgEl.querySelector<HTMLElement>(".roll-before-equals");
        const afterSpan = msgEl.querySelector<HTMLElement>(".roll-after-equals");
        if (!beforeSpan || !afterSpan) {
          console.error("[DiceAnimation] Error: Could not locate beforeSpan or afterSpan inside msgEl for:", msg.id);
          if (msg.rollIcon) {
            const effectId = getEffectIdForIcon(msg.rollIcon);
            if (effectId) {
              EffectEngine.playOverElement(msgEl, effectId);
              playEffectAtUserToken(engine, docStore.getDocument(), msg.senderUsername, msg.senderPeerId, effectId, msg.targetTokenIds);
            }
          }
          return;
        }

        const finalBefore = decodeURIComponent(beforeSpan.getAttribute("data-final") || "");
        const diceSides: number[] = [];
        const diceMatches = finalBefore.matchAll(/(\d*)d(\d+)/gi);
        for (const m of diceMatches) {
          diceSides.push(parseInt(m[2], 10));
        }

        console.log("[DiceAnimation] Starting 1-second rapid rolling animation for message:", msg.id, "Sides:", diceSides);

        if (msg.rollIcon) {
          const effectId = getEffectIdForIcon(msg.rollIcon);
          if (effectId) {
            EffectEngine.playOverElement(msgEl, effectId);
            playEffectAtUserToken(engine, docStore.getDocument(), msg.senderUsername, msg.senderPeerId, effectId, msg.targetTokenIds);
          }
        }

        let frame = 0;
        const totalFrames = 20;
        const interval = setInterval(() => {
          frame++;
          if (frame >= totalFrames) {
            clearInterval(interval);
            activeRollIntervals.delete(msg.id);
            beforeSpan.innerHTML = finalBefore;

            // Force reflow and clear restrictions before applying punch tween
            afterSpan.style.removeProperty("display");
            afterSpan.style.removeProperty("opacity");
            afterSpan.style.display = "inline-block";
            afterSpan.style.opacity = "1";
            void afterSpan.offsetWidth;
            afterSpan.classList.add("roll-punch-anim");

            container.scrollTop = container.scrollHeight;
            console.log("[DiceAnimation] Finished animation for message:", msg.id, "- afterSpan diagnostics -> innerHTML:", afterSpan.innerHTML, "display:", afterSpan.style.display, "opacity:", afterSpan.style.opacity, "rect:", afterSpan.getBoundingClientRect());
            return;
          }

          let bracketIdx = 0;
          const randomized = finalBefore.replace(/\[([0-9,\s]+)\]/g, (match, numsStr) => {
            const sides = diceSides[bracketIdx] || 20;
            bracketIdx++;
            const nums = numsStr.split(",").map((s: string) => {
              const trimmed = s.trim();
              if (!trimmed || isNaN(Number(trimmed))) return s;
              const r = Math.floor(Math.random() * sides) + 1;
              return r.toString();
            });
            return `[${nums.join(", ")}]`;
          });

          let displaySpinning = randomized;
          if (displaySpinning.includes("CRIT!") || displaySpinning.includes("NOPE")) {
            const iconToRestore = msg.rollIcon || ALL_ROLL_ICONS[0];
            displaySpinning = displaySpinning.replace(/<strong[^>]*>.*?CRIT!.*?<\/strong>|<strong[^>]*>.*?NOPE.*?<\/strong>/i, iconToRestore);
          }
          beforeSpan.innerHTML = displaySpinning;
        }, 50);

        activeRollIntervals.set(msg.id, interval);
      }
    });
  });

  container.addEventListener("click", (e) => {
    const targetEl = e.target as HTMLElement;

    // Do not toggle reactions if selecting text or clicking a link
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) {
      return;
    }
    if (targetEl.closest("a")) {
      return;
    }

    const btn = targetEl.closest(".chat-reaction-btn");
    if (btn) {
      const msgId = btn.getAttribute("data-id");
      const reaction = btn.getAttribute("data-reaction");
      if (!msgId || !reaction) return;

      const doc = docStore.getDocument();
      const msg = doc.chatHistory.find((m) => m.id === msgId);
      if (!msg) return;

      const currentUp = msg.thumbsUp || 0;
      const currentDown = msg.thumbsDown || 0;
      const currentLaugh = msg.laugh || 0;
      const currentCeleb = msg.celebrate || 0;
      let patch: Partial<ChatMessage> = {};
      if (reaction === "up") patch = { thumbsUp: currentUp + 1 };
      else if (reaction === "down") patch = { thumbsDown: currentDown + 1 };
      else if (reaction === "laugh") patch = { laugh: currentLaugh + 1 };
      else if (reaction === "celebrate") patch = { celebrate: currentCeleb + 1 };

      sessionManager.dispatchOperation({
        opType: "UPDATE_CHAT_MESSAGE",
        id: msgId,
        patch
      });
      return;
    }

    const msgBox = targetEl.closest(".chat-msg");
    if (msgBox) {
      const reactionsBox = msgBox.querySelector<HTMLElement>(".chat-reactions");
      if (reactionsBox) {
        reactionsBox.style.display = reactionsBox.style.display === "none" ? "flex" : "none";
      }
    }
  });

  function updateChatWindowOcclusion(): void {
    if (panel.classList.contains("minimized") || window.innerWidth <= 768 || panel.style.display === "none") {
      panel.style.bottom = "";
      return;
    }

    const bottomToolbar = document.querySelector<HTMLElement>(".bottom-toolbar");
    const selectionToolbar = document.querySelector<HTMLElement>("#selection-toolbar");

    const panelRect = panel.getBoundingClientRect();
    if (panelRect.width === 0 || panelRect.height === 0) return;

    let maxOccludingTop = 0;

    const checkToolbar = (tb: HTMLElement | null) => {
      if (!tb || tb.style.display === "none") return;
      const tbRect = tb.getBoundingClientRect();
      if (tbRect.width === 0 || tbRect.height === 0) return;

      const horizontalOverlap = tbRect.right > panelRect.left - 10 && tbRect.left < panelRect.right + 10;
      if (horizontalOverlap) {
        if (tbRect.top < maxOccludingTop || maxOccludingTop === 0) {
          maxOccludingTop = tbRect.top;
        }
      }
    };

    checkToolbar(bottomToolbar);
    checkToolbar(selectionToolbar);

    if (maxOccludingTop > 0) {
      const newBottomOffset = Math.max(24, Math.round(window.innerHeight - maxOccludingTop + 14));
      const maxAllowedBottom = Math.max(24, window.innerHeight - 200);
      const appliedBottom = Math.min(newBottomOffset, maxAllowedBottom);
      panel.style.bottom = `${appliedBottom}px`;
    } else {
      panel.style.bottom = "";
    }
  }

  window.addEventListener("resize", updateChatWindowOcclusion);
  setInterval(updateChatWindowOcclusion, 200);
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => updateChatWindowOcclusion());
    ro.observe(document.body);
    ro.observe(panel);
  }
  updateChatWindowOcclusion();
}
