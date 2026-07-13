import { sessionManager } from "../network/sessionManager.js";

const SWATCH_COLORS = [
  "#38bdf8", // Cyan
  "#f43f5e", // Rose
  "#eab308", // Yellow
  "#10b981", // Emerald
  "#a855f7", // Violet
  "#f97316"  // Orange
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

  let selectedColor = SWATCH_COLORS[0];

  overlay.innerHTML = `
    <div class="modal-box">
      <h2 class="modal-title">MAURY VTT / P2P TABLETOP</h2>
      
      <div class="form-group">
        <label class="form-label">Your Username</label>
        <input type="text" id="join-username" class="form-input" placeholder="e.g. DungeonMaster / Alice" value="Traveler_${Math.floor(Math.random() * 90 + 10)}" />
      </div>

      <div class="form-group">
        <label class="form-label">Display Color</label>
        <div class="color-swatches" id="swatch-container"></div>
      </div>

      <div class="form-group">
        <label class="form-label">Join Room Code (Optional)</label>
        <input type="text" id="join-room-code" class="form-input" placeholder="Leave blank to Host New Room" />
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
  SWATCH_COLORS.forEach((color, idx) => {
    const swatch = document.createElement("div");
    swatch.className = `color-swatch ${idx === 0 ? "active" : ""}`;
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
  if (codeFromUrl) {
    roomInput.value = codeFromUrl;
  }

  overlay.querySelector("#btn-host-new")!.addEventListener("click", async () => {
    const username = usernameInput.value.trim() || "Host";
    await sessionManager.startAsHost(username, selectedColor);
    overlay.remove();
    window.dispatchEvent(new Event("resize"));
    onJoined();
  });

  overlay.querySelector("#btn-join-room")!.addEventListener("click", async () => {
    const username = usernameInput.value.trim() || "Guest";
    const code = roomInput.value.trim();
    if (!code) {
      alert("Please enter a Room Code to join an existing session!");
      return;
    }
    try {
      await sessionManager.joinAsClient(code, username, selectedColor);
      overlay.remove();
      window.dispatchEvent(new Event("resize"));
      onJoined();
    } catch (err) {
      alert("Failed to connect to room: " + err);
    }
  });
}
