import { docStore } from "../state/documentStore.js";
import { sessionManager } from "../network/sessionManager.js";
import { exportVTTDocArchive, importVTTDocArchive } from "../archive/vttdocArchive.js";
import { CanvasEngine } from "../canvas/canvasEngine.js";
import { TokenEntity } from "../types/vtt.js";

export function setupHeaderUI(engine?: CanvasEngine): void {
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
      <div class="connected-users-list" id="connected-users-list"></div>
    </div>
    <div class="header-actions">
      <button id="btn-open-archive" class="btn-glass">📂 Open .vttdoc</button>
      <button id="btn-save-archive" class="btn-glass btn-primary">💾 Save VTT Document</button>
    </div>
  `;

  document.body.appendChild(header);

  const panHint = document.createElement("div");
  panHint.id = "pan-hint-banner";
  panHint.className = "pan-hint-banner";
  panHint.textContent = "right-click (or pinch) to move";
  document.body.appendChild(panHint);

  const pingHint = document.createElement("div");
  pingHint.id = "ping-hint-banner";
  pingHint.className = "pan-hint-banner";
  pingHint.style.top = "120px";
  pingHint.textContent = "double-click to ping";
  document.body.appendChild(pingHint);

  let hasPinged = false;
  const hidePingHint = () => {
    if (hasPinged) return;
    hasPinged = true;
    pingHint.classList.add("hidden");
    setTimeout(() => {
      if (pingHint.parentNode) pingHint.parentNode.removeChild(pingHint);
    }, 1000);
  };
  setTimeout(hidePingHint, 30000);

  if (engine) {
    let hasPanned = false;
    const hidePanHint = () => {
      if (hasPanned) return;
      hasPanned = true;
      panHint.classList.add("hidden");
      setTimeout(() => {
        if (panHint.parentNode) panHint.parentNode.removeChild(panHint);
      }, 1000);
      if (!hasPinged && pingHint.parentNode) {
        pingHint.style.top = "82px";
      }
    };
    engine.onPanView(() => hidePanHint());
    engine.onPingTriggered(() => hidePingHint());
  }

  if (window.innerWidth <= 768) {
    header.classList.add("header-collapsed");
  }

  const brandIconEl = header.querySelector<HTMLElement>(".brand-icon")!;
  brandIconEl.title = "Click to collapse / expand top bar";
  brandIconEl.addEventListener("click", () => {
    header.classList.toggle("header-collapsed");
  });

  const badgeEl = header.querySelector<HTMLElement>("#room-code-badge")!;
  const roomTxtEl = header.querySelector<HTMLElement>("#room-id-txt")!;
  const copyBtn = header.querySelector<HTMLButtonElement>("#copy-room-btn")!;
  const usersListEl = header.querySelector<HTMLElement>("#connected-users-list")!;

  if (engine) {
    usersListEl.addEventListener("click", (e) => {
      const pill = (e.target as HTMLElement).closest(".user-pill");
      if (!pill) return;
      const username = pill.getAttribute("data-username");
      const peerId = pill.getAttribute("data-peerid");
      if (!username) return;

      const doc = docStore.getDocument();
      let token: TokenEntity | undefined;

      if (doc.primaryTokens?.[username]) {
        const ent = doc.entities[doc.primaryTokens[username]];
        if (ent && ent.type === "token") token = ent as TokenEntity;
      }
      if (!token) {
        token = Object.values(doc.entities).find(
          (ent) => ent.type === "token" && (ent as TokenEntity).primaryOwnerUsername === username
        ) as TokenEntity | undefined;
      }
      if (!token && peerId) {
        token = Object.values(doc.entities).find(
          (ent) => ent.type === "token" && (ent as TokenEntity).ownerPeerIds?.includes(peerId)
        ) as TokenEntity | undefined;
      }

      if (token) {
        engine.zoomToWorldPos(token.position.x, token.position.y, token.id);
        engine.showToast(`Zoomed to ${username}'s primary token`);
      } else {
        engine.showToast(`${username} does not have a primary token claimed yet`);
      }
    });
  }

  setInterval(() => {
    if (sessionManager.hostRoomId) {
      badgeEl.style.display = "flex";
      roomTxtEl.textContent = sessionManager.hostRoomId;
    }

    const activeUsers = sessionManager.getActiveUsers();
    const doc = docStore.getDocument();
    const pills = activeUsers.map((u) => {
      const color = u.color || "#38bdf8";
      const hostTag = u.role === "host" ? " (Host)" : "";
      const hasToken = Boolean(
        (doc.primaryTokens?.[u.username] && doc.entities[doc.primaryTokens[u.username]]) ||
        Object.values(doc.entities).some((ent) => ent.type === "token" && ((ent as TokenEntity).primaryOwnerUsername === u.username || (u.peerId && (ent as TokenEntity).ownerPeerIds?.includes(u.peerId))))
      );
      const titleAttr = hasToken ? `Click to zoom to ${u.username}'s primary token` : `${u.username}${hostTag} (No primary token claimed)`;
      return `<span class="user-pill ${hasToken ? "user-pill-has-token" : ""}" data-username="${u.username}" data-peerid="${u.peerId || ''}" title="${titleAttr}" style="cursor: pointer; transition: transform 0.15s, background 0.15s; ${hasToken ? "border: 1px solid rgba(56, 189, 248, 0.45); box-shadow: 0 0 8px rgba(56, 189, 248, 0.2);" : ""}">
        <span class="user-pill-dot" style="background-color: ${color};"></span>
        <span>${u.username}${hostTag}</span>
      </span>`;
    });

    usersListEl.innerHTML = pills.join("");
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
