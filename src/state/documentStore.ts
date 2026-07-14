import {
  VTTDocument,
  DocumentOperation,
  CanvasEntity,
  UserProfile,
  ChatMessage
} from "../types/vtt.js";

const LOCAL_STORAGE_KEY = "vtt_active_document_snapshot";

export class DocumentStore {
  private doc: VTTDocument;
  private listeners: Set<(doc: VTTDocument) => void> = new Set();

  constructor() {
    this.doc = this.createDefaultDocument();
  }

  private createDefaultDocument(): VTTDocument {
    return {
      version: "1.0.0",
      documentId: "vtt-doc-" + Math.random().toString(36).substring(2, 9),
      revision: 1,
      canvasSettings: {
        backgroundColor: "#475569",
        gridEnabled: true,
        gridType: "square",
        gridSizePx: 50,
        gridSnap: true
      },
      assetSettings: {
        maxImageDimensionPx: 1024,
        autoResizeImages: true
      },
      layers: [
        { id: "map-layer", name: "Map & Background", zIndex: 0, visible: true, locked: false },
        { id: "drawings-layer", name: "Drawings", zIndex: 1, visible: true, locked: false },
        { id: "tokens-layer", name: "Player & NPC Tokens", zIndex: 2, visible: true, locked: false }
      ],
      entities: {},
      gridCells: {},
      assetManifest: {},
      users: {},
      chatHistory: [],
      quickRolls: {}
    };
  }

  public getDocument(): VTTDocument {
    return this.doc;
  }

  public subscribe(listener: (doc: VTTDocument) => void): () => void {
    this.listeners.add(listener);
    listener(this.doc);
    return () => this.listeners.delete(listener);
  }

  private storageTimeout: any = null;

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.doc);
    }
    if (!this.storageTimeout) {
      this.storageTimeout = setTimeout(() => {
        this.storageTimeout = null;
        this.flush();
      }, 500);
    }
  }

  public flush(): void {
    if (this.storageTimeout) {
      clearTimeout(this.storageTimeout);
      this.storageTimeout = null;
    }
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.doc));
    } catch {
      // Ignore storage quota limits
    }
  }

  public initHostDocument(hostPeerId: string, username: string, color: string): void {
    this.doc = this.createDefaultDocument();
    const profile: UserProfile = {
      peerId: hostPeerId,
      username,
      color,
      joinedAt: Date.now(),
      role: "host"
    };
    this.doc.users[hostPeerId] = profile;
    this.doc.chatHistory.push({
      id: "sys-" + Date.now(),
      timestamp: Date.now(),
      senderPeerId: "system",
      senderUsername: "System",
      content: `Room created by ${username}. Ready for peers to join!`,
      type: "system"
    });
    this.notify();
  }

  public loadSnapshot(snapshot: VTTDocument): void {
    const currentUsers = this.doc ? { ...this.doc.users } : {};
    this.doc = JSON.parse(JSON.stringify(snapshot));
    this.doc.users = currentUsers;
    if (!this.doc.gridCells) {
      this.doc.gridCells = {};
    }
    if (!this.doc.quickRolls) {
      this.doc.quickRolls = {};
    }
    this.notify();
  }

  public applyOperation(op: DocumentOperation, options?: { incrementRevision?: boolean }): void {
    if (options?.incrementRevision) {
      this.doc.revision += 1;
    }
    this.applySingleOp(op);
    this.notify();
  }

  private applySingleOp(op: DocumentOperation): void {
    switch (op.opType) {
      case "CREATE_ENTITY": {
        this.doc.entities[op.entity.id] = op.entity;
        break;
      }
      case "UPDATE_ENTITY": {
        const existing = this.doc.entities[op.id];
        if (existing) {
          this.doc.entities[op.id] = {
            ...existing,
            ...op.patch,
            updatedAt: Date.now()
          } as CanvasEntity;
        }
        break;
      }
      case "DELETE_ENTITY": {
        delete this.doc.entities[op.id];
        break;
      }
      case "UPDATE_CANVAS_SETTINGS": {
        this.doc.canvasSettings = {
          ...this.doc.canvasSettings,
          ...op.patch
        };
        break;
      }
      case "REGISTER_USER": {
        this.doc.users[op.profile.peerId] = op.profile;
        break;
      }
      case "UPDATE_USER": {
        const existingUser = this.doc.users[op.peerId];
        if (existingUser) {
          this.doc.users[op.peerId] = { ...existingUser, ...op.patch };
        }
        break;
      }
      case "APPEND_CHAT_MESSAGE": {
        if (!this.doc.chatHistory.some((m) => m.id === op.message.id)) {
          this.doc.chatHistory.push(op.message);
        }
        break;
      }
      case "UPDATE_CHAT_MESSAGE": {
        const msg = this.doc.chatHistory.find((m) => m.id === op.id);
        if (msg) {
          Object.assign(msg, op.patch);
        }
        break;
      }
      case "UPDATE_GRID_CELL": {
        if (!this.doc.gridCells) {
          this.doc.gridCells = {};
        }
        const existing = this.doc.gridCells[op.cellKey] || {};
        const updated = { ...existing, ...op.patch };
        if (!updated.fillColor && !updated.fogHidden) {
          delete this.doc.gridCells[op.cellKey];
        } else {
          this.doc.gridCells[op.cellKey] = updated;
        }
        break;
      }
      case "UPDATE_QUICK_ROLLS": {
        if (!this.doc.quickRolls) {
          this.doc.quickRolls = {};
        }
        this.doc.quickRolls[op.username] = op.quickRolls;
        break;
      }
      case "BATCH": {
        for (const subOp of op.ops) {
          this.applySingleOp(subOp);
        }
        break;
      }
    }
  }

  public registerAssetManifest(hash: string, mimeType: string, byteSize: number, widthPx: number, heightPx: number): void {
    this.doc.assetManifest[hash] = {
      assetHash: hash,
      mimeType,
      byteSize,
      widthPx,
      heightPx
    };
    this.notify();
  }
}

export const docStore = new DocumentStore();
