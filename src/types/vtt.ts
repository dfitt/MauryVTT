export interface VTTDocument {
  version: "1.0.0";
  documentId: string;
  revision: number;
  canvasSettings: CanvasSettings;
  assetSettings: AssetSettings;
  layers: LayerDefinition[];
  entities: Record<string, CanvasEntity>;
  assetManifest: Record<string, AssetMetadata>;
  users: Record<string, UserProfile>;
  chatHistory: ChatMessage[];
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
}

export interface ImageEntity extends BaseEntity {
  type: "image";
  assetHash: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  opacity: number;
  hiddenCells?: string[];
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
  statusEffects: string[];
  aura?: {
    radiusPx: number;
    color: string;
    opacity: number;
  };
}

export interface LineEntity extends BaseEntity {
  type: "line";
  lineType: "straight" | "freehand";
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
  type: "text" | "system" | "action" | "roll";
}

// ==========================================
// P2P Protocol Messages (vtt-sync Channel)
// ==========================================

export type SyncMessage =
  | { type: "HANDSHAKE_REQ"; peerId: string }
  | { type: "HANDSHAKE_ACK"; snapshot: VTTDocument }
  | { type: "OP_REQUEST"; clientSeq: string; op: DocumentOperation }
  | { type: "OP_COMMIT"; clientSeq?: string; revision: number; op: DocumentOperation }
  | AssetProtocolMessage;

export type DocumentOperation =
  | { opType: "CREATE_ENTITY"; entity: CanvasEntity }
  | { opType: "UPDATE_ENTITY"; id: string; patch: Partial<CanvasEntity> }
  | { opType: "DELETE_ENTITY"; id: string }
  | { opType: "UPDATE_CANVAS_SETTINGS"; patch: Partial<CanvasSettings> }
  | { opType: "REGISTER_USER"; profile: UserProfile }
  | { opType: "UPDATE_USER"; peerId: string; patch: Partial<UserProfile> }
  | { opType: "APPEND_CHAT_MESSAGE"; message: ChatMessage }
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
    };
