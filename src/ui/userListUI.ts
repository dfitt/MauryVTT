import { docStore } from "../state/documentStore.js";
import { sessionManager } from "../network/sessionManager.js";
import { exportVTTDocArchive, importVTTDocArchive } from "../archive/vttdocArchive.js";

export function setupHeaderUI(): void {
  const header = document.createElement("div");
  header.className = "top-header";
  header.innerHTML = `
    <div class="brand-section">
      <div class="brand-icon">M</div>
      <div class="brand-title">MAURY VTT</div>
      <div class="room-badge" id="room-code-badge" style="display: none;">
        <span>Room: <strong id="room-id-txt">---</strong></span>
        <button class="copy-btn" id="copy-room-btn">Copy Link</button>
      </div>
    </div>
    <div class="header-actions">
      <button id="btn-open-archive" class="btn-glass">📂 Open .vttdoc</button>
      <button id="btn-save-archive" class="btn-glass btn-primary">💾 Save VTT Document</button>
    </div>
  `;

  document.body.appendChild(header);

  const badgeEl = header.querySelector<HTMLElement>("#room-code-badge")!;
  const roomTxtEl = header.querySelector<HTMLElement>("#room-id-txt")!;
  const copyBtn = header.querySelector<HTMLButtonElement>("#copy-room-btn")!;

  setInterval(() => {
    if (sessionManager.hostRoomId) {
      badgeEl.style.display = "flex";
      roomTxtEl.textContent = sessionManager.hostRoomId;
    }
  }, 1000);

  copyBtn.title = "Copy invite link with room code";
  copyBtn.addEventListener("click", () => {
    if (sessionManager.hostRoomId) {
      const origin = window.location.origin;
      const pathname = window.location.pathname.replace(/\/$/, "");
      const fullJoinUrl = `${origin}${pathname}/?room=${encodeURIComponent(sessionManager.hostRoomId)}`;
      navigator.clipboard.writeText(fullJoinUrl);
      copyBtn.textContent = "Copied Link!";
      setTimeout(() => (copyBtn.textContent = "Copy Link"), 2000);
    }
  });

  header.querySelector("#btn-save-archive")!.addEventListener("click", async () => {
    try {
      await exportVTTDocArchive();
    } catch (err) {
      alert("Error exporting VTT document: " + err);
    }
  });

  header.querySelector("#btn-open-archive")!.addEventListener("click", async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".vttdoc,.zip";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        await importVTTDocArchive(file);
        alert("VTT Document loaded successfully! You can now host or edit this session.");
      } catch (err) {
        alert("Error loading .vttdoc file: " + err);
      }
    };
    input.click();
  });
}
