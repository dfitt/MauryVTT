export interface GridCellData {
  fillColor?: string;     // Hex color if filled via fillTool
  fillCreator?: string;   // Peer ID who created the fill (for "fog" check)
  fogHidden?: boolean;    // True if covered by Fog of War
  fogCreator?: string;    // Peer ID who created the fog cell
}

export interface QuickRoll {
  label: string;
  expr: string;
  icon?: string;
  isDamage?: boolean;
}

export interface CharacterSheetData {
  username: string;
  characterName?: string;
  description?: string;
  inventory?: string;
  notes?: string;
  hp?: string | number;
  maxHp?: string | number;
  hpHistory?: (string | number | { val: string | number; timestamp?: number })[];
}

export interface ConditionAnimation {
  effectSvg: string;       // Looping CSS + SVG animation overlay string
  keyframes?: string;      // Optional separate CSS keyframes block
  colors: string[];        // Color palette for aura ring & particles (2-4 colors)
  shape: "circle" | "sparkle" | "ember" | "splinter" | "note"; // Orbiting particle shape
  count: number;           // Number of aura particles
  speedRange: [number, number]; // Velocity range [min, max]
  sizeRangePx: [number, number]; // Size range [min, max]
  gravity: number;         // Gravity (-40 to +30)
  lifeMs: number;          // Particle lifetime in ms
}

export interface ConditionData {
  id: string;              // Unique snake_case condition ID
  name: string;            // Display name
  description?: string;    // Prompt / description
  iconSvg: string;         // 64x64 SVG status badge icon (or emoji)
  durationMs: number;      // Loop duration (typically 2000ms)
  animation: ConditionAnimation; // Dedicated animation structure holding visual effects and particles
  isCondition: true;       // Discriminator flag
}

export interface VTTDocument {
  version: "1.0.0";
  documentId: string;
  revision: number;
  canvasSettings: CanvasSettings;
  assetSettings: AssetSettings;
  layers: LayerDefinition[];
  entities: Record<string, CanvasEntity>;
  gridCells: Record<string, GridCellData>;
  assetManifest: Record<string, AssetMetadata>;
  users: Record<string, UserProfile>;
  chatHistory: ChatMessage[];
  quickRolls: Record<string, QuickRoll[]>; // Keyed by username
  customVttfxBundles?: Record<string, any>;
  customConditions?: Record<string, ConditionData>; // Keyed by condition id -> ConditionData
  conditionUsage?: Record<string, number>; // Keyed by condition id -> timestamp of last usage
  vttfxUsage?: Record<string, number>; // Keyed by effect id/icon -> timestamp of last usage
  primaryTokens?: Record<string, string>; // Keyed by username -> tokenId
  characterSheets?: Record<string, CharacterSheetData>; // Keyed by username
}


export interface CanvasSettings {
  backgroundColor: string;
  gridEnabled: boolean;
  gridType: "square" | "hex" | "none";
  gridSizePx: number;
  gridSnap: boolean;
}

export interface AssetSettings {
  maxImageDimensionPx: number; // Default 1024
  autoResizeImages: boolean;   // Default true
}

export interface LayerDefinition {
  id: string;
  name: string;
  zIndex: number;
  visible: boolean;
  locked: boolean;
}

export interface BaseEntity {
  id: string;
  type: "image" | "token" | "line";
  layerId: string;
  zIndex: number;
  createdAt: number;
  updatedAt: number;
  lastModifiedBy: string;
  locked: boolean;
  lockedBy?: string;
}

export interface ImageEntity extends BaseEntity {
  type: "image";
  assetHash: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  opacity: number;
  hiddenCells?: string[];
  isMap?: boolean;
  blendMode?: "multiply" | "normal";
}

export interface TokenEntity extends BaseEntity {
  type: "token";
  assetHash: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  opacity: number;
  hiddenCells?: string[];
  label: string;
  labelVisibleToAll: boolean;
  gridSnapped: boolean;
  elevation: number;
  ownerPeerIds: string[];
  primaryOwnerUsername?: string;
  statusEffects: string[];
  aura?: {
    radiusPx: number;
    color: string;
    opacity: number;
  };
  hp?: string | number;
  maxHp?: string | number;
  hpHistory?: (string | number | { val: string | number; timestamp?: number })[];
  description?: string;
  secret?: boolean;
  secretPeerId?: string;
  secretUsername?: string;
}

export interface LineEntity extends BaseEntity {
  type: "line";
  lineType: "straight" | "freehand" | "doodle" | "rectangle" | "circle" | "cone" | "hexagon" | "spiral" | "arrow";
  points: [number, number][];
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  isClosed: boolean;
  fillColor?: string;
}

export type CanvasEntity = ImageEntity | TokenEntity | LineEntity;

export interface AssetMetadata {
  assetHash: string;
  mimeType: string;
  byteSize: number;
  widthPx: number;
  heightPx: number;
}

export interface UserProfile {
  peerId: string;
  username: string;
  color: string;
  joinedAt: number;
  role: "host" | "client";
}

export interface ChatMessage {
  id: string;
  timestamp: number;
  senderPeerId: string;
  senderUsername: string;
  content: string;
  type: "text" | "system" | "action" | "roll" | "whisper";
  recipientPeerId?: string;
  recipientUsername?: string;
  rollLabel?: string;
  rollIcon?: string;
  targetTokenIds?: string[];
  isDamage?: boolean;
  thumbsUp?: number;
  thumbsDown?: number;
  laugh?: number;
  celebrate?: number;
}

// ==========================================
// P2P Protocol Messages (vtt-sync Channel)
// ==========================================

export type SyncMessage =
  | { type: "HANDSHAKE_REQ"; peerId: string }
  | { type: "HANDSHAKE_ACK"; snapshot: VTTDocument; appVersion?: string; lastSeenEntries?: [string, number][] }
  | { type: "RESYNC_REQ"; peerId: string }
  | { type: "RESYNC_ACK"; snapshot: VTTDocument; appVersion?: string; lastSeenEntries?: [string, number][] }
  | { type: "OP_REQUEST"; clientSeq: string; op: DocumentOperation; senderPeerId?: string }
  | { type: "OP_COMMIT"; clientSeq?: string; revision: number; op: DocumentOperation; senderPeerId?: string }
  | AssetProtocolMessage;

export type DocumentOperation =
  | { opType: "CREATE_ENTITY"; entity: CanvasEntity }
  | { opType: "UPDATE_ENTITY"; id: string; patch: Partial<CanvasEntity> }
  | { opType: "DELETE_ENTITY"; id: string }
  | { opType: "UPDATE_CANVAS_SETTINGS"; patch: Partial<CanvasSettings> }
  | { opType: "REGISTER_USER"; profile: UserProfile }
  | { opType: "UPDATE_USER"; peerId: string; patch: Partial<UserProfile> }
  | { opType: "APPEND_CHAT_MESSAGE"; message: ChatMessage }
  | { opType: "UPDATE_CHAT_MESSAGE"; id: string; patch: Partial<ChatMessage> }
  | { opType: "UPDATE_GRID_CELL"; cellKey: string; patch: Partial<GridCellData> }
  | { opType: "UPDATE_QUICK_ROLLS"; username: string; quickRolls: QuickRoll[] }
  | { opType: "UPDATE_CHARACTER_SHEET"; username: string; sheet: CharacterSheetData }
  | { opType: "CLEAR_CHAT_HISTORY" }
  | { opType: "REGISTER_VTTFX_BUNDLE"; bundle: any }
  | { opType: "REGISTER_CONDITION"; condition: ConditionData }
  | { opType: "RECORD_CONDITION_USAGE"; conditionId: string; timestamp?: number }
  | { opType: "RECORD_VTTFX_USAGE"; effectId: string; timestamp?: number }
  | { opType: "BATCH"; ops: DocumentOperation[] };

// ==========================================
// Asset Protocol Messages (Chunked 16KB)
// ==========================================

export type AssetProtocolMessage =
  | { type: "ASSET_FETCH_REQ"; assetHash: string }
  | {
      type: "ASSET_CHUNK_HEADER";
      assetHash: string;
      totalBytes: number;
      chunkSize: number;
      totalChunks: number;
      mimeType: string;
    }
  | {
      type: "ASSET_CHUNK_DATA";
      assetHash: string;
      chunkIndex: number;
      payload: string | number[] | Uint8Array; // Transmitted over JSON/DataChannel as Base64 string or Uint8Array/Array
    }
  | { type: "ASSET_CHUNK_COMPLETE"; assetHash: string };

// ==========================================
// Ephemeral Protocol Messages (vtt-ephemeral Channel)
// ==========================================

export type EphemeralPayload =
  | {
      type: "HEARTBEAT";
      peerId: string;
    }
  | {
      type: "CURSOR";
      peerId: string;
      username: string;
      color: string;
      x: number;
      y: number;
    }
  | {
      type: "PING";
      pingId: string;
      peerId: string;
      username: string;
      color: string;
      x: number;
      y: number;
      pingStyle: "ripple" | "arrow" | "warning";
      ttlMs: number;
      effectId?: string;
    }
  | {
      type: "MEASURE_LINE";
      measureId: string;
      peerId: string;
      username: string;
      active: boolean;
      startPoint: { x: number; y: number };
      endPoint: { x: number; y: number };
      color: string;
      unitLabel: string;
    }
  | {
      type: "LASER_LINE";
      laserId: string;
      peerId: string;
      username: string;
      color: string;
      points: [number, number][];
      ttlMs: number;
    }
  | {
      type: "ENHANCE_CHECK_KEY_REQ";
      requesterPeerId: string;
    }
  | {
      type: "ENHANCE_CHECK_KEY_ACK";
      peerId: string;
      hasKey: boolean;
    }
  | {
      type: "ENHANCE_PROXY_REQ";
      reqId: string;
      requesterPeerId: string;
      requesterUsername: string;
      proxyPeerId: string;
      box: { x: number; y: number; width: number; height: number };
      description: string;
    }
  | {
      type: "ENHANCE_PROXY_RES";
      reqId: string;
      requesterPeerId: string;
      proxyPeerId: string;
      status: "success" | "error";
      box?: { x: number; y: number; width: number; height: number };
      newMapImageId?: string;
      newMapImage?: any;
      assetManifestEntry?: { assetHash: string; mimeType: string; byteSize: number; widthPx: number; heightPx: number; };
      error?: string;
    }
  | {
      type: "VTTFX_PROXY_REQ";
      reqId: string;
      requesterPeerId: string;
      requesterUsername: string;
      proxyPeerId: string;
      iconDesc: string;
      animDesc: string;
      isCondition?: boolean;
    }
  | {
      type: "VTTFX_PROXY_RES";
      reqId: string;
      requesterPeerId: string;
      proxyPeerId: string;
      status: "success" | "error";
      vttfxItem?: any;
      conditionItem?: ConditionData;
      iconDesc?: string;
      animDesc?: string;
      isCondition?: boolean;
      error?: string;
    }
  | {
      type: "TOKEN_PROXY_REQ";
      reqId: string;
      requesterPeerId: string;
      requesterUsername: string;
      proxyPeerId: string;
      description: string;
      ringColor?: string;
    }
  | {
      type: "TOKEN_PROXY_RES";
      reqId: string;
      requesterPeerId: string;
      proxyPeerId: string;
      status: "success" | "error";
      assetManifestEntry?: { assetHash: string; mimeType: string; byteSize: number; widthPx: number; heightPx: number; };
      description?: string;
      ringColor?: string;
      error?: string;
    }
  | {
      type: "IMAGE_GEN_PROXY_REQ";
      reqId: string;
      requesterPeerId: string;
      requesterUsername: string;
      proxyPeerId: string;
      prompt: string;
      tokenRefs: { label: string; base64: string; mimeType: string }[];
    }
  | {
      type: "IMAGE_GEN_PROXY_RES";
      reqId: string;
      requesterPeerId: string;
      proxyPeerId: string;
      status: "success" | "error";
      assetManifestEntry?: { assetHash: string; mimeType: string; byteSize: number; widthPx: number; heightPx: number; };
      prompt?: string;
      error?: string;
    }
  | {
      type: "REPLAY_ANIMATION";
      msgId: string;
      effectId: string;
      senderUsername?: string;
      senderPeerId?: string;
      targetTokenIds?: string[];
    };
