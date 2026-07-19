import { Peer, DataConnection } from "peerjs";
import { PEERJS_CONFIG } from "./stunConfig.js";
import { docStore } from "../state/documentStore.js";
import { assetStore } from "../state/idbAssetStore.js";
import {
  SyncMessage,
  DocumentOperation,
  EphemeralPayload
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

export class P2PHost {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private ephemeralListeners: Set<(payload: EphemeralPayload) => void> = new Set();
  private pendingAssets = new Map<string, PendingAssetBuffer>();
  public hostRoomId: string = "";
  public lastSeenMap: Map<string, number> = new Map();
  private isReconnecting: boolean = false;
  private reconnectTimer: any = null;

  constructor() {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && this.hostRoomId) {
          console.log("[p2pHost] Host machine woke up / tab visible. Checking signaling connection...");
          if (!this.peer || this.peer.disconnected || this.peer.destroyed) {
            this.attemptHostReconnect();
          }
        }
      });

      window.addEventListener("online", () => {
        if (this.hostRoomId && (!this.peer || this.peer.disconnected || this.peer.destroyed)) {
          console.log("[p2pHost] Network online. Recovering host signaling connection...");
          this.attemptHostReconnect();
        }
      });

      window.addEventListener("focus", () => {
        if (this.hostRoomId && (!this.peer || this.peer.disconnected || this.peer.destroyed)) {
          this.attemptHostReconnect();
        }
      });
    }
  }

  private async tryFinalizeAsset(assetHash: string, sourcePeerId?: string): Promise<void> {
    const buf = this.pendingAssets.get(assetHash);
    if (!buf) return;
    if (buf.receivedChunks < buf.totalChunks) return;

    console.log(`[p2pHost] Finalizing asset ${assetHash} (${buf.receivedChunks}/${buf.totalChunks} chunks received)`);
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

    if (!docStore.getDocument().assetManifest[assetHash]) {
      docStore.registerAssetManifest(assetHash, buf.mimeType, blob.size, 512, 512);
    }

    docStore.loadSnapshot(docStore.getDocument());

    // Relay the newly received asset to all OTHER connected clients
    for (const [peerId, otherConn] of this.connections.entries()) {
      if (peerId !== sourcePeerId && otherConn.open) {
        this.streamAssetToClient(otherConn, assetHash);
      }
    }
  }

  public async startHosting(customRoomId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.peer = customRoomId
        ? new Peer(customRoomId, PEERJS_CONFIG)
        : new Peer(PEERJS_CONFIG);

      this.peer.on("open", (id) => {
        this.hostRoomId = id;
        resolve(id);
      });

      this.peer.on("connection", (conn) => {
        this.setupConnection(conn);
      });

      this.peer.on("disconnected", () => {
        console.warn("[p2pHost] Host peer disconnected from signaling server.");
        this.attemptHostReconnect();
      });

      this.peer.on("error", (err) => {
        console.error("P2P Host PeerJS Error:", err);
        if (this.hostRoomId && (!this.peer || this.peer.disconnected || this.peer.destroyed)) {
          this.attemptHostReconnect();
        }
        reject(err);
      });
    });
  }

  public onEphemeral(listener: (payload: EphemeralPayload) => void): () => void {
    this.ephemeralListeners.add(listener);
    return () => this.ephemeralListeners.delete(listener);
  }

  private setupConnection(conn: DataConnection): void {
    conn.on("open", () => {
      this.connections.set(conn.peer, conn);

      conn.on("data", async (raw: any) => {
        await this.handleIncomingData(conn, raw);
      });

      conn.on("close", () => {
        this.connections.delete(conn.peer);
      });
    });
  }

  private async handleIncomingData(conn: DataConnection, data: any): Promise<void> {
    this.lastSeenMap.set(conn.peer, Date.now());
    if (data && typeof data === "object" && "type" in data) {
      const type = data.type;
      if (type === "CURSOR" || type === "PING" || type === "MEASURE_LINE" || type === "LASER_LINE") {
        const payload = data as EphemeralPayload;
        for (const l of this.ephemeralListeners) {
          l(payload);
        }
        for (const [peerId, otherConn] of this.connections.entries()) {
          if (peerId !== conn.peer && otherConn.open) {
            otherConn.send(payload);
          }
        }
        return;
      }

      const msg = data as SyncMessage;
      switch (msg.type) {
        case "HANDSHAKE_REQ": {
          const snapshot = docStore.getDocument();
          const ack: SyncMessage = {
            type: "HANDSHAKE_ACK",
            snapshot
          };
          conn.send(ack);
          break;
        }

        case "RESYNC_REQ": {
          console.log("[p2pHost] Received RESYNC_REQ from peer:", conn.peer);
          const snapshot = docStore.getDocument();
          const ack: SyncMessage = {
            type: "RESYNC_ACK",
            snapshot
          };
          conn.send(ack);
          break;
        }

        case "OP_REQUEST": {
          console.log("[p2pHost] Received OP_REQUEST from client:", conn.peer, msg.op.opType, msg.op);
          docStore.applyOperation(msg.op, { incrementRevision: true });
          const currentDoc = docStore.getDocument();

          const commit: SyncMessage = {
            type: "OP_COMMIT",
            clientSeq: msg.clientSeq,
            revision: currentDoc.revision,
            op: msg.op
          };

          console.log("[p2pHost] Broadcasting OP_COMMIT (rev " + currentDoc.revision + ") for:", msg.op.opType);
          this.broadcastMessage(commit);
          break;
        }

        case "ASSET_FETCH_REQ": {
          const blob = await assetStore.getAsset(msg.assetHash);
          if (blob) {
            await this.streamAssetToClient(conn, msg.assetHash);
          } else {
            console.warn(`[p2pHost] Missing asset ${msg.assetHash} requested by peer ${conn.peer} - asking other peers`);
            for (const [peerId, otherConn] of this.connections.entries()) {
              if (peerId !== conn.peer && otherConn.open) {
                otherConn.send({ type: "ASSET_FETCH_REQ", assetHash: msg.assetHash } as SyncMessage);
              }
            }
          }
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
              await this.tryFinalizeAsset(msg.assetHash, conn.peer);
            }
          }
          break;
        }

        case "ASSET_CHUNK_COMPLETE": {
          console.log("[p2pHost] Received ASSET_CHUNK_COMPLETE from client:", conn.peer, msg.assetHash);
          const buf = this.pendingAssets.get(msg.assetHash);
          if (buf) {
            buf.completeSignalReceived = true;
            if (buf.receivedChunks === buf.totalChunks) {
              await this.tryFinalizeAsset(msg.assetHash, conn.peer);
            } else {
              console.log(`[p2pHost] ASSET_CHUNK_COMPLETE arrived early for ${msg.assetHash} (${buf.receivedChunks}/${buf.totalChunks} chunks received). Waiting for remaining chunks...`);
              setTimeout(() => {
                const currentBuf = this.pendingAssets.get(msg.assetHash);
                if (currentBuf && currentBuf.receivedChunks < currentBuf.totalChunks) {
                  const missing: number[] = [];
                  for (let i = 0; i < currentBuf.totalChunks; i++) {
                    if (!currentBuf.chunks[i]) missing.push(i);
                  }
                  console.warn(`[p2pHost] Timeout waiting for chunks of ${msg.assetHash}. Missing ${missing.length} chunks: [${missing.slice(0, 10).join(", ")}...]. Requesting resend.`);
                  for (const [peerId, otherConn] of this.connections.entries()) {
                    if (otherConn.open) {
                      otherConn.send({ type: "ASSET_FETCH_REQ", assetHash: msg.assetHash } as SyncMessage);
                    }
                  }
                }
              }, 2000);
            }
          }
          break;
        }
      }
    }
  }

  public broadcastOperation(op: DocumentOperation): void {
    docStore.applyOperation(op, { incrementRevision: true });
    const currentDoc = docStore.getDocument();
    const commit: SyncMessage = {
      type: "OP_COMMIT",
      revision: currentDoc.revision,
      op
    };
    this.broadcastMessage(commit);
  }

  public broadcastFullState(): void {
    console.log("[p2pHost] Broadcasting full state RESYNC_ACK to all clients");
    const snapshot = docStore.getDocument();
    const msg: SyncMessage = {
      type: "RESYNC_ACK",
      snapshot
    };
    for (const conn of this.connections.values()) {
      if (conn.open) {
        conn.send(msg);
      }
    }
  }

  public broadcastEphemeral(payload: EphemeralPayload): void {
    for (const conn of this.connections.values()) {
      if (conn.open) {
        conn.send(payload);
      }
    }
  }

  public requestAssetFromPeers(assetHash: string): void {
    for (const conn of this.connections.values()) {
      if (conn.open) {
        conn.send({ type: "ASSET_FETCH_REQ", assetHash } as SyncMessage);
      }
    }
  }

  private broadcastMessage(msg: SyncMessage): void {
    for (const conn of this.connections.values()) {
      if (conn.open) {
        conn.send(msg);
      }
    }
  }

  public async broadcastAssetToAllClients(assetHash: string): Promise<void> {
    for (const conn of this.connections.values()) {
      if (conn.open) {
        await this.streamAssetToClient(conn, assetHash);
      }
    }
  }

  public async streamAssetToClient(conn: DataConnection, assetHash: string): Promise<void> {
    const blob = await assetStore.getAsset(assetHash);
    if (!blob || !conn.open) return;

    console.log(`[p2pHost] Streaming asset ${assetHash} (${blob.size} bytes) to client ${conn.peer}...`);
    const arrayBuffer = await blob.arrayBuffer();
    const totalBytes = arrayBuffer.byteLength;
    const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);
    const bytes = new Uint8Array(arrayBuffer);

    await waitForBuffer(conn);
    conn.send({
      type: "ASSET_CHUNK_HEADER",
      assetHash,
      totalBytes,
      chunkSize: CHUNK_SIZE,
      totalChunks,
      mimeType: blob.type
    } as SyncMessage);

    for (let idx = 0; idx < totalChunks; idx++) {
      await waitForBuffer(conn);
      const start = idx * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalBytes);
      const chunkPayload = uint8ArrayToBase64(bytes.slice(start, end));

      conn.send({
        type: "ASSET_CHUNK_DATA",
        assetHash,
        chunkIndex: idx,
        payload: chunkPayload
      } as SyncMessage);

      // Yield every 4 chunks to prevent WebRTC DataChannel buffer congestion
      if (idx % 4 === 0) {
        await new Promise((r) => setTimeout(r, 6));
      }
    }

    await waitForBuffer(conn);
    conn.send({
      type: "ASSET_CHUNK_COMPLETE",
      assetHash
    } as SyncMessage);
    console.log(`[p2pHost] Finished streaming asset ${assetHash} to client ${conn.peer}.`);
  }

  public async attemptHostReconnect(): Promise<void> {
    if (this.isReconnecting || !this.hostRoomId) return;
    if (this.peer && !this.peer.disconnected && !this.peer.destroyed) return;

    console.log("[p2pHost] Attempting signaling recovery for room:", this.hostRoomId);
    this.isReconnecting = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    try {
      if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
        this.peer.reconnect();
        await new Promise((r) => setTimeout(r, 1200));
      }
      if (!this.peer || this.peer.disconnected || this.peer.destroyed) {
        if (this.peer) {
          try { this.peer.destroy(); } catch (e) {}
          this.peer = null;
        }
        await this.startHosting(this.hostRoomId);
      }
      console.log("[p2pHost] Host signaling recovered successfully!");
    } catch (err) {
      console.warn("[p2pHost] Host reconnect failed. Retrying shortly...", err);
      this.reconnectTimer = setTimeout(() => {
        this.isReconnecting = false;
        this.attemptHostReconnect();
      }, 3500);
    } finally {
      this.isReconnecting = false;
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.isReconnecting = false;
    this.hostRoomId = "";
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections.clear();
  }
}

export const hostEngine = new P2PHost();
