import { docStore } from "../state/documentStore.js";
import { sessionManager } from "../network/sessionManager.js";
import { ChatMessage } from "../types/vtt.js";

export function setupChatPanel(): void {
  const panel = document.createElement("div");
  panel.className = "chat-window";
  panel.id = "vtt-chat-panel";

  if (window.innerWidth <= 768) {
    panel.classList.add("minimized");
  }

  panel.innerHTML = `
    <div class="chat-header" id="chat-header-bar" title="Click to Minimize / Expand Chat">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>💬 Chat & Dice</span>
        <span class="chat-unread-badge" id="chat-unread-badge" style="display: none;">0</span>
      </div>
      <button class="chat-toggle-btn" id="btn-toggle-chat" title="Toggle Chat Window">${panel.classList.contains("minimized") ? "▲" : "▼"}</button>
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

  let unreadCount = 0;
  let lastMessageCount = 0;

  function toggleChat() {
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

  function parseAndRollDice(cmd: string): string | null {
    const rawExpr = cmd.replace(/^\/(roll|r)\s+/i, "").replace(/\s+/g, "");
    if (!rawExpr) return null;

    const tokenRegex = /([+-]?)([^+-]+)/g;
    let match;
    let total = 0;
    const breakdowns: string[] = [];
    let valid = false;

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

        const rolls: number[] = [];
        let sum = 0;
        for (let i = 0; i < count; i++) {
          const r = Math.floor(Math.random() * sides) + 1;
          rolls.push(r);
          sum += r;
        }
        total += sign * sum;
        const prefix = breakdowns.length === 0 ? (sign === -1 ? "-" : "") : (sign === -1 ? " - " : " + ");
        breakdowns.push(`${prefix}${count}d${sides}[${rolls.join(", ")}]`);
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
    return `🎲 Rolled **${rawExpr}**: ${breakdowns.join("")} = Total: **${total}**`;
  }

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && inputEl.value.trim()) {
      const val = inputEl.value.trim();
      inputEl.value = "";

      if (/^\/clear$/i.test(val)) {
        container.innerHTML = "";
        return;
      }

      if (/^\/(help|\?)$/i.test(val)) {
        const helpMsg: ChatMessage = {
          id: "sys-" + Date.now(),
          timestamp: Date.now(),
          senderPeerId: "system",
          senderUsername: "System",
          content: `**Commands:**<br/>• <code>/roll &lt;expr&gt;</code> (or <code>/r</code>): Roll dice (e.g. <code>/r 1d6+3d4+12</code> or <code>/r d20+5</code>)<br/>• <code>/flip</code>: Flip a coin (Heads/Tails)<br/>• <code>/me &lt;action&gt;</code>: Roleplay emote action<br/>• <code>/room</code>: Show room code link<br/>• <code>/clear</code>: Clear local chat view`,
          type: "system"
        };
        sessionManager.dispatchOperation({ opType: "APPEND_CHAT_MESSAGE", message: helpMsg });
        return;
      }

      let content = val;
      let msgType: ChatMessage["type"] = "text";

      if (/^\/(roll|r)\s+/i.test(val)) {
        const rollRes = parseAndRollDice(val);
        if (rollRes) {
          content = rollRes;
          msgType = "roll";
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
        type: msgType
      };

      sessionManager.dispatchOperation({
        opType: "APPEND_CHAT_MESSAGE",
        message: newMsg
      });
    }
  });

  // Subscribe to reactive document updates
  docStore.subscribe((doc) => {
    const newCount = doc.chatHistory.length;
    if (newCount > lastMessageCount && panel.classList.contains("minimized") && lastMessageCount > 0) {
      unreadCount += newCount - lastMessageCount;
      badgeEl.style.display = "inline-block";
      badgeEl.textContent = String(unreadCount);
    }
    lastMessageCount = newCount;

    container.innerHTML = doc.chatHistory
      .map((msg) => {
        if (msg.type === "system") {
          return `<div class="chat-msg system">${msg.content}</div>`;
        }
        const hasReactions = (msg.thumbsUp || 0) > 0 || (msg.thumbsDown || 0) > 0;
        return `
          <div class="chat-msg ${msg.type === "roll" ? "roll" : ""}" style="cursor: pointer;" title="Click message to show/hide reactions">
            <div class="msg-author" style="color: #38bdf8">${msg.senderUsername}</div>
            <div class="msg-text">${msg.content}</div>
            <div class="chat-reactions" style="display: ${hasReactions ? "flex" : "none"};">
              <button class="chat-reaction-btn" data-reaction="up" data-id="${msg.id}" title="Thumbs Up">
                👍 <span>${msg.thumbsUp || 0}</span>
              </button>
              <button class="chat-reaction-btn" data-reaction="down" data-id="${msg.id}" title="Thumbs Down">
                👎 <span>${msg.thumbsDown || 0}</span>
              </button>
            </div>
          </div>
        `;
      })
      .join("");
    container.scrollTop = container.scrollHeight;
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
      const patch = reaction === "up" ? { thumbsUp: currentUp + 1 } : { thumbsDown: currentDown + 1 };

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
