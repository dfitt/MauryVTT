import {
  VTTDocument,
  DocumentOperation,
  CanvasEntity,
  TokenEntity,
  UserProfile,
  ChatMessage
} from "../types/vtt.js";
import { assetStore } from "./idbAssetStore.js";
import { loadVttfxBundleFromBundle } from "../effects/vttfxLoader.js";


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
      quickRolls: {},
      customVttfxBundles: {},
      primaryTokens: {},
      characterSheets: {}
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
    this.doc.users = { ...this.doc.users, ...currentUsers };
    if (!this.doc.gridCells) {
      this.doc.gridCells = {};
    }
    if (!this.doc.quickRolls) {
      this.doc.quickRolls = {};
    }
    if (!this.doc.customVttfxBundles) {
      this.doc.customVttfxBundles = {};
    } else {
      for (const bundle of Object.values(this.doc.customVttfxBundles)) {
        if (bundle) loadVttfxBundleFromBundle(bundle);
      }
    }
    if (!this.doc.primaryTokens) {
      this.doc.primaryTokens = {};
    }
    if (!this.doc.characterSheets) {
      this.doc.characterSheets = {};
    }
    this.cleanupAllUnusedAssets();
    this.notify();
  }

  public applyOperation(op: DocumentOperation, options?: { incrementRevision?: boolean }): void {
    if (options?.incrementRevision) {
      this.doc.revision += 1;
    }
    this.applySingleOp(op);
    this.notify();
  }

  private recordHpAndCheckMax(target: { hp?: string | number; maxHp?: string | number; hpHistory?: (string | number)[] }, newHp: string | number | undefined): void {
    if (newHp === undefined || newHp === "" || String(newHp).trim() === "") return;
    const strHp = String(newHp).trim();
    if (!target.hpHistory) target.hpHistory = [];
    if (target.hpHistory[target.hpHistory.length - 1] !== strHp) {
      target.hpHistory.push(strHp);
      if (target.hpHistory.length > 20) {
        target.hpHistory = target.hpHistory.slice(-20);
      }
    }
    const numHp = Number(strHp);
    if (!isNaN(numHp)) {
      const currentMax = Number(target.maxHp || 0);
      const historyMax = Math.max(0, ...target.hpHistory.map((h) => Number(h)).filter((n) => !isNaN(n)));
      if (numHp > currentMax && numHp >= historyMax) {
        target.maxHp = numHp;
      }
    }
  }

  private applyAutoHpConditions(token: TokenEntity): void {
    if (!token || token.hp === undefined || token.hp === "" || String(token.hp).trim() === "") return;
    const numHp = Number(String(token.hp).trim());
    if (isNaN(numHp)) return;

    const currentMax = Number(token.maxHp !== undefined && token.maxHp !== "" ? token.maxHp : numHp);
    const effects = new Set<string>(token.statusEffects || []);
    let modified = false;

    if (numHp <= 0) {
      if (!effects.has("down")) {
        effects.add("down");
        modified = true;
      }
    } else {
      if (effects.has("down")) {
        effects.delete("down");
        modified = true;
      }
    }

    if (currentMax > 0 && numHp <= currentMax / 2) {
      if (!effects.has("bloodied")) {
        effects.add("bloodied");
        modified = true;
      }
    } else if (currentMax > 0 && numHp > currentMax / 2) {
      if (effects.has("bloodied")) {
        effects.delete("bloodied");
        modified = true;
      }
    }

    if (modified) {
      token.statusEffects = Array.from(effects);
      token.updatedAt = Date.now();
    }
  }

  private syncNameBetweenSheetAndClaimedToken(username: string, newName?: string, source: "sheet" | "token" = "sheet"): void {
    if (!username) return;
    if (!this.doc.characterSheets) this.doc.characterSheets = {};
    if (!this.doc.primaryTokens) this.doc.primaryTokens = {};

    const tokenId = this.doc.primaryTokens[username] || Object.values(this.doc.entities).find((e) => e.type === "token" && (e as any).primaryOwnerUsername === username)?.id;
    const sheet = this.doc.characterSheets[username] || { username };

    if (source === "sheet") {
      const nameToSync = newName !== undefined ? newName : sheet.characterName;
      if (tokenId && this.doc.entities[tokenId]) {
        const tok = this.doc.entities[tokenId] as any;
        if (nameToSync !== undefined && tok.label !== nameToSync) {
          tok.label = nameToSync;
          tok.updatedAt = Date.now();
        }
        if (sheet.hp !== undefined && tok.hp !== sheet.hp) {
          tok.hp = sheet.hp;
          tok.updatedAt = Date.now();
        }
        if (sheet.maxHp !== undefined && tok.maxHp !== sheet.maxHp) {
          tok.maxHp = sheet.maxHp;
          tok.updatedAt = Date.now();
        }
        if (sheet.hp !== undefined || sheet.maxHp !== undefined) {
          this.applyAutoHpConditions(tok);
        }
        if (sheet.hpHistory && JSON.stringify(tok.hpHistory) !== JSON.stringify(sheet.hpHistory)) {
          tok.hpHistory = [...sheet.hpHistory];
          tok.updatedAt = Date.now();
        }
      }
    } else if (source === "token") {
      const nameToSync = newName !== undefined ? newName : (tokenId && this.doc.entities[tokenId] ? (this.doc.entities[tokenId] as any).label : undefined);
      if (tokenId && this.doc.entities[tokenId]) {
        const tok = this.doc.entities[tokenId] as any;
        let sheetUpdated = false;
        const updatedSheet = { ...sheet, username };
        if (nameToSync !== undefined && sheet.characterName !== nameToSync) {
          updatedSheet.characterName = nameToSync;
          sheetUpdated = true;
        }
        if (tok.hp !== undefined && sheet.hp !== tok.hp) {
          updatedSheet.hp = tok.hp;
          sheetUpdated = true;
        }
        if (tok.maxHp !== undefined && sheet.maxHp !== tok.maxHp) {
          updatedSheet.maxHp = tok.maxHp;
          sheetUpdated = true;
        }
        if (tok.hpHistory && JSON.stringify(sheet.hpHistory) !== JSON.stringify(tok.hpHistory)) {
          updatedSheet.hpHistory = [...tok.hpHistory];
          sheetUpdated = true;
        }
        if (sheetUpdated) {
          this.doc.characterSheets[username] = updatedSheet;
        }
      }
    }
  }

  private applySingleOp(op: DocumentOperation): void {
    if (!this.doc.primaryTokens) {
      this.doc.primaryTokens = {};
    }
    switch (op.opType) {
      case "CREATE_ENTITY": {
        this.doc.entities[op.entity.id] = op.entity;
        if (op.entity.type === "token") {
          const tok = op.entity as any;
          this.applyAutoHpConditions(tok);
          if (tok.primaryOwnerUsername) {
            this.doc.primaryTokens[tok.primaryOwnerUsername] = tok.id;
            for (const ent of Object.values(this.doc.entities)) {
              if (ent.type === "token" && ent.id !== tok.id && (ent as any).primaryOwnerUsername === tok.primaryOwnerUsername) {
                (ent as any).primaryOwnerUsername = undefined;
              }
            }
            if (this.doc.characterSheets?.[tok.primaryOwnerUsername]?.characterName) {
              this.syncNameBetweenSheetAndClaimedToken(tok.primaryOwnerUsername, undefined, "sheet");
            } else if (tok.label) {
              this.syncNameBetweenSheetAndClaimedToken(tok.primaryOwnerUsername, tok.label, "token");
            }
          }
        }
        break;
      }
      case "UPDATE_ENTITY": {
        const existing = this.doc.entities[op.id];
        if (existing) {
          const oldHash = ("assetHash" in existing) ? (existing as any).assetHash : undefined;
          this.doc.entities[op.id] = {
            ...existing,
            ...op.patch,
            updatedAt: Date.now()
          } as CanvasEntity;
          const newHash = ("assetHash" in this.doc.entities[op.id]) ? (this.doc.entities[op.id] as any).assetHash : undefined;
          if (oldHash && oldHash !== newHash) {
            this.cleanupUnusedAssetHash(oldHash);
          }
          if (existing.type === "token") {
            const updatedTok = this.doc.entities[op.id] as any;
            const oldOwner = (existing as any).primaryOwnerUsername;
            const newOwner = updatedTok.primaryOwnerUsername;
            if (oldOwner && oldOwner !== newOwner && this.doc.primaryTokens[oldOwner] === op.id) {
              delete this.doc.primaryTokens[oldOwner];
            }
            if (newOwner) {
              this.doc.primaryTokens[newOwner] = updatedTok.id;
              for (const ent of Object.values(this.doc.entities)) {
                if (ent.type === "token" && ent.id !== updatedTok.id && (ent as any).primaryOwnerUsername === newOwner) {
                  (ent as any).primaryOwnerUsername = undefined;
                }
              }
            } else if ("primaryOwnerUsername" in op.patch && !newOwner) {
              for (const [uname, tid] of Object.entries(this.doc.primaryTokens)) {
                if (tid === op.id) {
                  delete this.doc.primaryTokens[uname];
                }
              }
            }

            const patchToken = op.patch as Partial<TokenEntity>;
            if (patchToken.hp !== undefined || patchToken.maxHp !== undefined) {
              if (patchToken.hp !== undefined) {
                this.recordHpAndCheckMax(updatedTok, patchToken.hp);
              }
              this.applyAutoHpConditions(updatedTok);
            }
            if (patchToken.label !== undefined && newOwner) {
              this.syncNameBetweenSheetAndClaimedToken(newOwner, patchToken.label, "token");
            } else if (newOwner) {
              if (patchToken.hp !== undefined || patchToken.maxHp !== undefined) {
                this.syncNameBetweenSheetAndClaimedToken(newOwner, updatedTok.label, "token");
              } else if (oldOwner !== newOwner) {
                if (this.doc.characterSheets?.[newOwner]?.characterName) {
                  this.syncNameBetweenSheetAndClaimedToken(newOwner, undefined, "sheet");
                } else if (updatedTok.label) {
                  this.syncNameBetweenSheetAndClaimedToken(newOwner, updatedTok.label, "token");
                }
              }
            }
          }
        }
        break;
      }
      case "DELETE_ENTITY": {
        const ent = this.doc.entities[op.id];
        delete this.doc.entities[op.id];
        if (ent && ("assetHash" in ent) && (ent as any).assetHash) {
          this.cleanupUnusedAssetHash((ent as any).assetHash);
        }
        if (ent && ent.type === "token") {
          for (const [uname, tid] of Object.entries(this.doc.primaryTokens)) {
            if (tid === op.id) {
              delete this.doc.primaryTokens[uname];
            }
          }
        }
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
      case "UPDATE_CHARACTER_SHEET": {
        if (!this.doc.characterSheets) {
          this.doc.characterSheets = {};
        }
        const updatedSheet = {
          ...this.doc.characterSheets[op.username],
          ...op.sheet,
          username: op.username
        };
        if (op.sheet.hp !== undefined) {
          this.recordHpAndCheckMax(updatedSheet, op.sheet.hp);
        }
        this.doc.characterSheets[op.username] = updatedSheet;
        this.syncNameBetweenSheetAndClaimedToken(op.username, op.sheet.characterName, "sheet");
        break;
      }
      case "CLEAR_CHAT_HISTORY": {
        this.doc.chatHistory = [];
        break;
      }
      case "BATCH": {
        for (const subOp of op.ops) {
          this.applySingleOp(subOp);
        }
        break;
      }
      case "REGISTER_VTTFX_BUNDLE": {
        if (!this.doc.customVttfxBundles) {
          this.doc.customVttfxBundles = {};
        }
        const key = op.bundle.bundleName || "bundle_" + Date.now();
        this.doc.customVttfxBundles[key] = op.bundle;
        loadVttfxBundleFromBundle(op.bundle);
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

  public cleanupUnusedAssetHash(hash: string): void {
    if (!hash) return;
    const isUsed = Object.values(this.doc.entities).some(
      (e) => ("assetHash" in e) && (e as any).assetHash === hash
    );
    if (!isUsed) {
      if (this.doc.assetManifest[hash]) {
        delete this.doc.assetManifest[hash];
      }
      assetStore.deleteAsset(hash).catch((err) =>
        console.error("[documentStore] Error deleting unused asset from store:", err)
      );
    }
  }

  public cleanupAllUnusedAssets(): void {
    const activeHashes = new Set<string>();
    for (const ent of Object.values(this.doc.entities)) {
      if (("assetHash" in ent) && (ent as any).assetHash) {
        activeHashes.add((ent as any).assetHash);
      }
    }
    for (const hash of Object.keys(this.doc.assetManifest)) {
      if (!activeHashes.has(hash)) {
        delete this.doc.assetManifest[hash];
        assetStore.deleteAsset(hash).catch((err) =>
          console.error("[documentStore] Error deleting unused asset from store:", err)
        );
      }
    }
  }
}

export const docStore = new DocumentStore();
