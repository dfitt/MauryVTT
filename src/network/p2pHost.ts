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
  chunks: Uint8Array[];
}

export class P2PHost {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private ephemeralListeners: Set<(payload: EphemeralPayload) => void> = new Set();
  private pendingAssets = new Map<string, PendingAssetBuffer>();
  public hostRoomId: string = "";

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

      this.peer.on("error", (err) => {
        console.error("P2P Host PeerJS Error:", err);
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
    if (data && typeof data === "object" && "type" in data) {
      const type = data.type;
      if (type === "CURSOR" || type === "PING" || type === "MEASURE_LINE") {
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
          await this.streamAssetToClient(conn, msg.assetHash);
          break;
        }

        case "ASSET_CHUNK_HEADER": {
          this.pendingAssets.set(msg.assetHash, {
            mimeType: msg.mimeType,
            totalChunks: msg.totalChunks,
            chunks: new Array(msg.totalChunks)
          });
          break;
        }

        case "ASSET_CHUNK_DATA": {
          const buf = this.pendingAssets.get(msg.assetHash);
          if (buf && msg.chunkIndex < buf.totalChunks) {
            buf.chunks[msg.chunkIndex] = new Uint8Array(msg.payload);
          }
          break;
        }

        case "ASSET_CHUNK_COMPLETE": {
          console.log("[p2pHost] Received ASSET_CHUNK_COMPLETE from client:", conn.peer, msg.assetHash);
          const buf = this.pendingAssets.get(msg.assetHash);
          if (buf) {
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
            await assetStore.saveAsset(msg.assetHash, blob);
            this.pendingAssets.delete(msg.assetHash);

            if (!docStore.getDocument().assetManifest[msg.assetHash]) {
              docStore.registerAssetManifest(msg.assetHash, buf.mimeType, blob.size, 512, 512);
            }

            docStore.loadSnapshot(docStore.getDocument());

            // Relay the newly received asset to all OTHER connected clients
            for (const [peerId, otherConn] of this.connections.entries()) {
              if (peerId !== conn.peer && otherConn.open) {
                this.streamAssetToClient(otherConn, msg.assetHash);
              }
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

  public broadcastEphemeral(payload: EphemeralPayload): void {
    for (const conn of this.connections.values()) {
      if (conn.open) {
        conn.send(payload);
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

    const arrayBuffer = await blob.arrayBuffer();
    const totalBytes = arrayBuffer.byteLength;
    const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);
    const bytes = new Uint8Array(arrayBuffer);

    conn.send({
      type: "ASSET_CHUNK_HEADER",
      assetHash,
      totalBytes,
      chunkSize: CHUNK_SIZE,
      totalChunks,
      mimeType: blob.type
    } as SyncMessage);

    for (let idx = 0; idx < totalChunks; idx++) {
      const start = idx * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalBytes);
      const chunkBytes = Array.from(bytes.slice(start, end));

      conn.send({
        type: "ASSET_CHUNK_DATA",
        assetHash,
        chunkIndex: idx,
        payload: chunkBytes
      } as SyncMessage);

      // Yield every 8 chunks to prevent WebRTC DataChannel buffer congestion
      if (idx % 8 === 0) {
        await new Promise((r) => setTimeout(r, 4));
      }
    }

    conn.send({
      type: "ASSET_CHUNK_COMPLETE",
      assetHash
    } as SyncMessage);
  }

  public disconnect(): void {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections.clear();
  }
}

export const hostEngine = new P2PHost();
