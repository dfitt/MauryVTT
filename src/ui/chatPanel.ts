import { docStore } from "../state/documentStore.js";
import { sessionManager } from "../network/sessionManager.js";
import { ChatMessage } from "../types/vtt.js";

export function setupChatPanel(): void {
  const panel = document.createElement("div");
  panel.className = "chat-window";
  panel.innerHTML = `
    <div class="chat-header">
      <span>Tabletop Chat & Dice Roller</span>
      <span style="font-size: 11px; color: var(--text-dim)">/roll 2d6+3</span>
    </div>
    <div class="chat-messages" id="chat-messages-container"></div>
    <div class="chat-input-bar">
      <input type="text" id="chat-input-el" class="chat-input" placeholder="Type a message or /roll 1d20..." />
    </div>
  `;

  document.body.appendChild(panel);

  const container = panel.querySelector("#chat-messages-container")!;
  const inputEl = panel.querySelector<HTMLInputElement>("#chat-input-el")!;

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
    container.innerHTML = doc.chatHistory
      .map((msg) => {
        if (msg.type === "system") {
          return `<div class="chat-msg system">${msg.content}</div>`;
        }
        return `
          <div class="chat-msg ${msg.type === "roll" ? "roll" : ""}">
            <div class="msg-author" style="color: #38bdf8">${msg.senderUsername}</div>
            <div class="msg-text">${msg.content}</div>
          </div>
        `;
      })
      .join("");
    container.scrollTop = container.scrollHeight;
  });
}
