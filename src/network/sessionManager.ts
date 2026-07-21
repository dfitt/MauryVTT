import { hostEngine } from "./p2pHost.js";
import { clientEngine } from "./p2pClient.js";
import { DocumentOperation, EphemeralPayload } from "../types/vtt.js";
import { docStore } from "../state/documentStore.js";
import { assetStore } from "../state/idbAssetStore.js";
import { autoLoadLastSavedVTTDocForRoom } from "../archive/vttdocArchive.js";

class SessionManager {
  public role: "none" | "host" | "client" = "none";
  public myPeerId: string = "";
  public myUsername: string = "";
  public myColor: string = "";
  public hostRoomId: string = "";
  private ephemeralListeners: Set<(payload: EphemeralPayload) => void> = new Set();

  private heartbeatInterval: any = null;

  constructor() {
    hostEngine.onEphemeral((payload) => {
      if (payload && (payload as any).peerId) {
        this.recordActivity((payload as any).peerId);
      }
      this.emitEphemeral(payload);
    });
    clientEngine.onEphemeral((payload) => {
      if (payload && (payload as any).peerId) {
        this.recordActivity((payload as any).peerId);
      }
      this.emitEphemeral(payload);
    });
  }

  public startHeartbeat(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.role !== "none" && this.myPeerId) {
        this.sendEphemeral({
          type: "HEARTBEAT",
          peerId: this.myPeerId
        });
      }
    }, 20000);
  }

  public stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private emitEphemeral(payload: EphemeralPayload): void {
    for (const l of this.ephemeralListeners) {
      l(payload);
    }
  }

  public onEphemeral(listener: (payload: EphemeralPayload) => void): () => void {
    this.ephemeralListeners.add(listener);
    return () => this.ephemeralListeners.delete(listener);
  }

  public async startAsHost(username: string, color: string, customRoomId?: string): Promise<string> {
    this.role = "host";
    this.myUsername = username;
    this.myColor = color;
    const peerId = await hostEngine.startHosting(customRoomId);
    this.myPeerId = peerId;
    this.hostRoomId = peerId;
    docStore.initHostDocument(peerId, username, color);
    this.startHeartbeat();
    await autoLoadLastSavedVTTDocForRoom(peerId);
    return peerId;
  }

  public async joinAsClient(hostRoomId: string, username: string, color: string): Promise<string> {
    this.role = "client";
    this.myUsername = username;
    this.myColor = color;
    this.hostRoomId = hostRoomId;
    const peerId = await clientEngine.connectToHost(hostRoomId, { username, color });
    this.myPeerId = peerId;
    this.startHeartbeat();
    return peerId;
  }

  public dispatchOperation(op: DocumentOperation): void {
    if (this.role === "host") {
      hostEngine.broadcastOperation(op);
    } else if (this.role === "client") {
      docStore.applyOperation(op, { incrementRevision: false });
      clientEngine.dispatchOperation(op);
    } else {
      docStore.applyOperation(op, { incrementRevision: true });
    }
  }

  public async uploadAsset(assetHash: string, blob: Blob): Promise<void> {
    if (this.role === "client") {
      await clientEngine.uploadAssetToHost(assetHash, blob);
    } else if (this.role === "host") {
      await hostEngine.broadcastAssetToAllClients(assetHash);
    }
  }

  public async syncMissingAssets(): Promise<void> {
    if (this.role === "client") {
      await clientEngine.syncMissingAssets();
    } else if (this.role === "host") {
      const doc = docStore.getDocument();
      for (const hash of Object.keys(doc.assetManifest)) {
        const exists = await assetStore.hasAsset(hash);
        if (!exists) {
          console.log("[sessionManager] Host requesting missing asset from all peers:", hash);
          hostEngine.requestAssetFromPeers(hash);
        }
      }
    }
  }

  public sendEphemeral(payload: EphemeralPayload): void {
    if (this.role === "host") {
      hostEngine.broadcastEphemeral(payload);
    } else if (this.role === "client") {
      clientEngine.sendEphemeral(payload);
    }
  }

  public async resyncState(): Promise<void> {
    if (this.role === "host") {
      hostEngine.broadcastFullState();
    } else if (this.role === "client") {
      clientEngine.requestResync();
    }
  }

  public lastSeenMap: Map<string, number> = new Map();

  public recordActivity(peerId: string): void {
    if (peerId) {
      const now = Date.now();
      this.lastSeenMap.set(peerId, now);
      if (this.role === "host") {
        hostEngine.lastSeenMap.set(peerId, now);
      }
    }
  }

  public getActiveUsers(): Array<{ username: string; color: string; role: string; peerId?: string }> {
    const map = new Map<string, { username: string; color: string; role: string; peerId?: string }>();
    const now = Date.now();
    const THIRTY_SECONDS_MS = 30 * 1000;

    if (this.myUsername) {
      map.set(this.myUsername.toLowerCase().trim(), {
        username: this.myUsername,
        color: this.myColor || "#eab308",
        role: this.role === "host" ? "host" : "client",
        peerId: this.myPeerId || "local"
      });
    }

    const docUsers = docStore.getDocument().users;
    for (const u of Object.values(docUsers)) {
      if (u.peerId === this.myPeerId) continue;

      const lastSeen = this.lastSeenMap.get(u.peerId) || (this.role === "host" ? hostEngine.lastSeenMap.get(u.peerId) : undefined);
      if (!lastSeen || (now - lastSeen > THIRTY_SECONDS_MS)) {
        continue;
      }

      const nameKey = (u.username || "Anonymous").toLowerCase().trim();
      if (!map.has(nameKey)) {
        map.set(nameKey, {
          username: u.username || "Anonymous",
          color: u.color || "#38bdf8",
          role: u.role,
          peerId: u.peerId
        });
      }
    }

    return Array.from(map.values());
  }

  public disconnect(): void {
    this.stopHeartbeat();
    if (this.role === "host") {
      hostEngine.disconnect();
    } else if (this.role === "client") {
      clientEngine.disconnect();
    }
    this.role = "none";
  }
}

export const sessionManager = new SessionManager();
