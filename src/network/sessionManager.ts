import { hostEngine } from "./p2pHost.js";
import { clientEngine } from "./p2pClient.js";
import { DocumentOperation, EphemeralPayload } from "../types/vtt.js";
import { docStore } from "../state/documentStore.js";

class SessionManager {
  public role: "none" | "host" | "client" = "none";
  public myPeerId: string = "";
  public myUsername: string = "";
  public myColor: string = "";
  public hostRoomId: string = "";
  private ephemeralListeners: Set<(payload: EphemeralPayload) => void> = new Set();

  constructor() {
    hostEngine.onEphemeral((payload) => this.emitEphemeral(payload));
    clientEngine.onEphemeral((payload) => this.emitEphemeral(payload));
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
    return peerId;
  }

  public async joinAsClient(hostRoomId: string, username: string, color: string): Promise<string> {
    this.role = "client";
    this.myUsername = username;
    this.myColor = color;
    this.hostRoomId = hostRoomId;
    const peerId = await clientEngine.connectToHost(hostRoomId, { username, color });
    this.myPeerId = peerId;
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

  public sendEphemeral(payload: EphemeralPayload): void {
    if (this.role === "host") {
      hostEngine.broadcastEphemeral(payload);
    } else if (this.role === "client") {
      clientEngine.sendEphemeral(payload);
    }
  }

  public getActiveUsers(): Array<{ username: string; color: string; role: string }> {
    const map = new Map<string, { username: string; color: string; role: string }>();

    if (this.myUsername) {
      map.set(this.myUsername.toLowerCase().trim(), {
        username: this.myUsername,
        color: this.myColor || "#eab308",
        role: this.role === "host" ? "host" : "client"
      });
    }

    const docUsers = docStore.getDocument().users;
    for (const u of Object.values(docUsers)) {
      const nameKey = (u.username || "Anonymous").toLowerCase().trim();
      if (!map.has(nameKey)) {
        map.set(nameKey, {
          username: u.username || "Anonymous",
          color: u.color || "#38bdf8",
          role: u.role
        });
      }
    }

    return Array.from(map.values());
  }

  public disconnect(): void {
    if (this.role === "host") {
      hostEngine.disconnect();
    } else if (this.role === "client") {
      clientEngine.disconnect();
    }
    this.role = "none";
  }
}

export const sessionManager = new SessionManager();
