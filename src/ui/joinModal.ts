import { sessionManager } from "../network/sessionManager.js";

const SWATCH_COLORS = [
  "#38bdf8", // Cyan
  "#f43f5e", // Rose
  "#eab308", // Yellow
  "#10b981", // Emerald
  "#a855f7", // Violet
  "#f97316", // Orange
  "#ec4899", // Pink
  "#84cc16", // Lime
  "#6366f1"  // Indigo
];

function getRoomCodeFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get("room") || params.get("code");
  if (roomParam) return roomParam.trim();

  const searchRaw = window.location.search.substring(1).trim();
  if (searchRaw && !searchRaw.includes("=")) {
    return searchRaw;
  }

  const hashRaw = window.location.hash.substring(1).replace(/^room=/, "").trim();
  if (hashRaw) return hashRaw;

  return "";
}

export function renderJoinModal(onJoined: () => void): void {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "vtt-join-modal";

  const savedUsername = localStorage.getItem("maury_vtt_username");
  const savedColor = localStorage.getItem("maury_vtt_color");
  let selectedColor = savedColor && SWATCH_COLORS.includes(savedColor) ? savedColor : SWATCH_COLORS[0];

  const defaultUser = savedUsername || `Traveler_${Math.floor(Math.random() * 90 + 10)}`;

  overlay.innerHTML = `
    <div class="modal-box">
      <h2 class="modal-title">MAURY VTT / P2P TABLETOP</h2>
      
      <div class="form-group">
        <label class="form-label">Your Username</label>
        <input type="text" id="join-username" class="form-input" placeholder="e.g. DungeonMaster / Alice" value="${defaultUser}" />
      </div>

      <div class="form-group">
        <label class="form-label">Display Color</label>
        <div class="color-swatches" id="swatch-container"></div>
      </div>

      <div class="form-group">
        <label class="form-label">Room Code (Custom ID to Host or Code to Join)</label>
        <input type="text" id="join-room-code" class="form-input" placeholder="e.g. MY-DND-ROOM (Leave blank for random)" />
      </div>

      <div class="modal-buttons">
        <button id="btn-host-new" class="btn-glass btn-primary">Host New Room</button>
        <button id="btn-join-room" class="btn-glass">Join Room</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Render swatches
  const container = overlay.querySelector("#swatch-container")!;
  SWATCH_COLORS.forEach((color) => {
    const swatch = document.createElement("div");
    swatch.className = `color-swatch ${color === selectedColor ? "active" : ""}`;
    swatch.style.backgroundColor = color;
    swatch.addEventListener("click", () => {
      selectedColor = color;
      container.querySelectorAll(".color-swatch").forEach((el) => el.classList.remove("active"));
      swatch.classList.add("active");
    });
    container.appendChild(swatch);
  });

  const usernameInput = overlay.querySelector<HTMLInputElement>("#join-username")!;
  const roomInput = overlay.querySelector<HTMLInputElement>("#join-room-code")!;

  const codeFromUrl = getRoomCodeFromUrl();
  const lastCode = localStorage.getItem("maury_vtt_last_room_code") || "";
  if (codeFromUrl) {
    roomInput.value = codeFromUrl;
  } else if (lastCode) {
    roomInput.value = lastCode;
  }

  overlay.querySelector("#btn-host-new")!.addEventListener("click", async () => {
    const username = usernameInput.value.trim() || "Host";
    const customCode = roomInput.value.trim() || undefined;
    try {
      localStorage.setItem("maury_vtt_username", username);
      localStorage.setItem("maury_vtt_color", selectedColor);
      if (customCode) {
        localStorage.setItem("maury_vtt_last_room_code", customCode);
      }
      await sessionManager.startAsHost(username, selectedColor, customCode);
      overlay.remove();
      window.dispatchEvent(new Event("resize"));
      onJoined();
    } catch (err) {
      alert(`Could not host room '${customCode}': That Room Code is already active or taken! Please enter a different code or click 'Join Room' to join it.`);
    }
  });

  overlay.querySelector("#btn-join-room")!.addEventListener("click", async () => {
    const username = usernameInput.value.trim() || "Guest";
    const code = roomInput.value.trim();
    if (!code) {
      alert("Please enter a Room Code to join an existing session!");
      return;
    }
    try {
      localStorage.setItem("maury_vtt_username", username);
      localStorage.setItem("maury_vtt_color", selectedColor);
      localStorage.setItem("maury_vtt_last_room_code", code);
      await sessionManager.joinAsClient(code, username, selectedColor);
      overlay.remove();
      window.dispatchEvent(new Event("resize"));
      onJoined();
    } catch (err) {
      alert("Failed to connect to room: " + err);
    }
  });
}
