import { CanvasEngine } from "../canvas/canvasEngine.js";
import { ImageEntity, VTTDocument, ChatMessage } from "../types/vtt.js";
import { docStore } from "../state/documentStore.js";
import { assetStore } from "../state/idbAssetStore.js";
import { sessionManager } from "../network/sessionManager.js";
import { hostEngine } from "../network/p2pHost.js";
import { processImageFile } from "../canvas/imageResizer.js";

export interface DmConvoEntry {
  dmNote: string;
  dmResponse: string;
  timestamp: number;
}

export function getDmConvoHistory(): DmConvoEntry[] {
  try {
    const raw = localStorage.getItem("gemini_dm_convo_history");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDmConvoEntry(dmNote: string, dmResponse: string): void {
  const history = getDmConvoHistory();
  history.push({ dmNote, dmResponse, timestamp: Date.now() });
  if (history.length > 15) history.shift();
  try {
    localStorage.setItem("gemini_dm_convo_history", JSON.stringify(history));
  } catch {
    // ignore
  }
}

export async function callGeminiDmAssistantTextGen(
  apiKey: string,
  modelName: string,
  dmNote: string,
  worldDesc: string,
  roomDesc: string,
  convoHistory: DmConvoEntry[]
): Promise<string> {
  const modelsToTry = [
    "gemini-3.6-flash",
    modelName,
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-3.1-flash-image",
    "gemini-2.0-flash-exp"
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  let formattedConvo = "";
  if (convoHistory && convoHistory.length > 0) {
    formattedConvo = "All Previous Conversation History (DM Notes & Responses):\n" +
      convoHistory.map((entry, idx) => `[Generation ${idx + 1}]\nDM Note: "${entry.dmNote}"\nDM Response: "${entry.dmResponse}"`).join("\n\n") + "\n\n";
  }

  const promptText = `You are an expert tabletop RPG Dungeon Master Assistant. Your task is to brainstorm 1 to 3 creative, surprising, and fun story ideas or encounter hooks for the DM to present to the players in this room. Keep the response succinct so the DM can digest it in 5 seconds.

${formattedConvo}CURRENT SCENE CONTEXT:
World Description: "${worldDesc}"
Room Description: "${roomDesc}"
Current DM Note: "${dmNote}"

TASK:
Provide 1 to 3 bulleted DM Response ideas for this room.
IMPORTANT FORMATTING INSTRUCTION:
Each bullet MUST start with a short, punchy 2-4 word bold title in double asterisks, followed by a colon and brief description.
Example format:
- **Hidden Goblins:** This room looks empty and safe, but goblins cling to the dark ceiling rafters waiting to ambush.
- **Trapped Statue:** The jewel in the statue's eye triggers a poisoned dart wall when touched.`;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const payload = {
        contents: [
          {
            parts: [{ text: promptText }]
          }
        ]
      };
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;
      if (text) {
        return text.trim();
      }
    } catch (e) {
      console.warn(`[DMAssistant] Error calling ${model}:`, e);
    }
  }
  throw new Error("Could not generate DM Assistant response from Gemini API.");
}

export function sendDmAssistantWhisper(
  dmResponse: string,
  recipientPeerId?: string,
  recipientUsername?: string,
  customMsgId?: string
): void {
  const myId = recipientPeerId || sessionManager.myPeerId || "local";
  const myUsername = recipientUsername || sessionManager.myUsername || "Me";

  const rawLines = dmResponse
    .trim()
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const formattedIdeas = rawLines
    .map((line) => {
      // 1. Strip leading bullet markers (-, *, •, numbers)
      let cleanLine = line.replace(/^([\*\-\•]|\d+\.)\s*/, "");

      // 2. Convert markdown bold **Title** to <strong>Title</strong>
      cleanLine = cleanLine.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

      // 3. Fallback: if line does not already contain <strong>, but has a colon "Title: Description", bold the Title
      if (!cleanLine.includes("<strong>") && cleanLine.includes(":")) {
        const colonIdx = cleanLine.indexOf(":");
        const title = cleanLine.substring(0, colonIdx).trim();
        const rest = cleanLine.substring(colonIdx + 1).trim();
        if (title.length > 0 && title.length < 50) {
          cleanLine = `<strong>${title}:</strong> ${rest}`;
        }
      }

      return `• ${cleanLine}`;
    })
    .join("<br/><br/>");

  const whisperMsg: ChatMessage = {
    id: customMsgId || ("whisper-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6)),
    timestamp: Date.now(),
    senderPeerId: "system",
    senderUsername: "🧙 DM Assistant",
    recipientPeerId: myId,
    recipientUsername: myUsername,
    content: `🧙 <strong>DM Assistant Story Ideas:</strong><br/><br/>${formattedIdeas}`,
    type: "whisper"
  };

  sessionManager.dispatchOperation({
    opType: "APPEND_CHAT_MESSAGE",
    message: whisperMsg
  });
}

export function openGeminiApiKeyModal(onSuccess?: () => void): void {
  let modalEl = document.getElementById("vtt-gemini-apikey-modal");
  if (!modalEl) {
    modalEl = document.createElement("div");
    modalEl.id = "vtt-gemini-apikey-modal";
    modalEl.style.cssText = "position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 99999;";
    document.body.appendChild(modalEl);
  }

  const currentKey = localStorage.getItem("gemini_api_key") || "";
  const currentModel = localStorage.getItem("gemini_enhance_model") || "gemini-3.1-flash-image";
  const currentCustomPrompt = localStorage.getItem("gemini_enhance_world_desc") !== null
    ? (localStorage.getItem("gemini_enhance_world_desc") || "")
    : (localStorage.getItem("gemini_enhance_custom_prompt") || "");

  modalEl.innerHTML = `
    <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(192, 132, 252, 0.5); border-radius: 12px; padding: 24px; max-width: 480px; width: 90%; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.8); color: #f8fafc; font-family: sans-serif; display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 24px;">✨</span>
        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #c084fc;">ai Map ENHANCE (/enhance)</h3>
      </div>
      <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
        To generate enhanced tabletop battlemaps from your sketches and fills, please verify your configuration below.
        <br/><br/>
        <strong style="color: #38bdf8;">Privacy Guarantee:</strong> Your key is stored exclusively in your browser's local storage (<code>localStorage</code>) and is <strong>NEVER</strong> transmitted over P2P connections or saved to any VTT document.
      </p>
      
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; font-weight: 600; color: #e2e8f0;">Gemini API Key</label>
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: #38bdf8; text-decoration: underline;">Get a free API key ↗</a>
        </div>
        <input type="password" id="gemini-apikey-input" value="${currentKey}" placeholder="AIzaSy..." style="padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(192, 132, 252, 0.4); background: rgba(30, 41, 59, 0.8); color: #ffffff; font-size: 14px; outline: none;" />
      </div>

      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label style="font-size: 12px; font-weight: 600; color: #e2e8f0;">Map Description / Custom Prompt (Optional Override)</label>
        <textarea id="gemini-custom-prompt-input" rows="3" placeholder="e.g. A frozen dwarven tomb with icy pillars, glowing runes, and a chasm crossing the center..." style="padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(192, 132, 252, 0.4); background: rgba(30, 41, 59, 0.8); color: #ffffff; font-size: 13px; outline: none; resize: vertical;">${currentCustomPrompt}</textarea>
        <span style="font-size: 11px; color: #94a3b8;">If provided, your description overrides any conflicting defaults when generating the map.</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label style="font-size: 12px; font-weight: 600; color: #e2e8f0;">Model Identifier (Latest Gemini / Nano Banana 2)</label>
        <input type="text" id="gemini-model-input" value="${currentModel}" placeholder="gemini-3.1-flash-image" style="padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(192, 132, 252, 0.4); background: rgba(30, 41, 59, 0.8); color: #c084fc; font-size: 13px; outline: none;" />
        <span style="font-size: 11px; color: #94a3b8;">Default: <code>gemini-3.1-flash-image</code> (Latest Gemini / Nano Banana 2 multimodal image model)</span>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
        <button id="btn-cancel-gemini-apikey" class="btn-glass" style="padding: 8px 16px; border-radius: 8px; cursor: pointer; color: #cbd5e1;">Cancel</button>
        <button id="btn-save-gemini-apikey" class="btn-glass" style="padding: 8px 20px; border-radius: 8px; cursor: pointer; background: rgba(192, 132, 252, 0.3); border: 1px solid #c084fc; color: #ffffff; font-weight: 700; box-shadow: 0 0 12px rgba(192, 132, 252, 0.4);">Save & Activate</button>
      </div>
    </div>
  `;

  modalEl.style.display = "flex";

  const inputEl = modalEl.querySelector<HTMLInputElement>("#gemini-apikey-input")!;
  const promptInputEl = modalEl.querySelector<HTMLTextAreaElement>("#gemini-custom-prompt-input")!;
  const modelEl = modalEl.querySelector<HTMLInputElement>("#gemini-model-input")!;
  const cancelBtn = modalEl.querySelector<HTMLButtonElement>("#btn-cancel-gemini-apikey")!;
  const saveBtn = modalEl.querySelector<HTMLButtonElement>("#btn-save-gemini-apikey")!;

  cancelBtn.addEventListener("click", () => {
    modalEl?.remove();
  });

  saveBtn.addEventListener("click", () => {
    const keyVal = inputEl.value.trim();
    const modelVal = modelEl.value.trim() || "gemini-2.5-flash-image";
    const customPromptVal = promptInputEl.value.trim();
    if (!keyVal) {
      alert("Please enter a valid Gemini API Key.");
      return;
    }
    localStorage.setItem("gemini_api_key", keyVal);
    localStorage.setItem("gemini_enhance_model", modelVal);
    localStorage.setItem("gemini_enhance_world_desc", customPromptVal);
    localStorage.setItem("gemini_enhance_custom_prompt", customPromptVal);
    localStorage.removeItem("gemini_enhance_last_failed");
    modalEl?.remove();
    if (onSuccess) onSuccess();
  });
}

export function getPeerUsername(peerId: string | null): string {
  if (!peerId) return "a friend";
  const users = docStore.getDocument()?.users || {};
  if (users[peerId]?.username) {
    return users[peerId].username;
  }
  const active = sessionManager.getActiveUsers().find(u => u.peerId === peerId);
  if (active?.username) {
    return active.username;
  }
  return "a friend";
}

export function showEnhanceToast(text: string, durationMs = 8000): void {
  let toastEl = document.getElementById("vtt-enhance-toast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "vtt-enhance-toast";
    toastEl.style.cssText = "position: fixed; top: 65px; left: 50%; transform: translateX(-50%); background: rgba(192, 132, 252, 0.95); color: #ffffff; padding: 10px 20px; border-radius: 9999px; font-size: 13px; font-weight: 700; z-index: 100000; box-shadow: 0 6px 24px rgba(192, 132, 252, 0.45); pointer-events: none; transition: opacity 0.3s ease; text-align: center; max-width: 80vw;";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = text;
  toastEl.style.opacity = "1";
  toastEl.style.display = "block";
  if ((showEnhanceToast as any).timer) clearTimeout((showEnhanceToast as any).timer);
  if (durationMs > 0) {
    (showEnhanceToast as any).timer = setTimeout(() => {
      if (toastEl) toastEl.style.opacity = "0";
    }, durationMs);
  }
}

export function hasDrawingsInBox(doc: VTTDocument, box: { x: number; y: number; width: number; height: number }): boolean {
  if (!doc) return false;

  for (const ent of Object.values(doc.entities || {})) {
    if (ent.type === "line") {
      const line = ent as any;
      if (line.points && line.points.length > 0) {
        const inside = line.points.some((p: any) => {
          const px = Array.isArray(p) ? p[0] : p?.x;
          const py = Array.isArray(p) ? p[1] : p?.y;
          return (
            px !== undefined &&
            py !== undefined &&
            px >= box.x - 10 &&
            px <= box.x + box.width + 10 &&
            py >= box.y - 10 &&
            py <= box.y + box.height + 10
          );
        });
        if (inside) return true;
      }
    }
  }

  if (doc.gridCells) {
    const size = doc.canvasSettings?.gridSizePx || 50;
    for (const [key, cell] of Object.entries(doc.gridCells)) {
      if (!cell || !cell.fillColor || cell.fillColor === "fog" || cell.fogHidden) continue;
      const commaIdx = key.indexOf(",");
      if (commaIdx === -1) continue;
      const gx = Number(key.substring(0, commaIdx));
      const gy = Number(key.substring(commaIdx + 1));
      if (gx + size >= box.x && gx <= box.x + box.width && gy + size >= box.y && gy <= box.y + box.height) {
        return true;
      }
    }
  }

  return false;
}

async function callGeminiImageGeneration(
  base64Image: string,
  apiKey: string,
  modelName: string,
  overrideDesc?: string,
  boxDimensions?: { width: number; height: number },
  hasDrawings: boolean = true
): Promise<string | null> {
  const modelsToTry = [
    modelName,
    "gemini-3.1-flash-image",
    "gemini-2.5-flash-image",
    "gemini-2.0-flash-exp",
    "imagen-3.0-generate-002"
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  let boxRatio = 1.0;
  let targetW = 1024;
  let targetH = 1024;
  let aspectRatioStr = "1:1";

  if (boxDimensions && boxDimensions.width > 0 && boxDimensions.height > 0) {
    boxRatio = boxDimensions.width / boxDimensions.height;
    if (boxRatio >= 1.0) {
      targetW = 1024;
      targetH = Math.max(256, Math.round(1024 / boxRatio));
    } else {
      targetH = 1024;
      targetW = Math.max(256, Math.round(1024 * boxRatio));
    }
    if (boxRatio > 1.5) aspectRatioStr = "16:9";
    else if (boxRatio > 1.15) aspectRatioStr = "4:3";
    else if (boxRatio > 0.85) aspectRatioStr = "1:1";
    else if (boxRatio > 0.65) aspectRatioStr = "3:4";
    else aspectRatioStr = "9:16";
  }
  const imageSizeStr = `${targetW}x${targetH}`;

  const aspectInstruction = boxDimensions
    ? `\n3. CRITICAL ASPECT RATIO INSTRUCTION: The returned generated map image MUST strictly match the exact aspect ratio of the input reference image (${boxDimensions.width}x${boxDimensions.height}, aspect ratio ${boxRatio.toFixed(2)}:1). Do NOT alter the proportions, stretch, skew, square-crop, or change the spatial relative dimensions or rectangular boundaries of the rooms, corridors, or overall canvas frame!`
    : "";

  const sketchPrompt = `You are a master virtual tabletop RPG map designer specializing in classic old-school D&D cartography. Look at the provided reference image, which contains TWO types of visual content layered together:
  (A) USER SKETCH DRAWINGS: rough hand-drawn lines, shapes, and colored room fills — these are the layout blueprint for the NEW map features you must generate.
  (B) EXISTING MAP IMAGE FRAGMENTS: pre-rendered, detailed map illustrations already present on the tabletop canvas — these are sent ONLY as spatial alignment references so you can connect new features (doors, hallways, tunnels, corridors) to the correct positions on existing walls.

CRITICAL INSTRUCTION - DO NOT INCLUDE EXISTING MAP IMAGES IN YOUR OUTPUT:
1. The generated output image MUST contain ONLY the NEW map features based on the user's sketch drawings (A).
2. Do NOT redraw, replicate, copy, re-render, trace, or include ANY part of the existing map image fragments (B). Those images are already rendered on the tabletop canvas and your output will overlay them.
3. Any regions of the output image that correspond to existing map image fragments MUST be left completely blank and stark white (#FFFFFF). If an existing illustration occupies the left third of the reference image, the left third of your output MUST be stark white.
4. The existing map images are ONLY there so you know WHERE to place connecting features like doorways, openings, or corridor entrances at the correct wall positions.

OVERLAY & MODIFICATION INSTRUCTIONS:
1. YOU CAN AND SHOULD DRAW SMALL CONNECTION MODIFICATIONS on top of where existing walls are: For example, if a sketch indicates a new doorway, breach, tunnel entrance, or hole through an existing wall, draw ONLY that specific opening/modification at that location (it will render multiplicatively over the existing wall). Do NOT redraw the surrounding wall — only the new opening.
2. Apart from small connection modifications, all regions occupied by existing map images MUST remain stark white (#FFFFFF) in your output.

Generate a high-resolution, top-down, overhead 2D tabletop RPG battlemap designed in an oldschool D&D, OSR (Old School Renaissance), and Dungeon Crawl Classics (DCC) art style. The map MUST be drawn with crisp black ink on a solid, stark white (#FFFFFF) background with classic crosshatching, hand-drawn ink line walls, stippling, and retro dungeon cartography textures while preserving the exact spatial boundaries, room layouts, pathways, and alignments shown in the sketch guide and connecting to or modifying adjacent features. Even if the reference sketch has a dark background, your generated map MUST have a solid, stark white (#FFFFFF) background with black ink lines.

CRITICAL INSTRUCTIONS:
1. Do NOT draw or include any square or hexagonal grid lines, floor tile grids, flagstone grids, floor patterns, map legends, text labels, titles, keys, or compass roses on the map itself.
2. Floors MUST be mostly empty, plain, and stark white (#FFFFFF) except for important objects, furniture, debris, rubble, and decorations. Absolutely NO regular floor patterns, tiles, checkers, parquet, or grid textures are allowed on the floor because they conflict directly with the virtual tabletop software's built-in dynamic grid lines.${aspectInstruction}`;

  const noDrawingsPrompt = `You are a master virtual tabletop RPG map designer specializing in classic old-school D&D cartography. Create a brand new room section in the selection area. The provided reference image contains existing map rooms and features sent ONLY as a spatial reference so your new room can connect to them (e.g. aligning doorways, corridors, or shared walls).

CRITICAL INSTRUCTION - DO NOT REDRAW EXISTING MAP IMAGES:
1. The generated output image MUST contain ONLY the NEW room and new map features.
2. Do NOT redraw, replicate, copy, re-render, or include the existing map images/features shown in the reference image. Those existing images are already present on the tabletop canvas.
3. Any regions corresponding to the existing map images in the reference image MUST be left completely blank and stark white (#FFFFFF).

Generate a high-resolution, top-down, overhead 2D tabletop RPG battlemap section designed in an oldschool D&D, OSR (Old School Renaissance), and Dungeon Crawl Classics (DCC) art style. The map MUST be drawn with crisp black ink on a solid, stark white (#FFFFFF) background with classic crosshatching, hand-drawn ink line walls, stippling, and retro dungeon cartography textures while seamlessly connecting with adjacent doorways or corridors. Even if the reference image has a dark background, your generated map MUST have a solid, stark white (#FFFFFF) background with black ink lines.

CRITICAL INSTRUCTIONS:
1. Do NOT draw or include any square or hexagonal grid lines, floor tile grids, flagstone grids, floor patterns, map legends, text labels, titles, keys, or compass roses on the map itself.
2. Floors MUST be mostly empty, plain, and stark white (#FFFFFF) except for important objects, furniture, debris, rubble, and decorations. Absolutely NO regular floor patterns, tiles, checkers, parquet, or grid textures are allowed on the floor because they conflict directly with the virtual tabletop software's built-in dynamic grid lines.${aspectInstruction}`;

  const premadePrompt = hasDrawings ? sketchPrompt : noDrawingsPrompt;
  const customDesc = overrideDesc !== undefined ? overrideDesc.trim() : localStorage.getItem("gemini_enhance_custom_prompt")?.trim();
  const promptText = customDesc
    ? `${premadePrompt}\n\nCRITICAL USER OVERRIDE DESCRIPTION (Follow this user description strictly; if any instructions below or above conflict with this custom description, this user description takes overriding precedence):\n"${customDesc}"`
    : premadePrompt;

  console.group("[Enhance] Starting Gemini Image Generation Pipeline");
  console.log("Models queue in order:", modelsToTry);
  console.log("Input image size (base64 length):", base64Image.length, "hasDrawings:", hasDrawings);
  console.log("API Key present:", Boolean(apiKey), "Length:", apiKey ? apiKey.length : 0);

  const errorsCollected: string[] = [];

  for (const model of modelsToTry) {
    console.group(`[Enhance] Attempting model: ${model}`);
    try {
      if (model.includes("imagen")) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${encodeURIComponent(apiKey)}`;
        console.log(`Endpoint: https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`);
        const requestPayload = {
          instances: [
            {
              prompt: promptText,
              image: {
                bytesBase64Encoded: base64Image
              }
            }
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: aspectRatioStr,
            sampleImageSize: imageSizeStr,
            imageSize: imageSizeStr
          }
        };

        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload)
        });

        console.log(`HTTP Status: ${resp.status} ${resp.statusText}`);
        if (!resp.ok) {
          const errTxt = await resp.text();
          console.warn(`[Enhance] HTTP Error from ${model}:`, errTxt);
          errorsCollected.push(`[${model}] HTTP ${resp.status}: ${errTxt.substring(0, 300)}`);
          console.groupEnd();
          continue;
        }

        const data = await resp.json();
        console.log(`[Enhance] Response JSON object from ${model}:`, data);

        const base64Out = data.predictions?.[0]?.bytesBase64Encoded || data.predictions?.[0]?.mimeTypeBase64;
        if (base64Out) {
          console.log(`[Enhance] Successfully extracted base64 image output from ${model} (${base64Out.length} chars)`);
          console.groupEnd();
          console.groupEnd();
          return base64Out;
        } else {
          const warnMsg = `No predictions[0].bytesBase64Encoded found in JSON response from ${model}`;
          console.warn(`[Enhance] ${warnMsg}`, data);
          errorsCollected.push(`[${model}] ${warnMsg}`);
        }
      } else {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        console.log(`Endpoint: https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
        
        const basePayload = {
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inline_data: {
                    mime_type: "image/png",
                    data: base64Image
                  }
                }
              ]
            }
          ]
        };

        const configsToTry = [
          { responseModalities: ["IMAGE", "TEXT"], imageConfig: { imageSize: imageSizeStr, aspectRatio: aspectRatioStr } },
          { responseModalities: ["IMAGE"], imageConfig: { imageSize: imageSizeStr, aspectRatio: aspectRatioStr } },
          { responseModalities: ["IMAGE", "TEXT"] },
          { responseModalities: ["IMAGE"] },
          null // try without generationConfig if model rejects responseModalities
        ];

        for (const genCfg of configsToTry) {
          const payload = genCfg ? { ...basePayload, generationConfig: genCfg } : basePayload;
          console.log(`[Enhance] Attempting ${model} with generationConfig:`, genCfg);
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          console.log(`HTTP Status (${model}, config: ${JSON.stringify(genCfg)}): ${resp.status} ${resp.statusText}`);
          if (!resp.ok) {
            const errTxt = await resp.text();
            console.warn(`[Enhance] HTTP Error from ${model} with config ${JSON.stringify(genCfg)}:`, errTxt);
            errorsCollected.push(`[${model} | cfg: ${JSON.stringify(genCfg)}] HTTP ${resp.status}: ${errTxt.substring(0, 200)}`);
            continue;
          }

          const data = await resp.json();
          console.log(`[Enhance] Response JSON object from ${model} (config: ${JSON.stringify(genCfg)}):`, data);

          const candidate = data.candidates?.[0];
          if (candidate?.finishReason && candidate.finishReason !== "STOP") {
            console.warn(`[Enhance] Candidate finishReason is not STOP (${candidate.finishReason}). Safety ratings or block summary:`, candidate);
          }

          const parts = candidate?.content?.parts || [];
          for (const p of parts) {
            if (p.inlineData?.data) {
              console.log(`[Enhance] Successfully extracted inlineData.data from ${model} (${p.inlineData.data.length} chars)`);
              console.groupEnd();
              console.groupEnd();
              return p.inlineData.data;
            }
            if (p.inline_data?.data) {
              console.log(`[Enhance] Successfully extracted inline_data.data from ${model} (${p.inline_data.data.length} chars)`);
              console.groupEnd();
              console.groupEnd();
              return p.inline_data.data;
            }
          }
          for (const p of parts) {
            if (p.text && p.text.includes("data:image/png;base64,")) {
              const m = p.text.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
              if (m) {
                console.log(`[Enhance] Successfully extracted base64 image from text part in ${model} (${m[1].length} chars)`);
                console.groupEnd();
                console.groupEnd();
                return m[1];
              }
            }
            if (p.text) {
              console.log(`[Enhance] Model ${model} returned text instead of image:`, p.text.substring(0, 500));
            }
          }

          const warnMsg = `200 OK received but response contained no valid image data. finishReason: ${candidate?.finishReason || "unknown"}`;
          console.warn(`[Enhance] ${warnMsg}`, candidate);
          errorsCollected.push(`[${model} | cfg: ${JSON.stringify(genCfg)}] ${warnMsg}`);
        }
      }
    } catch (e: any) {
      console.warn(`[Enhance] Exception during fetch with model ${model}:`, e);
      errorsCollected.push(`[${model}] Exception: ${e.message || e}`);
    }
    console.groupEnd();
  }

  console.groupEnd();
  console.error("[Enhance] All model generation attempts failed:", errorsCollected);
  const detailedErrorSummary = errorsCollected.length > 0 ? errorsCollected[0] : "No model succeeded.";
  throw new Error(`Generation failed. Details: ${detailedErrorSummary}`);
}

export async function runGeminiMapEnhancement(
  engine: CanvasEngine,
  box: { x: number; y: number; width: number; height: number },
  overrideDesc?: string,
  dmAssistantEnabled?: boolean,
  dmNote?: string
): Promise<void> {
  const apiKey = localStorage.getItem("gemini_api_key");
  const lastFailed = localStorage.getItem("gemini_enhance_last_failed") === "true";
  if (!apiKey || lastFailed) {
    const proxyId = await checkOrFindProxyPeer();
    if (proxyId) {
      openGeminiDescriptionModal(engine, box, true, proxyId);
    } else {
      openGeminiApiKeyModal(() => openGeminiDescriptionModal(engine, box, false, null));
    }
    return;
  }

  const modelName = localStorage.getItem("gemini_enhance_model") || "gemini-3.1-flash-image";
  let finalOverrideDesc = overrideDesc;

  if (dmAssistantEnabled && dmNote && apiKey) {
    try {
      showEnhanceToast("🧙 DM Assistant brainstorming story ideas... (~3-5s)", 0);
      const convoHistory = getDmConvoHistory();
      const worldDesc = localStorage.getItem("gemini_enhance_world_desc") || "";
      const dmResponse = await callGeminiDmAssistantTextGen(apiKey, modelName, dmNote, worldDesc, overrideDesc || "", convoHistory);

      saveDmConvoEntry(dmNote, dmResponse);
      sendDmAssistantWhisper(dmResponse);

      const dmHintsBlock = `\n\nDM ASSISTANT STORY & MAP HINTS (Use these story ideas as visual hints for decorations, secret features, or layout details on the map):\nDM Note: "${dmNote}"\nDM Response Hints: "${dmResponse}"`;
      finalOverrideDesc = (overrideDesc || "") + dmHintsBlock;
    } catch (e: any) {
      console.warn("[Enhance] DM Assistant error:", e);
      showEnhanceToast("⚠️ DM Assistant error, proceeding with map generation...", 4000);
    }
  }

  const doc = docStore.getDocument();
  const hasDrawings = hasDrawingsInBox(doc, box);
  showEnhanceToast(
    hasDrawings
      ? "✨ Generating AI Overhead Map with Gemini... Please wait ~10-20s."
      : "✨ Generating AI Room Map with Gemini... Please wait ~10-20s.",
    0
  );

  try {
    const maxDim = 1024;
    const scale = Math.min(maxDim / box.width, maxDim / box.height, 2.0);
    const canvasW = Math.max(64, Math.round(box.width * scale));
    const canvasH = Math.max(64, Math.round(box.height * scale));

    const offscreen = document.createElement("canvas");
    offscreen.width = canvasW;
    offscreen.height = canvasH;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) throw new Error("Could not create 2D canvas context");

    offCtx.fillStyle = doc.canvasSettings?.backgroundColor || "#0f172a";
    offCtx.fillRect(0, 0, canvasW, canvasH);

    offCtx.save();
    offCtx.scale(scale, scale);
    offCtx.translate(-box.x, -box.y);

    await engine.ensureImagesLoadedForBox(doc, box);
    engine.drawAreaImages(offCtx, doc, box);
    if (hasDrawings) {
      engine.drawAreaDrawingsAndFills(offCtx, doc, box);
    }
    offCtx.restore();

    const dataUrl = offscreen.toDataURL("image/png");
    const base64Image = dataUrl.split(",")[1];

    console.log("[Enhance] Captured offscreen area (hasDrawings=" + hasDrawings + "):", box, "size:", canvasW, canvasH);

    const resultBase64 = await callGeminiImageGeneration(
      base64Image,
      apiKey,
      modelName,
      finalOverrideDesc,
      { width: box.width, height: box.height },
      hasDrawings
    );
    if (!resultBase64) {
      throw new Error("No image output returned by Gemini API.");
    }

    const byteString = atob(resultBase64);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([uint8Array], { type: "image/png" });
    const file = new File([blob], "gemini_enhanced_map.png", { type: "image/png" });

    const processed = await processImageFile(file, 4096);
    await assetStore.saveAsset(processed.assetHash, processed.blob);
    docStore.registerAssetManifest(
      processed.assetHash,
      processed.mimeType,
      processed.byteSize,
      processed.widthPx,
      processed.heightPx
    );

    const existingImages = Object.values(doc.entities).filter((e) => e.type === "image");
    let lowestZ = 0;
    for (const img of existingImages) {
      if (img.zIndex < lowestZ) lowestZ = img.zIndex;
    }

    const newMapImage: ImageEntity = {
      id: "img-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      type: "image",
      layerId: "map-layer",
      isMap: true,
      blendMode: "multiply" as any,
      zIndex: lowestZ - 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastModifiedBy: sessionManager.myPeerId || "local",
      locked: false,
      assetHash: processed.assetHash,
      position: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      size: { width: box.width, height: box.height },
      rotation: 0,
      opacity: 1.0
    };

    docStore.applyOperation({ opType: "CREATE_ENTITY", entity: newMapImage }, { incrementRevision: false });
    engine.setTool("select");
    localStorage.removeItem("gemini_enhance_last_failed");
    showEnhanceToast("✨ AI Map Enhancement complete! Review alignment below and Accept, Retry, or Abort.", 6000);
    showEnhanceConfirmationBar(engine, box, newMapImage, undefined, finalOverrideDesc);
  } catch (err: any) {
    console.error("[Enhance] Error during Gemini Map Enhancement:", err);
    localStorage.setItem("gemini_enhance_last_failed", "true");
    showEnhanceToast(`❌ Enhance Error: ${err.message || err}`, 14000);
  }
}

function showEnhanceConfirmationBar(
  engine: CanvasEngine,
  box: { x: number; y: number; width: number; height: number },
  newMapImage: ImageEntity,
  proxyPeerId?: string,
  proxyDescription?: string
): void {
  let oldBar = document.getElementById("vtt-enhance-confirm-bar");
  if (oldBar) oldBar.remove();

  const bar = document.createElement("div");
  bar.id = "vtt-enhance-confirm-bar";
  bar.style.cssText = "position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.95); border: 2px solid #c084fc; border-radius: 9999px; padding: 12px 24px; display: flex; align-items: center; gap: 16px; box-shadow: 0 12px 36px rgba(0,0,0,0.85); z-index: 100000; color: #f8fafc; font-family: sans-serif;";
  bar.innerHTML = `
    <span style="font-weight: 700; color: #c084fc; font-size: 14px;">✨ AI Map Imported!</span>
    <span style="font-size: 13px; color: #cbd5e1;">Review alignment on canvas below:</span>
    <div style="display: flex; gap: 10px;">
      <button id="btn-enhance-accept" style="padding: 6px 16px; border-radius: 9999px; background: #22c55e; border: none; color: #fff; font-weight: 700; cursor: pointer; box-shadow: 0 0 10px rgba(34, 197, 94, 0.4);">Accept & Clear Sketches</button>
      <button id="btn-enhance-accept-fog" style="padding: 6px 16px; border-radius: 9999px; background: linear-gradient(135deg, #22c55e, #0f172a); border: 1px solid rgba(34, 197, 94, 0.6); color: #fff; font-weight: 700; cursor: pointer; box-shadow: 0 0 10px rgba(15, 23, 42, 0.6);">Accept & Fog 🌫️</button>
      <button id="btn-enhance-retry" style="padding: 6px 16px; border-radius: 9999px; background: #eab308; border: none; color: #fff; font-weight: 700; cursor: pointer; box-shadow: 0 0 10px rgba(234, 179, 8, 0.4);">Retry</button>
      <button id="btn-enhance-abort" style="padding: 6px 16px; border-radius: 9999px; background: #ef4444; border: none; color: #fff; font-weight: 700; cursor: pointer; box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);">Abort</button>
    </div>
  `;
  document.body.appendChild(bar);

  const acceptBtn = bar.querySelector<HTMLButtonElement>("#btn-enhance-accept")!;
  const acceptFogBtn = bar.querySelector<HTMLButtonElement>("#btn-enhance-accept-fog")!;
  const retryBtn = bar.querySelector<HTMLButtonElement>("#btn-enhance-retry")!;
  const abortBtn = bar.querySelector<HTMLButtonElement>("#btn-enhance-abort")!;

  engine.setTool("select");

  const doAccept = async (applyFog: boolean) => {
    bar.remove();
    engine.setTool("select");
    const currentEnt = (docStore.getDocument().entities[newMapImage.id] as ImageEntity) || newMapImage;
    const lockedMapEntity: ImageEntity = {
      ...currentEnt,
      locked: true,
      lockedBy: sessionManager.myPeerId || "local",
      updatedAt: Date.now(),
      lastModifiedBy: sessionManager.myPeerId || "local"
    };
    docStore.applyOperation({ opType: "UPDATE_ENTITY", id: lockedMapEntity.id, patch: { locked: true, lockedBy: sessionManager.myPeerId || "local" } }, { incrementRevision: false });
    sessionManager.dispatchOperation({ opType: "CREATE_ENTITY", entity: lockedMapEntity });
    const username = sessionManager.myUsername || "Me";
    sessionManager.dispatchOperation({
      opType: "APPEND_CHAT_MESSAGE",
      message: {
        id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        timestamp: Date.now(),
        senderPeerId: sessionManager.myPeerId || "local",
        senderUsername: username,
        content: `✨ AI Map generated by ${username}${proxyPeerId ? " via proxy" : ""} accepted and added to canvas!`,
        type: "system"
      }
    });

    const doc = docStore.getDocument();
    const drawingsToDelete: string[] = [];
    for (const ent of Object.values(doc.entities)) {
      if (ent.type === "line") {
        const line = ent as any;
        if (line.points && line.points.length > 0) {
          const inside = line.points.some((p: any) => {
            const px = Array.isArray(p) ? p[0] : p?.x;
            const py = Array.isArray(p) ? p[1] : p?.y;
            return px !== undefined && py !== undefined && px >= box.x - 10 && px <= box.x + box.width + 10 && py >= box.y - 10 && py <= box.y + box.height + 10;
          });
          if (inside) {
            drawingsToDelete.push(ent.id);
          }
        }
      }
    }
    for (const id of drawingsToDelete) {
      sessionManager.dispatchOperation({ opType: "DELETE_ENTITY", id });
    }

    if (doc.gridCells) {
      const size = doc.canvasSettings?.gridSizePx || 50;
      for (const [key, cell] of Object.entries(doc.gridCells)) {
        if (!cell || !cell.fillColor || cell.fillColor === "fog" || cell.fogHidden) continue;
        const commaIdx = key.indexOf(",");
        if (commaIdx === -1) continue;
        const gx = Number(key.substring(0, commaIdx));
        const gy = Number(key.substring(commaIdx + 1));
        if (gx + size >= box.x && gx <= box.x + box.width && gy + size >= box.y && gy <= box.y + box.height) {
          sessionManager.dispatchOperation({
            opType: "UPDATE_GRID_CELL",
            cellKey: key,
            patch: { fillColor: undefined, fillCreator: undefined }
          });
        }
      }
    }

    if (applyFog) {
      const size = doc.canvasSettings?.gridSizePx || 50;
      const myPeerId = sessionManager.myPeerId || "local";
      const startGx = Math.floor(box.x / size) * size;
      const startGy = Math.floor(box.y / size) * size;
      const endX = box.x + box.width;
      const endY = box.y + box.height;

      // Analyze image content to only fog cells with content or neighbors with content
      const cellHasContentMap = new Map<string, boolean>();
      let analyzedImage = false;

      if (lockedMapEntity.assetHash) {
        try {
          const blob = await assetStore.getAsset(lockedMapEntity.assetHash);
          if (blob) {
            const imgUrl = URL.createObjectURL(blob);
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = (e) => reject(e);
              img.src = imgUrl;
            });
            URL.revokeObjectURL(imgUrl);

            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (ctx && img.naturalWidth > 0 && img.naturalHeight > 0) {
              ctx.drawImage(img, 0, 0);
              const imageData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
              const data32 = new Uint32Array(imageData.data.buffer);
              const imgW = img.naturalWidth;
              const imgH = img.naturalHeight;

              for (let cx = startGx; cx < endX; cx += size) {
                for (let cy = startGy; cy < endY; cy += size) {
                  const worldX1 = Math.max(cx, box.x);
                  const worldX2 = Math.min(cx + size, box.x + box.width);
                  const worldY1 = Math.max(cy, box.y);
                  const worldY2 = Math.min(cy + size, box.y + box.height);

                  const px1 = Math.floor(((worldX1 - box.x) / box.width) * imgW);
                  const px2 = Math.min(imgW, Math.ceil(((worldX2 - box.x) / box.width) * imgW));
                  const py1 = Math.floor(((worldY1 - box.y) / box.height) * imgH);
                  const py2 = Math.min(imgH, Math.ceil(((worldY2 - box.y) / box.height) * imgH));

                  let hasContent = false;
                  if (px2 > px1 && py2 > py1) {
                    let firstR = -1, firstG = -1, firstB = -1;
                    for (let y = py1; y < py2; y++) {
                      const rowOffset = (y * imgW + px1) * 4;
                      for (let x = px1; x < px2; x++) {
                        const idx = (y * imgW + x) * 4;
                        const r = imageData.data[idx];
                        const g = imageData.data[idx + 1];
                        const b = imageData.data[idx + 2];
                        const a = imageData.data[idx + 3];

                        if (a < 20) continue; // transparent background pixel

                        // Check if pixel is a non-background map element (black ink walls, crosshatching, furniture, objects)
                        if (r < 235 || g < 235 || b < 235) {
                          hasContent = true;
                          break;
                        }

                        if (firstR === -1) {
                          firstR = r;
                          firstG = g;
                          firstB = b;
                        } else {
                          const dist = Math.abs(r - firstR) + Math.abs(g - firstG) + Math.abs(b - firstB);
                          if (dist > 25) { // significant color variation beyond JPEG compression artifacts
                            hasContent = true;
                            break;
                          }
                        }
                      }
                      if (hasContent) break;
                    }
                  }
                  cellHasContentMap.set(`${cx},${cy}`, hasContent);
                }
              }
              analyzedImage = true;
            }
          }
        } catch (err) {
          console.warn("[Enhance] Could not analyze image content for fog bounds:", err);
        }
      }

      for (let cx = startGx; cx < endX; cx += size) {
        for (let cy = startGy; cy < endY; cy += size) {
          const cellKey = `${cx},${cy}`;
          let shouldFog = true;

          if (analyzedImage) {
            shouldFog = Boolean(cellHasContentMap.get(cellKey));
            if (!shouldFog) {
              // Check 8 neighbors (including diagonals)
              for (let dx = -size; dx <= size; dx += size) {
                for (let dy = -size; dy <= size; dy += size) {
                  if (dx === 0 && dy === 0) continue;
                  if (cellHasContentMap.get(`${cx + dx},${cy + dy}`)) {
                    shouldFog = true;
                    break;
                  }
                }
                if (shouldFog) break;
              }
            }
          }

          if (shouldFog) {
            sessionManager.dispatchOperation({
              opType: "UPDATE_GRID_CELL",
              cellKey,
              patch: {
                fillColor: "fog",
                fillCreator: myPeerId
              }
            });
          }
        }
      }
      showEnhanceToast("✅ AI Map Accepted, drawings cleared, and area covered with fog!", 5000);
    } else {
      showEnhanceToast("✅ AI Map Accepted and reference drawings cleared!", 4000);
    }
  };

  acceptBtn.addEventListener("click", () => doAccept(false));
  acceptFogBtn.addEventListener("click", () => doAccept(true));

  retryBtn.addEventListener("click", () => {
    bar.remove();
    docStore.applyOperation({ opType: "DELETE_ENTITY", id: newMapImage.id }, { incrementRevision: false });
    if (proxyPeerId) {
      const friendName = getPeerUsername(proxyPeerId);
      showEnhanceToast(`🔄 Retrying AI Map Generation via ${friendName}'s API key...`, 3000);
      sendProxyEnhanceRequest(engine, box, proxyDescription || "", proxyPeerId);
    } else {
      showEnhanceToast("🔄 Retrying AI Map Generation...", 3000);
      runGeminiMapEnhancement(engine, box, proxyDescription);
    }
  });

  abortBtn.addEventListener("click", () => {
    bar.remove();
    docStore.applyOperation({ opType: "DELETE_ENTITY", id: newMapImage.id }, { incrementRevision: false });
    showEnhanceToast("🛑 AI Map Enhancement aborted.", 3000);
  });
}

const knownPeersWithApiKey = new Set<string>();
let proxyListenersSetup = false;

export function setupEnhanceProxyListeners(engine: CanvasEngine): void {
  if (proxyListenersSetup) return;
  proxyListenersSetup = true;
  console.log("[EnhanceProxy] setupEnhanceProxyListeners initialized.");

  sessionManager.onEphemeral(async (payload: any) => {
    if (!payload || typeof payload !== "object") return;
    const myId = sessionManager.myPeerId || "local";

    if (payload.type === "ENHANCE_CHECK_KEY_REQ") {
      console.log(`[EnhanceProxy] Received ENHANCE_CHECK_KEY_REQ from ${payload.requesterPeerId}. Checking local API key...`);
      const apiKey = localStorage.getItem("gemini_api_key");
      const lastFailed = localStorage.getItem("gemini_enhance_last_failed") === "true";
      const hasKey = Boolean(apiKey && apiKey.trim().length > 0) && !lastFailed;
      console.log(`[EnhanceProxy] My key status: hasKey=${hasKey} (keyLength=${apiKey ? apiKey.length : 0}, lastFailed=${lastFailed}, myId=${myId})`);
      if (hasKey && payload.requesterPeerId !== myId) {
        console.log(`[EnhanceProxy] Sending ENHANCE_CHECK_KEY_ACK to ${payload.requesterPeerId}...`);
        sessionManager.sendEphemeral({
          type: "ENHANCE_CHECK_KEY_ACK",
          peerId: myId,
          hasKey: true
        });
      }
    } else if (payload.type === "ENHANCE_CHECK_KEY_ACK") {
      console.log(`[EnhanceProxy] Received ENHANCE_CHECK_KEY_ACK from peer ${payload.peerId} (hasKey=${payload.hasKey}, myId=${myId})`);
      if (payload.hasKey && payload.peerId && payload.peerId !== myId) {
        knownPeersWithApiKey.add(payload.peerId);
        console.log(`[EnhanceProxy] Added ${payload.peerId} to knownPeersWithApiKey. Current set:`, Array.from(knownPeersWithApiKey));
      }
    } else if (payload.type === "ENHANCE_PROXY_REQ") {
      console.log(`[EnhanceProxy] Received ENHANCE_PROXY_REQ. targetProxyId=${payload.proxyPeerId}, myId=${myId}, requester=${payload.requesterUsername} (${payload.requesterPeerId})`);
      if (payload.proxyPeerId === myId || payload.proxyPeerId === "any") {
        console.group(`[EnhanceProxy] Handling proxy enhance request from ${payload.requesterUsername} (${payload.requesterPeerId})`);
        const apiKey = localStorage.getItem("gemini_api_key");
        const lastFailed = localStorage.getItem("gemini_enhance_last_failed") === "true";
        if (!apiKey || lastFailed) {
          console.warn("[EnhanceProxy] Cannot serve proxy request: no valid API key or lastFailed=true");
          console.groupEnd();
          sessionManager.sendEphemeral({
            type: "ENHANCE_PROXY_RES",
            reqId: payload.reqId,
            requesterPeerId: payload.requesterPeerId,
            proxyPeerId: myId,
            status: "error",
            error: "Proxy host no longer has a valid Gemini API key configured."
          });
          return;
        }
        await runGeminiMapEnhancementForProxy(engine, payload.box, payload.description, payload.requesterPeerId, payload.requesterUsername, payload.reqId, payload.dmAssistantEnabled, payload.dmNote, payload.convoHistory);
        console.groupEnd();
      }
    } else if (payload.type === "ENHANCE_PROXY_RES") {
      console.log(`[EnhanceProxy] Received ENHANCE_PROXY_RES. status=${payload.status}, requester=${payload.requesterPeerId}, myId=${myId}`);
      if (payload.requesterPeerId === myId) {
        if (payload.status === "error") {
          console.error("[EnhanceProxy] Proxy returned error:", payload.error);
          const friendName = getPeerUsername(payload.proxyPeerId);
          showEnhanceToast(`❌ Generation via ${friendName}'s API key failed: ${payload.error || "Unknown error"}`, 8000);
        } else if (payload.status === "success" && payload.newMapImage && payload.box) {
          console.log("[EnhanceProxy] Proxy generation evaluation payload arrived! Registering asset manifest and applying entity locally ONLY while evaluating...");
          const ent = payload.newMapImage as ImageEntity;
          if (payload.assetManifestEntry) {
            docStore.registerAssetManifest(
              payload.assetManifestEntry.assetHash,
              payload.assetManifestEntry.mimeType,
              payload.assetManifestEntry.byteSize,
              payload.assetManifestEntry.widthPx,
              payload.assetManifestEntry.heightPx
            );
          }
          docStore.applyOperation({ opType: "CREATE_ENTITY", entity: ent }, { incrementRevision: false });
          sessionManager.syncMissingAssets();

          const friendName = getPeerUsername(payload.proxyPeerId);
          showEnhanceToast(`✨ Map generation via ${friendName}'s API key complete! Waiting for image data transfer...`, 3000);
          let attempts = 0;
          const checkTimer = setInterval(async () => {
            attempts++;
            const hasBlob = await assetStore.hasAsset(ent.assetHash);
            if (hasBlob) {
              clearInterval(checkTimer);
              console.log("[EnhanceProxy] Map image blob arrived! Opening confirmation bar locally without sharing to other peers until accepted.");
              docStore.applyOperation({ opType: "CREATE_ENTITY", entity: ent }, { incrementRevision: false });
              showEnhanceConfirmationBar(engine, payload.box!, ent, payload.proxyPeerId, payload.description);
            } else if (attempts > 80) {
              clearInterval(checkTimer);
              console.warn("[EnhanceProxy] Timed out waiting for map image blob transfer from proxy.");
              showEnhanceToast("⚠️ Map image transfer timed out from proxy.", 6000);
            }
          }, 250);
        }
      }
    } else if (payload.type === "DM_ASSISTANT_PROXY_RES") {
      console.log(`[EnhanceProxy] Received DM_ASSISTANT_PROXY_RES for requester=${payload.requesterPeerId}, myId=${myId}`);
      if (payload.requesterPeerId === myId) {
        showEnhanceToast("🧙 DM Assistant story ideas received!", 4000);
        sendDmAssistantWhisper(payload.dmResponse, myId, sessionManager.myUsername || "Me", payload.whisperMsgId);
        saveDmConvoEntry(payload.dmNote, payload.dmResponse);
      }
    }
  });
}

export async function checkOrFindProxyPeer(): Promise<string | null> {
  const myId = sessionManager.myPeerId || "local";
  console.group("[EnhanceProxy] checkOrFindProxyPeer initiated");
  console.log("Current sessionManager role:", sessionManager.role, "myPeerId:", myId);
  console.log("Known peers with API key before check:", Array.from(knownPeersWithApiKey));

  if (sessionManager.role === "none") {
    console.log("[EnhanceProxy] Session role is 'none' (not connected to P2P room). Returning null.");
    console.groupEnd();
    return null;
  }

  const existingCandidate = Array.from(knownPeersWithApiKey).find((p) => p !== myId);
  if (existingCandidate) {
    console.log("[EnhanceProxy] Found existing candidate in knownPeersWithApiKey:", existingCandidate);
    console.groupEnd();
    return existingCandidate;
  }

  console.log("[EnhanceProxy] Broadcasting ENHANCE_CHECK_KEY_REQ and waiting up to 750ms for ACK...");
  sessionManager.sendEphemeral({
    type: "ENHANCE_CHECK_KEY_REQ",
    requesterPeerId: myId
  });

  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        const found = Array.from(knownPeersWithApiKey).find((p) => p !== myId) || null;
        console.log("[EnhanceProxy] 750ms discovery check completed. Found proxy peer:", found);
        console.groupEnd();
        resolve(found);
      }
    }, 750);

    const interval = setInterval(() => {
      if (resolved) {
        clearInterval(interval);
        return;
      }
      const found = Array.from(knownPeersWithApiKey).find((p) => p !== myId);
      if (found) {
        resolved = true;
        clearInterval(interval);
        clearTimeout(timer);
        console.log("[EnhanceProxy] ACK received early! Found proxy peer:", found);
        console.groupEnd();
        resolve(found);
      }
    }, 50);
  });
}

export function sendProxyEnhanceRequest(
  engine: CanvasEngine,
  box: { x: number; y: number; width: number; height: number },
  description: string,
  proxyPeerId: string,
  dmAssistantEnabled?: boolean,
  dmNote?: string,
  convoHistory?: DmConvoEntry[]
): void {
  const myId = sessionManager.myPeerId || "local";
  const myUsername = sessionManager.myUsername || "Me";
  const reqId = "req-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
  const friendName = getPeerUsername(proxyPeerId);
  showEnhanceToast(`🚀 Sending AI Map request by proxy through ${friendName}'s API key... (~10-20s)`, 0);
  console.log(`[EnhanceProxy] Sending ENHANCE_PROXY_REQ to proxyPeerId="${proxyPeerId}" (reqId="${reqId}", requester="${myUsername}" (${myId}))`);
  sessionManager.sendEphemeral({
    type: "ENHANCE_PROXY_REQ",
    reqId,
    requesterPeerId: myId,
    requesterUsername: myUsername,
    proxyPeerId,
    box,
    description,
    dmAssistantEnabled,
    dmNote,
    convoHistory
  });
}

async function runGeminiMapEnhancementForProxy(
  engine: CanvasEngine,
  box: { x: number; y: number; width: number; height: number },
  description: string,
  requesterPeerId: string,
  requesterUsername: string,
  reqId: string,
  dmAssistantEnabled?: boolean,
  dmNote?: string,
  convoHistory?: DmConvoEntry[]
): Promise<void> {
  const apiKey = localStorage.getItem("gemini_api_key");
  if (!apiKey) {
    console.warn("[EnhanceProxy] runGeminiMapEnhancementForProxy called but no apiKey in localStorage!");
    return;
  }
  const modelName = localStorage.getItem("gemini_enhance_model") || "gemini-3.1-flash-image";
  const myId = sessionManager.myPeerId || "local";

  let finalDescription = description;

  if (dmAssistantEnabled && dmNote) {
    try {
      const worldDesc = localStorage.getItem("gemini_enhance_world_desc") || "";
      const dmResponse = await callGeminiDmAssistantTextGen(
        apiKey,
        modelName,
        dmNote,
        worldDesc,
        description,
        convoHistory || []
      );
      const whisperMsgId = "whisper-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);

      sessionManager.sendEphemeral({
        type: "DM_ASSISTANT_PROXY_RES",
        reqId,
        requesterPeerId,
        dmNote,
        dmResponse,
        whisperMsgId
      });

      sendDmAssistantWhisper(dmResponse, requesterPeerId, requesterUsername, whisperMsgId);

      const dmHintsBlock = `\n\nDM ASSISTANT STORY & MAP HINTS:\nDM Note: "${dmNote}"\nDM Response Hints: "${dmResponse}"`;
      finalDescription = description + dmHintsBlock;
    } catch (e: any) {
      console.warn("[EnhanceProxy] DM Assistant proxy error:", e);
    }
  }

  try {
    console.log(`[EnhanceProxy] Executing proxy enhancement job for ${requesterUsername} (${requesterPeerId}). Box:`, box, "Desc:", finalDescription);
    const doc = docStore.getDocument();
    const hasDrawings = hasDrawingsInBox(doc, box);
    const maxDim = 1024;
    const scale = Math.min(maxDim / box.width, maxDim / box.height, 2.0);
    const canvasW = Math.max(64, Math.round(box.width * scale));
    const canvasH = Math.max(64, Math.round(box.height * scale));

    const offscreen = document.createElement("canvas");
    offscreen.width = canvasW;
    offscreen.height = canvasH;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) throw new Error("Could not create 2D canvas context");

    offCtx.fillStyle = doc.canvasSettings?.backgroundColor || "#0f172a";
    offCtx.fillRect(0, 0, canvasW, canvasH);

    offCtx.save();
    offCtx.scale(scale, scale);
    offCtx.translate(-box.x, -box.y);

    await engine.ensureImagesLoadedForBox(doc, box);
    engine.drawAreaImages(offCtx, doc, box);
    if (hasDrawings) {
      engine.drawAreaDrawingsAndFills(offCtx, doc, box);
    }
    offCtx.restore();

    const dataUrl = offscreen.toDataURL("image/png");
    const base64Image = dataUrl.split(",")[1];

    console.log(`[EnhanceProxy] Calling Gemini API (model=${modelName}, hasDrawings=${hasDrawings})...`);
    const resultBase64 = await callGeminiImageGeneration(
      base64Image,
      apiKey,
      modelName,
      finalDescription,
      { width: box.width, height: box.height },
      hasDrawings
    );
    if (!resultBase64) {
      throw new Error("No image output returned by Gemini API during proxy request.");
    }
    console.log("[EnhanceProxy] Gemini returned image successfully! Processing image and saving to IDB...");

    const byteString = atob(resultBase64);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([uint8Array], { type: "image/png" });
    const file = new File([blob], "gemini_enhanced_map.png", { type: "image/png" });

    const processed = await processImageFile(file, 4096);
    await assetStore.saveAsset(processed.assetHash, processed.blob);
    docStore.registerAssetManifest(
      processed.assetHash,
      processed.mimeType,
      processed.byteSize,
      processed.widthPx,
      processed.heightPx
    );
    console.log("[EnhanceProxy] Asset saved to IDB with hash:", processed.assetHash, "Streaming to requester...");

    // Stream the asset to the requester BEFORE sending the response,
    // so the asset is available by the time the client starts polling
    if (sessionManager.role === "host" && requesterPeerId) {
      await hostEngine.streamAssetToPeer(requesterPeerId, processed.assetHash);
    }

    const existingImages = Object.values(doc.entities).filter((e) => (e as any).type === "image") as ImageEntity[];
    let lowestZ = 0;
    for (const img of existingImages) {
      if (img.zIndex < lowestZ) lowestZ = img.zIndex;
    }

    const newMapImage: ImageEntity = {
      id: "img-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      type: "image",
      layerId: "map-layer",
      isMap: true,
      blendMode: "multiply" as any,
      zIndex: lowestZ - 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastModifiedBy: requesterPeerId,
      locked: false,
      assetHash: processed.assetHash,
      position: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      size: { width: box.width, height: box.height },
      rotation: 0,
      opacity: 1.0
    };

    console.log("[EnhanceProxy] Sending ENHANCE_PROXY_RES success payload back to requester (without broadcasting entity):", requesterPeerId);
    sessionManager.sendEphemeral({
      type: "ENHANCE_PROXY_RES",
      reqId,
      requesterPeerId,
      proxyPeerId: myId,
      status: "success",
      box,
      newMapImageId: newMapImage.id,
      newMapImage,
      assetManifestEntry: doc.assetManifest[processed.assetHash] || {
        assetHash: processed.assetHash,
        mimeType: processed.mimeType,
        byteSize: processed.byteSize,
        widthPx: processed.widthPx,
        heightPx: processed.heightPx
      }
    });
  } catch (err: any) {
    console.error("[EnhanceProxy] Error during Gemini Map Enhancement proxy job:", err);
    sessionManager.sendEphemeral({
      type: "ENHANCE_PROXY_RES",
      reqId,
      requesterPeerId,
      proxyPeerId: myId,
      status: "error",
      error: err.message || String(err)
    });
  }
}

export function openGeminiDescriptionModal(
  engine: CanvasEngine,
  box: { x: number; y: number; width: number; height: number },
  isProxy: boolean = false,
  proxyPeerId: string | null = null
): void {
  let modalEl = document.getElementById("vtt-gemini-desc-modal");
  if (modalEl) modalEl.remove();

  modalEl = document.createElement("div");
  modalEl.id = "vtt-gemini-desc-modal";
  modalEl.style.cssText = "position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 99999;";
  document.body.appendChild(modalEl);

  const savedWorldPrompt = localStorage.getItem("gemini_enhance_world_desc") !== null
    ? (localStorage.getItem("gemini_enhance_world_desc") || "")
    : (localStorage.getItem("gemini_enhance_custom_prompt") || "");

  const savedDmAssistantEnabled = localStorage.getItem("gemini_dm_assistant_enabled") === "true";
  const savedDmNotes = localStorage.getItem("gemini_dm_last_note") || "";

  modalEl.innerHTML = `
    <div style="background: rgba(15, 23, 42, 0.96); border: 1px solid rgba(192, 132, 252, 0.6); border-radius: 14px; padding: 24px; max-width: 500px; width: 92%; box-shadow: 0 16px 48px rgba(0,0,0,0.85); color: #f8fafc; font-family: Outfit, sans-serif; display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 24px;">🎨</span>
        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #c084fc;">AI Map Descriptions</h3>
      </div>
      <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
        Describe the overarching setting and specific room details for the map over your selection box.
        ${isProxy ? `<span style="display: block; margin-top: 6px; color: #38bdf8; font-weight: 600;">🚀 Generating via proxy through ${getPeerUsername(proxyPeerId)}'s API key!</span>` : ""}
      </p>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label style="font-size: 12px; font-weight: 700; color: #38bdf8;">World Description <span style="font-weight: 400; color: #94a3b8;">(Overarching setting & style; stays populated across generations)</span></label>
        <textarea id="gemini-world-desc-textarea" rows="3" placeholder="e.g. Gothic cathedral on a snowy mountain summit, weathered stone, dark fantasy atmosphere..." style="padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.4); background: rgba(30, 41, 59, 0.8); color: #ffffff; font-size: 13px; outline: none; resize: vertical;">${savedWorldPrompt}</textarea>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label style="font-size: 12px; font-weight: 700; color: #e879f9;">Room Descriptions <span style="font-weight: 400; color: #94a3b8;">(Specific room/area details; resets each time)</span></label>
        <textarea id="gemini-room-desc-textarea" rows="3" placeholder="e.g. A grand chapel altar with broken pew benches and scattered rubble around the edges, floor plain..." style="padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(232, 121, 249, 0.4); background: rgba(30, 41, 59, 0.8); color: #ffffff; font-size: 13px; outline: none; resize: vertical;"></textarea>
      </div>

      <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">
        <input type="checkbox" id="gemini-dm-assistant-checkbox" ${savedDmAssistantEnabled ? "checked" : ""} style="cursor: pointer; accent-color: #c084fc; width: 16px; height: 16px;">
        <label for="gemini-dm-assistant-checkbox" style="font-size: 13px; font-weight: 700; color: #c084fc; cursor: pointer;">🧙 DM Assistant (Generate story ideas & hints)</label>
      </div>

      <div id="gemini-dm-notes-container" style="display: ${savedDmAssistantEnabled ? "flex" : "none"}; flex-direction: column; gap: 6px;">
        <label style="font-size: 12px; font-weight: 700; color: #a855f7;">DM Notes <span style="font-weight: 400; color: #94a3b8;">(Running AI conversation & private DM notes)</span></label>
        <textarea id="gemini-dm-notes-textarea" rows="3" placeholder="e.g. Party is searching for a secret smuggler vault under the altar..." style="padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.4); background: rgba(30, 41, 59, 0.8); color: #ffffff; font-size: 13px; outline: none; resize: vertical;">${savedDmNotes}</textarea>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px;">
        <button id="btn-cancel-desc" class="btn-glass" style="padding: 8px 16px; border-radius: 8px; cursor: pointer; color: #cbd5e1;">Cancel</button>
        <button id="btn-submit-desc" class="btn-glass" style="padding: 8px 20px; border-radius: 8px; cursor: pointer; background: rgba(192, 132, 252, 0.35); border: 1px solid #c084fc; color: #ffffff; font-weight: 700; box-shadow: 0 0 14px rgba(192, 132, 252, 0.4);">✨ Generate Map</button>
      </div>
    </div>
  `;

  const worldTextareaEl = modalEl.querySelector<HTMLTextAreaElement>("#gemini-world-desc-textarea")!;
  const roomTextareaEl = modalEl.querySelector<HTMLTextAreaElement>("#gemini-room-desc-textarea")!;
  const dmAssistantCheckboxEl = modalEl.querySelector<HTMLInputElement>("#gemini-dm-assistant-checkbox")!;
  const dmNotesContainerEl = modalEl.querySelector<HTMLElement>("#gemini-dm-notes-container")!;
  const dmNotesTextareaEl = modalEl.querySelector<HTMLTextAreaElement>("#gemini-dm-notes-textarea")!;

  const cancelBtn = modalEl.querySelector<HTMLButtonElement>("#btn-cancel-desc")!;
  const submitBtn = modalEl.querySelector<HTMLButtonElement>("#btn-submit-desc")!;

  dmAssistantCheckboxEl.addEventListener("change", () => {
    const isChecked = dmAssistantCheckboxEl.checked;
    localStorage.setItem("gemini_dm_assistant_enabled", isChecked ? "true" : "false");
    dmNotesContainerEl.style.display = isChecked ? "flex" : "none";
  });

  cancelBtn.addEventListener("click", () => {
    modalEl?.remove();
  });

  submitBtn.addEventListener("click", () => {
    const worldDesc = worldTextareaEl.value.trim();
    const roomDesc = roomTextareaEl.value.trim();
    const dmAssistantEnabled = dmAssistantCheckboxEl.checked;
    const dmNote = dmNotesTextareaEl.value.trim();

    localStorage.setItem("gemini_enhance_world_desc", worldDesc);
    if (dmAssistantEnabled) {
      localStorage.setItem("gemini_dm_assistant_enabled", "true");
      localStorage.setItem("gemini_dm_last_note", dmNote);
    } else {
      localStorage.setItem("gemini_dm_assistant_enabled", "false");
    }

    const combinedParts = [];
    if (worldDesc) combinedParts.push(`World Description: "${worldDesc}"`);
    if (roomDesc) combinedParts.push(`Room Descriptions: "${roomDesc}"`);
    const combinedDesc = combinedParts.join("\n\n");

    if (!isProxy) {
      localStorage.setItem("gemini_enhance_custom_prompt", combinedDesc);
    }
    modalEl?.remove();

    if (isProxy && proxyPeerId) {
      const convoHistory = getDmConvoHistory();
      sendProxyEnhanceRequest(engine, box, combinedDesc, proxyPeerId, dmAssistantEnabled, dmNote, convoHistory);
    } else {
      runGeminiMapEnhancement(engine, box, combinedDesc, dmAssistantEnabled, dmNote);
    }
  });

  roomTextareaEl.focus();
}

