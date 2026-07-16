import { docStore } from "../state/documentStore.js";
import { sessionManager } from "../network/sessionManager.js";
import { ChatMessage } from "../types/vtt.js";
import { EffectEngine } from "../effects/effectEngine.js";
import { getEffectIdForIcon } from "../effects/effectDefs.js";

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

export function setupChatPanel(): void {
  const panel = document.createElement("div");
  panel.className = "chat-window";
  panel.id = "vtt-chat-panel";

  if (window.innerWidth <= 768) {
    panel.classList.add("minimized");
  }

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
          <button class="btn-glass" id="dice-builder-icon-btn" data-tooltip="Choose Icon for this Roll & QuickRoll" style="padding: 6px 10px; font-size: 1.1em; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 6px;">🎲</button>
          <button class="btn-glass btn-primary" id="dice-builder-roll-btn" style="flex: 1; padding: 6px;">Roll</button>
          <button class="btn-glass" id="dice-builder-clear-btn" style="flex: 1; padding: 6px;">Clear</button>
        </div>
        <div id="dice-builder-icon-popover" style="display: none; width: 100%; box-sizing: border-box; background: rgba(15, 23, 42, 0.98); border: 1px solid rgba(56, 189, 248, 0.6); border-radius: 8px; padding: 8px; flex-direction: column; gap: 8px; box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.5);">
          <div id="popover-nav-header" style="display: flex; align-items: center; justify-content: space-between; width: 100%; border-bottom: 1px solid rgba(56, 189, 248, 0.2); padding-bottom: 4px;">
            <button id="popover-prev-btn" class="btn-glass" style="padding: 2px 10px; font-size: 0.9em; cursor: pointer; border-radius: 4px;" title="Previous Page">◀</button>
            <span id="popover-page-txt" style="font-size: 0.8em; color: #94a3b8; font-weight: 600;">Page 1</span>
            <button id="popover-next-btn" class="btn-glass" style="padding: 2px 10px; font-size: 0.9em; cursor: pointer; border-radius: 4px;" title="Next Page">▶</button>
          </div>
          <div id="popover-icon-grid" style="display: flex; flex-direction: row; justify-content: center; flex-wrap: wrap; gap: 8px;"></div>
        </div>
      </div>
    </div>
    <div class="chat-messages" id="chat-messages-container"></div>
    <div class="chat-input-bar">
      <input type="text" id="chat-input-el" class="chat-input" placeholder="Type a message or /roll 1d20..." />
    </div>
  `;

  document.body.appendChild(panel);

  const container = panel.querySelector("#chat-messages-container")!;
  const inputEl = panel.querySelector<HTMLInputElement>("#chat-input-el")!;
  const headerBar = panel.querySelector<HTMLElement>("#chat-header-bar")!;
  const toggleBtn = panel.querySelector<HTMLButtonElement>("#btn-toggle-chat")!;
  const badgeEl = panel.querySelector<HTMLElement>("#chat-unread-badge")!;
  const quickRollsContainerEl = panel.querySelector<HTMLElement>("#quickrolls-container")!;

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
  const rollBtnEl = panel.querySelector<HTMLButtonElement>("#dice-builder-roll-btn")!;
  const clearBtnEl = panel.querySelector<HTMLButtonElement>("#dice-builder-clear-btn")!;

  const iconBtnEl = panel.querySelector<HTMLButtonElement>("#dice-builder-icon-btn")!;
  const iconPopoverEl = panel.querySelector<HTMLElement>("#dice-builder-icon-popover")!;
  let selectedRollIcon = "🎲";

  const ALL_ROLL_ICONS = [
    "🎲", "⚔️", "🏹", "🔥", "✨", "🗡️", "✝️",
    `<span style='display:inline-block; transform:rotate(180deg); filter:invert(1);'>✝️</span>`,
    `<svg viewBox="0 0 64 64" width="1.1em" height="1.1em" style="vertical-align:middle; display:inline-block;"><circle cx="26" cy="42" r="16" fill="#92400e" stroke="#78350f" stroke-width="2"/><circle cx="26" cy="42" r="6" fill="#451a03"/><path d="M36 32 L54 14 L58 18 L40 36 Z" fill="#d97706"/><path d="M52 12 L58 18 L62 14 L56 8 Z" fill="#78350f"/><line x1="22" y1="46" x2="56" y2="12" stroke="#fef08a" stroke-width="1"/><line x1="26" y1="48" x2="58" y2="16" stroke="#fef08a" stroke-width="1"/></svg>`,
    "⚡",
    `<span style='display:inline-block; color:#22c55e; filter:drop-shadow(0 0 4px rgba(34,197,94,0.85));'>☁️</span>`,
    "🛡️", "❄️", "👁️", "💀", "🚫", "🌿", "🧠", "💫", "💢", "🌀", "⏳", "🕊️", "🎯", "🍄", "🔮", "🏮", "🕸️", "🍷", "🐺", "🦋", "🪵", "🐐", "🐈", "🔔", "🦉", "🪃", "🤺",
    "👑", "🧙", "🏰", "☄️", "🌪️", "🌌", "🎇", "🌟", "🌋", "☢️", "💠"
  ];

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
        const chosen = decodeURIComponent(swatch.getAttribute("data-icon") || "🎲");
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

  function saveQuickRoll(label: string, expr: string, icon: string = "🎲"): void {
    const cleanLabel = label.trim();
    const cleanExpr = expr.trim();
    const username = sessionManager.myUsername || "Me";
    if (!cleanLabel || !cleanExpr || !username) return;

    const doc = docStore.getDocument();
    const list = doc.quickRolls?.[username] ? [...doc.quickRolls[username]] : [];

    const filtered = list.filter((q) => q.label.toLowerCase() !== cleanLabel.toLowerCase());
    filtered.unshift({ label: cleanLabel, expr: cleanExpr, icon });
    const trimmed = filtered.slice(0, 20);

    sessionManager.dispatchOperation({
      opType: "UPDATE_QUICK_ROLLS",
      username,
      quickRolls: trimmed
    });

    renderQuickRolls();
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
            <span style="color: #38bdf8; font-size: 1.1em;">${qr.icon || "🎲"}</span>
            <strong style="font-weight: 600;">${qr.label}</strong>
            <span style="color: #94a3b8; font-size: 0.8em;">(${qr.expr})</span>
          </button>
        `
      )
      .join("");

    quickRollsContainerEl.querySelectorAll<HTMLButtonElement>(".quickroll-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute("data-idx") || "-1", 10);
        const qr = list[idx];
        if (!qr) return;

        const rollRes = parseAndRollDice(qr.expr, qr.icon || "🎲");
        if (!rollRes) return;

        const newMsg: ChatMessage = {
          id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          timestamp: Date.now(),
          senderPeerId: sessionManager.myPeerId || "local",
          senderUsername: sessionManager.myUsername || "Me",
          content: rollRes,
          type: "roll",
          rollLabel: qr.label,
          rollIcon: qr.icon || "🎲"
        };

        sessionManager.dispatchOperation({
          opType: "APPEND_CHAT_MESSAGE",
          message: newMsg
        });

        saveQuickRoll(qr.label, qr.expr, qr.icon || "🎲");
      });
    });
  }

  function updateBuilderUI(): void {
    const expr = formatBuilderExpression();
    if (!expr) {
      detailsEl.style.display = "none";
    } else {
      if (detailsEl.style.display === "none") {
        selectedRollIcon = "🎲";
        iconBtnEl.innerHTML = "🎲";
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

  function resetBuilderState(): void {
    for (const key of Object.keys(builderState)) {
      builderState[key] = 0;
    }
    labelInputEl.value = "";
    selectedRollIcon = "🎲";
    iconBtnEl.innerHTML = "🎲";
    if (iconPopoverEl) {
      iconPopoverEl.style.display = "none";
      renderPopoverPage();
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

    const newMsg: ChatMessage = {
      id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      senderPeerId: sessionManager.myPeerId || "local",
      senderUsername: sessionManager.myUsername || "Me",
      content: rollRes,
      type: "roll",
      rollLabel: label || undefined,
      rollIcon: selectedRollIcon
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

  function parseAndRollDice(cmd: string, customIcon: string = "🎲"): string | null {
    const rawExpr = cmd.replace(/^\/(roll|r)\s+/i, "").replace(/\s+/g, "");
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
    let rollIcon = customIcon || "🎲";
    if (hasD20) {
      if (hasNat20) {
        rollIcon = '<strong style="color: #4ade80; font-weight: 900; letter-spacing: 0.5px;">CRIT!</strong>';
      } else if (hasNat1) {
        rollIcon = '<strong style="color: #f87171; font-weight: 900; letter-spacing: 0.5px;">NOPE</strong>';
      }
    }
    return `${rollIcon} ${rawExpr}: ${breakdowns.join("")} = <span style="color: #ffffff; font-weight: 800; font-size: 1.15em; text-shadow: 0 0 6px rgba(255, 255, 255, 0.35);">${total}</span>`;
  }

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && inputEl.value.trim()) {
      const val = inputEl.value.trim();
      inputEl.value = "";

      if (/^\/clear$/i.test(val)) {
        if (sessionManager.role === "host" || sessionManager.myPeerId === docStore.getDocument().documentId) {
          sessionManager.dispatchOperation({ opType: "CLEAR_CHAT_HISTORY" } as any);
        } else {
          container.innerHTML = "";
        }
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
          content: `**Commands:**<br/>• <code>/roll &lt;expr&gt;</code> (or <code>/r</code>): Roll dice (e.g. <code>/r 1d6+3d4+12</code> or <code>/r d20+5</code>)<br/>• <code>/flip</code>: Flip a coin (Heads/Tails)<br/>• <code>/me &lt;action&gt;</code>: Roleplay emote action<br/>• <code>/room</code>: Show room code link<br/>• <code>/clear</code>: Clear local chat view<br/>• <code>/resync</code>: Resync full state with peers`,
          type: "system"
        };
        sessionManager.dispatchOperation({ opType: "APPEND_CHAT_MESSAGE", message: helpMsg });
        return;
      }

      let content = val;
      let msgType: ChatMessage["type"] = "text";
      let rollLabel: string | undefined = undefined;
      let rollExpr: string | undefined = undefined;

      const rollMatch = val.match(/^(.*?)(?:\/(?:roll|r)\s+)(.+)$/i);
      if (rollMatch) {
        let labelText = rollMatch[1].trim();
        let expr = rollMatch[2].trim();
        if (!labelText) {
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
        rollIcon: msgType === "roll" ? (/^\/flip$/i.test(val) ? "🪙" : selectedRollIcon) : undefined
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

    let contentHtml = msg.content;
    if (msg.type === "roll") {
      const iconToUse = msg.rollIcon || "🎲";
      contentHtml = `${iconToUse} ${msg.rollLabel ? `<strong>${msg.rollLabel}</strong>: ` : ""}${msg.content}`;
    } else if (msg.type === "action") {
      contentHtml = `<em>* ${msg.senderUsername} ${msg.content} *</em>`;
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

    toastEl.style.opacity = "1";
    toastEl.style.display = "flex";

    if (msg.type === "roll" && msg.rollIcon) {
      const effectId = getEffectIdForIcon(msg.rollIcon);
      if (effectId) {
        EffectEngine.playOverElement(toastEl, effectId);
      }
    }

    simpleToastTimeout = setTimeout(() => {
      if (toastEl) {
        toastEl.style.opacity = "0";
        setTimeout(() => {
          if (toastEl && toastEl.style.opacity === "0") {
            toastEl.remove();
          }
        }, 200);
      }
    }, 2000);
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
          showSimpleModeChatToast(latestMsg);
        }
      }
    }
    lastMessageCount = newCount;
    renderQuickRolls();

    if (doc.chatHistory.length === 0) {
      container.innerHTML = "";
      animatedRollMsgIds.clear();
      activeRollIntervals.forEach(clearInterval);
      activeRollIntervals.clear();
      return;
    } else {
      const existingIds = new Set(doc.chatHistory.map((m) => m.id));
      container.querySelectorAll(".chat-msg").forEach((el) => {
        const id = el.getAttribute("data-msg-id");
        if (id && !existingIds.has(id)) {
          el.remove();
        }
      });
    }

    // Smart DOM reconciliation so active roll animations are never destroyed midway by document updates
    doc.chatHistory.forEach((msg) => {
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

        if (msg.type === "roll" && msg.rollIcon && msg.rollIcon !== "🎲") {
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
        msgEl.innerHTML = msg.content;
        container.appendChild(msgEl);
        container.scrollTop = container.scrollHeight;
        return;
      }

      msgEl.style.cursor = "pointer";
      msgEl.title = "Click message to show/hide reactions";

      const senderUser = doc.users[msg.senderPeerId];
      const userColor = senderUser?.color || (msg.senderPeerId === (sessionManager.myPeerId || "local") ? sessionManager.myColor : "#38bdf8") || "#38bdf8";

      if (msg.type === "roll") {
        const { r, g, b } = hexToRgb(userColor);
        msgEl.style.background = `rgba(${r}, ${g}, ${b}, 0.15)`;
        msgEl.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.4)`;
        msgEl.style.color = userColor;
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

      let formattedText = displayContent;
      if (isNewRoll) {
        const eqMatch = displayContent.match(/(\s*=\s*)<span/i);
        const eqIdx = eqMatch && eqMatch.index !== undefined ? eqMatch.index : displayContent.indexOf("=");
        const beforeEquals = displayContent.substring(0, eqIdx);
        const afterEquals = displayContent.substring(eqIdx);
        formattedText = `<span class="roll-before-equals" data-final="${encodeURIComponent(beforeEquals)}">${beforeEquals}</span><span class="roll-after-equals" style="display: none; opacity: 0;">${afterEquals}</span>`;
        console.log("[DiceAnimation] Formatted new roll spans - beforeEquals:", beforeEquals, "afterEquals:", afterEquals);
      }

      msgEl.innerHTML = `
        <div class="msg-author" style="color: ${userColor}">${msg.senderUsername}${msg.rollLabel ? ` - <span style="color: #cbd5e1; font-weight: normal;">${msg.rollLabel}</span>` : ""}</div>
        <div class="msg-text">${formattedText}</div>
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
        ${msg.type === "roll" && msg.rollIcon && msg.rollIcon !== "🎲" && getEffectIdForIcon(msg.rollIcon) ? `
          <button class="play-roll-anim-btn" data-effect-id="${getEffectIdForIcon(msg.rollIcon)}" title="Replay Animation" style="position: absolute; bottom: 4px; right: 6px; background: transparent; border: none; color: #38bdf8; font-size: 11px; padding: 4px 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; transition: transform 0.15s ease, filter 0.15s ease;">▶</button>
        ` : ""}
      `;

      container.appendChild(msgEl);
      container.scrollTop = container.scrollHeight;

      if (msg.type === "roll" && msg.rollIcon && msg.rollIcon !== "🎲" && getEffectIdForIcon(msg.rollIcon)) {
        msgEl.style.position = "relative";
        msgEl.style.paddingRight = "32px";
        const replayBtn = msgEl.querySelector<HTMLButtonElement>(".play-roll-anim-btn");
        if (replayBtn) {
          replayBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const effId = replayBtn.getAttribute("data-effect-id");
            if (effId) {
              EffectEngine.playOverElement(msgEl, effId);
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
            const iconToRestore = msg.rollIcon || "🎲";
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
}
