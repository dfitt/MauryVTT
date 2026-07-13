const DB_NAME = "vtt_assets_db";
const STORE_NAME = "assets";
const DB_VERSION = 1;

class IDBAssetStore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private urlCache = new Map<string, string>();

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  public async saveAsset(hash: string, blob: Blob): Promise<void> {
    const url = URL.createObjectURL(blob);
    this.urlCache.set(hash, url);
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, hash);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getAsset(hash: string): Promise<Blob | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(hash);
      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async hasAsset(hash: string): Promise<boolean> {
    const asset = await this.getAsset(hash);
    return asset !== null;
  }

  public async getAssetObjectUrl(hash: string): Promise<string | null> {
    if (this.urlCache.has(hash)) {
      return this.urlCache.get(hash)!;
    }
    const blob = await this.getAsset(hash);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    this.urlCache.set(hash, url);
    return url;
  }

  public async getAllAssetsMap(): Promise<Record<string, Blob>> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const map: Record<string, Blob> = {};
      const req = store.openCursor();
      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          map[cursor.key as string] = cursor.value;
          cursor.continue();
        } else {
          resolve(map);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }
}

export const assetStore = new IDBAssetStore();
