import { Peer, DataConnection } from "peerjs";
import { PEERJS_CONFIG } from "./stunConfig.js";
import { docStore } from "../state/documentStore.js";
import { assetStore } from "../state/idbAssetStore.js";
import { sessionManager } from "./sessionManager.js";
import {
  SyncMessage,
  DocumentOperation,
  EphemeralPayload,
  UserProfile,
  ImageEntity,
  TokenEntity
} from "../types/vtt.js";

const CHUNK_SIZE = 16384; // 16 KB

interface PendingAssetBuffer {
  mimeType: string;
  totalChunks: number;
  receivedChunks: number;
  completeSignalReceived: boolean;
  chunks: Uint8Array[];
}

async function waitForBuffer(conn: DataConnection): Promise<void> {
  const dc = (conn as any).dataChannel as RTCDataChannel | undefined;
  if (!dc) return;
  while (dc.bufferedAmount > 65536) {
    await new Promise((r) => setTimeout(r, 10));
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function payloadToUint8Array(payload: any): Uint8Array {
  if (payload instanceof Uint8Array) return payload;
  if (Array.isArray(payload)) return new Uint8Array(payload);
  if (typeof payload === "string") {
    const binary = window.atob(payload);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(0);
}

export class P2PClient {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private ephemeralListeners: Set<(payload: EphemeralPayload) => void> = new Set();
  private pendingAssets = new Map<string, PendingAssetBuffer>();
  public clientPeerId: string = "";
  private hostRoomId: string = "";
  private savedProfile: Omit<UserProfile, "peerId" | "joinedAt" | "role"> | null = null;
  private isReconnecting: boolean = false;
  private reconnectTimer: any = null;

  constructor() {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && this.hostRoomId) {
          console.log("[p2pClient] Phone/tab woke up (visibilityState: visible). Checking connection...");
          const activeConn = this.conn as DataConnection | null;
          if (!activeConn || !activeConn.open || (this.peer && this.peer.disconnected)) {
            this.attemptReconnect();
          } else {
            this.requestResync();
          }
        }
      });

      window.addEventListener("online", () => {
        const activeConn = this.conn as DataConnection | null;
        if (this.hostRoomId && (!activeConn || !activeConn.open)) {
          console.log("[p2pClient] Network online. Triggering automatic reconnect...");
          this.attemptReconnect();
        }
      });

      window.addEventListener("focus", () => {
        const activeConn = this.conn as DataConnection | null;
        if (this.hostRoomId && (!activeConn || !activeConn.open || (this.peer && this.peer.disconnected))) {
          this.attemptReconnect();
        }
      });
    }
  }

  private async tryFinalizeAsset(assetHash: string): Promise<void> {
    const buf = this.pendingAssets.get(assetHash);
    if (!buf) return;
    if (buf.receivedChunks < buf.totalChunks) return;

    console.log(`[p2pClient] Finalizing asset ${assetHash} (${buf.receivedChunks}/${buf.totalChunks} chunks received)`);
    const fullBuffer = new Uint8Array(
      buf.chunks.reduce((acc, curr) => acc + (curr ? curr.length : 0), 0)
    );
    let offset = 0;
    for (const chunk of buf.chunks) {
      if (chunk) {
        fullBuffer.set(chunk, offset);
        offset += chunk.length;
      }
    }
    const blob = new Blob([fullBuffer], { type: buf.mimeType });
    await assetStore.saveAsset(assetHash, blob);
    this.pendingAssets.delete(assetHash);
    docStore.loadSnapshot(docStore.getDocument());
  }

  public async connectToHost(
    hostRoomId: string,
    profile: Omit<UserProfile, "peerId" | "joinedAt" | "role">
  ): Promise<string> {
    this.hostRoomId = hostRoomId;
    this.savedProfile = profile;

    return new Promise((resolve, reject) => {
      this.peer = new Peer(PEERJS_CONFIG);

      this.peer.on("open", (myId) => {
        this.clientPeerId = myId;
        const conn = this.peer!.connect(hostRoomId, {
          reliable: true
        });

        conn.on("open", () => {
          this.conn = conn;
          this.setupMessageHandler(conn, profile);
          conn.send({ type: "HANDSHAKE_REQ", peerId: myId } as SyncMessage);
          resolve(myId);
        });

        conn.on("error", (err) => {
          console.error("[p2pClient] DataConnection open error:", err);
          const activeConn = this.conn as DataConnection | null;
          if (!activeConn || !activeConn.open) {
            this.attemptReconnect();
          }
          reject(err);
        });

        conn.on("close", () => {
          console.warn("[p2pClient] DataConnection closed. Triggering automatic reconnect...");
          this.conn = null;
          this.attemptReconnect();
        });
      });

      this.peer.on("disconnected", () => {
        console.warn("[p2pClient] Peer disconnected from signaling server.");
        this.attemptReconnect();
      });

      this.peer.on("error", (err) => {
        console.error("P2P Client PeerJS Error:", err);
        const activeConn = this.conn as DataConnection | null;
        if (!activeConn || !activeConn.open) {
          this.attemptReconnect();
        }
        reject(err);
      });
    });
  }

  public onEphemeral(listener: (payload: EphemeralPayload) => void): () => void {
    this.ephemeralListeners.add(listener);
    return () => this.ephemeralListeners.delete(listener);
  }

  private setupMessageHandler(
    conn: DataConnection,
    profile: Omit<UserProfile, "peerId" | "joinedAt" | "role">
  ): void {
    conn.on("data", async (raw: any) => {
      if (!raw || typeof raw !== "object") return;

      if ("type" in raw) {
        const type = raw.type;
        if (type === "CURSOR" || type === "PING" || type === "MEASURE_LINE" || type === "LASER_LINE") {
          const payload = raw as EphemeralPayload;
          if (payload.peerId) {
            sessionManager.recordActivity(payload.peerId);
          }
          for (const l of this.ephemeralListeners) {
            l(payload);
          }
          return;
        }

        const msg = raw as SyncMessage;
        switch (msg.type) {
          case "HANDSHAKE_ACK": {
            docStore.loadSnapshot(msg.snapshot);

            const userProfile: UserProfile = {
              peerId: this.clientPeerId,
              username: profile.username,
              color: profile.color,
              joinedAt: Date.now(),
              role: "client"
            };
            this.dispatchOperation({
              opType: "REGISTER_USER",
              profile: userProfile
            });

            this.dispatchOperation({
              opType: "APPEND_CHAT_MESSAGE",
              message: {
                id: "join-" + Date.now(),
                timestamp: Date.now(),
                senderPeerId: this.clientPeerId,
                senderUsername: profile.username,
                content: `${profile.username} joined the room!`,
                type: "system"
              }
            });

            await this.syncMissingAssets();
            break;
          }

          case "RESYNC_ACK": {
            console.log("[p2pClient] Received full state RESYNC_ACK from host. Rebuilding state...");
            docStore.loadSnapshot(msg.snapshot);
            await this.syncMissingAssets();
            break;
          }

          case "OP_COMMIT": {
            console.log("[p2pClient] Received OP_COMMIT from host:", msg.op.opType, msg.op);
            if ("entity" in msg.op && msg.op.entity?.lastModifiedBy) {
              sessionManager.recordActivity(msg.op.entity.lastModifiedBy);
            } else if ("message" in msg.op && msg.op.message?.senderPeerId) {
              sessionManager.recordActivity(msg.op.message.senderPeerId);
            } else if ("profile" in msg.op && msg.op.profile?.peerId) {
              sessionManager.recordActivity(msg.op.profile.peerId);
            }
            docStore.applyOperation(msg.op);
            await this.syncMissingAssets();
            break;
          }

          case "ASSET_CHUNK_HEADER": {
            this.pendingAssets.set(msg.assetHash, {
              mimeType: msg.mimeType,
              totalChunks: msg.totalChunks,
              receivedChunks: 0,
              completeSignalReceived: false,
              chunks: new Array(msg.totalChunks)
            });
            break;
          }

          case "ASSET_CHUNK_DATA": {
            const buf = this.pendingAssets.get(msg.assetHash);
            if (buf && msg.chunkIndex < buf.totalChunks) {
              if (!buf.chunks[msg.chunkIndex]) {
                buf.chunks[msg.chunkIndex] = payloadToUint8Array(msg.payload);
                buf.receivedChunks++;
              }
              if (buf.receivedChunks === buf.totalChunks) {
                await this.tryFinalizeAsset(msg.assetHash);
              }
            }
            break;
          }

          case "ASSET_CHUNK_COMPLETE": {
            const buf = this.pendingAssets.get(msg.assetHash);
            if (buf) {
              buf.completeSignalReceived = true;
              if (buf.receivedChunks === buf.totalChunks) {
                await this.tryFinalizeAsset(msg.assetHash);
              } else {
                console.log(`[p2pClient] ASSET_CHUNK_COMPLETE arrived early for ${msg.assetHash} (${buf.receivedChunks}/${buf.totalChunks} chunks). Waiting for remaining chunks.`);
              }
            }
            break;
          }

          case "ASSET_FETCH_REQ": {
            console.log("[p2pClient] Received ASSET_FETCH_REQ from host for:", msg.assetHash);
            const blob = await assetStore.getAsset(msg.assetHash);
            if (blob) {
              console.log("[p2pClient] Found asset locally, uploading to host:", msg.assetHash);
              await this.uploadAssetToHost(msg.assetHash, blob);
            } else {
              console.warn("[p2pClient] Requested asset not found locally:", msg.assetHash);
            }
            break;
          }
        }
      }
    });
  }

  public async syncMissingAssets(): Promise<void> {
    if (!this.conn || !this.conn.open) return;
    const doc = docStore.getDocument();
    const neededHashes = new Set<string>();

    for (const hash of Object.keys(doc.assetManifest)) {
      neededHashes.add(hash);
    }
    for (const ent of Object.values(doc.entities)) {
      if (ent.type === "image" || ent.type === "token") {
        neededHashes.add((ent as ImageEntity | TokenEntity).assetHash);
      }
    }

    for (const hash of neededHashes) {
      const exists = await assetStore.hasAsset(hash);
      if (!exists && this.conn.open) {
        this.conn.send({
          type: "ASSET_FETCH_REQ",
          assetHash: hash
        } as SyncMessage);
      }
    }
  }

  public async uploadAssetToHost(assetHash: string, blob: Blob): Promise<void> {
    if (!this.conn || !this.conn.open) return;

    console.log(`[p2pClient] Starting upload of asset ${assetHash} (${blob.size} bytes)...`);
    const arrayBuffer = await blob.arrayBuffer();
    const totalBytes = arrayBuffer.byteLength;
    const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);
    const bytes = new Uint8Array(arrayBuffer);

    await waitForBuffer(this.conn);
    this.conn.send({
      type: "ASSET_CHUNK_HEADER",
      assetHash,
      totalBytes,
      chunkSize: CHUNK_SIZE,
      totalChunks,
      mimeType: blob.type
    } as SyncMessage);

    for (let idx = 0; idx < totalChunks; idx++) {
      await waitForBuffer(this.conn);
      const start = idx * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalBytes);
      const chunkPayload = uint8ArrayToBase64(bytes.slice(start, end));

      this.conn.send({
        type: "ASSET_CHUNK_DATA",
        assetHash,
        chunkIndex: idx,
        payload: chunkPayload
      } as SyncMessage);

      if (idx % 4 === 0) {
        await new Promise((r) => setTimeout(r, 6));
      }
    }

    await waitForBuffer(this.conn);
    this.conn.send({
      type: "ASSET_CHUNK_COMPLETE",
      assetHash
    } as SyncMessage);
    console.log(`[p2pClient] Completed uploading asset ${assetHash} to host.`);
  }

  public dispatchOperation(op: DocumentOperation): void {
    if (!this.conn || !this.conn.open) {
      console.warn("[p2pClient] Cannot dispatchOperation: connection not open", op);
      return;
    }
    console.log("[p2pClient] Sending OP_REQUEST to host:", op.opType, op);
    const clientSeq = "seq-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    this.conn.send({
      type: "OP_REQUEST",
      clientSeq,
      op
    } as SyncMessage);
  }

  public sendEphemeral(payload: EphemeralPayload): void {
    if (this.conn && this.conn.open) {
      this.conn.send(payload);
    }
  }

  public requestResync(): void {
    if (this.conn && this.conn.open) {
      console.log("[p2pClient] Requesting full state resync from host...");
      this.conn.send({ type: "RESYNC_REQ", peerId: this.clientPeerId } as SyncMessage);
    }
  }

  public async attemptReconnect(): Promise<void> {
    if (this.isReconnecting || !this.hostRoomId || !this.savedProfile) return;
    if (this.conn && this.conn.open && this.peer && !this.peer.disconnected) {
      this.requestResync();
      return;
    }

    console.log("[p2pClient] Attempting automatic reconnection to host room:", this.hostRoomId);
    this.isReconnecting = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    try {
      if (this.conn) {
        try { this.conn.close(); } catch (e) {}
        this.conn = null;
      }
      if (this.peer) {
        try {
          if (this.peer.disconnected && !this.peer.destroyed) {
            this.peer.reconnect();
            await new Promise((r) => setTimeout(r, 1200));
          }
        } catch (e) {}
      }

      const activeConn = this.conn as DataConnection | null;
      if (!activeConn || !activeConn.open) {
        if (this.peer) {
          try { this.peer.destroy(); } catch (e) {}
          this.peer = null;
        }
        await this.connectToHost(this.hostRoomId, this.savedProfile);
      } else {
        this.requestResync();
      }
      console.log("[p2pClient] Reconnected to host successfully after wake/disconnect!");
    } catch (err) {
      console.warn("[p2pClient] Reconnect failed. Retrying shortly...", err);
      this.reconnectTimer = setTimeout(() => {
        this.isReconnecting = false;
        this.attemptReconnect();
      }, 3000);
    } finally {
      this.isReconnecting = false;
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.isReconnecting = false;
    this.hostRoomId = "";
    this.savedProfile = null;
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}

export const clientEngine = new P2PClient();

