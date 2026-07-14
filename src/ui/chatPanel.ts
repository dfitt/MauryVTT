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
    const match = cmd.match(/^\/roll\s+(\d+)d(\d+)([\+\-]\d+)?/i);
    if (!match) return null;

    const count = Math.min(parseInt(match[1], 10), 50);
    const sides = parseInt(match[2], 10);
    const mod = match[3] ? parseInt(match[3], 10) : 0;

    const rolls: number[] = [];
    let sum = 0;
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * sides) + 1;
      rolls.push(r);
      sum += r;
    }
    const total = sum + mod;
    return `🎲 Rolled ${count}d${sides}${match[3] || ""}: [${rolls.join(", ")}]${mod ? ` (${mod >= 0 ? "+" : ""}${mod})` : ""} = Total: **${total}**`;
  }

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && inputEl.value.trim()) {
      const val = inputEl.value.trim();
      inputEl.value = "";

      let content = val;
      let msgType: ChatMessage["type"] = "text";

      if (val.startsWith("/roll")) {
        const rollRes = parseAndRollDice(val);
        if (rollRes) {
          content = rollRes;
          msgType = "roll";
        }
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
        return `
          <div class="chat-msg ${msg.type === "roll" ? "roll" : ""}">
            <div class="msg-author" style="color: #38bdf8">${msg.senderUsername}</div>
            <div class="msg-text">${msg.content}</div>
            <div class="chat-reactions">
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
    const btn = (e.target as HTMLElement).closest(".chat-reaction-btn");
    if (!btn) return;
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
  });
}
