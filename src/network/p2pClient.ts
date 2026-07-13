import { Peer, DataConnection } from "peerjs";
import { PEERJS_CONFIG } from "./stunConfig.js";
import { docStore } from "../state/documentStore.js";
import { assetStore } from "../state/idbAssetStore.js";
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
  chunks: Uint8Array[];
}

export class P2PClient {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private ephemeralListeners: Set<(payload: EphemeralPayload) => void> = new Set();
  private pendingAssets = new Map<string, PendingAssetBuffer>();
  public clientPeerId: string = "";

  public async connectToHost(
    hostRoomId: string,
    profile: Omit<UserProfile, "peerId" | "joinedAt" | "role">
  ): Promise<string> {
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

        conn.on("error", (err) => reject(err));
      });

      this.peer.on("error", (err) => {
        console.error("P2P Client PeerJS Error:", err);
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
        if (type === "CURSOR" || type === "PING" || type === "MEASURE_LINE") {
          const payload = raw as EphemeralPayload;
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

          case "OP_COMMIT": {
            docStore.applyOperation(msg.op);
            await this.syncMissingAssets();
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
              docStore.loadSnapshot(docStore.getDocument());
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

    const arrayBuffer = await blob.arrayBuffer();
    const totalBytes = arrayBuffer.byteLength;
    const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);
    const bytes = new Uint8Array(arrayBuffer);

    this.conn.send({
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

      this.conn.send({
        type: "ASSET_CHUNK_DATA",
        assetHash,
        chunkIndex: idx,
        payload: chunkBytes
      } as SyncMessage);

      if (idx % 8 === 0) {
        await new Promise((r) => setTimeout(r, 4));
      }
    }

    this.conn.send({
      type: "ASSET_CHUNK_COMPLETE",
      assetHash
    } as SyncMessage);
  }

  public dispatchOperation(op: DocumentOperation): void {
    if (!this.conn || !this.conn.open) return;
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

  public disconnect(): void {
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
