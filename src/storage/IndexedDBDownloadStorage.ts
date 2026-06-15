import type {
  DownloadSessionMeta,
  DownloadSessionStorage,
} from "../modules/DownloadSession";

/**
 * Options for {@link createIndexedDBDownloadStorage}.
 */
export interface IndexedDBDownloadStorageOptions {
  /** IndexedDB database name. Default: `sidedrawer-sdk-downloads`. */
  dbName?: string;
  /** Store name for session metadata. Default: `meta`. */
  metaStoreName?: string;
  /** Store name for chunks. Default: `chunks`. */
  chunksStoreName?: string;
}

const DEFAULT_DB_NAME = "sidedrawer-sdk-downloads";
const DEFAULT_META_STORE = "meta";
const DEFAULT_CHUNKS_STORE = "chunks";
const USER_ID_INDEX = "userId";
const DB_VERSION = 2;

/**
 * Build an IndexedDB-backed implementation of
 * {@link DownloadSessionStorage}. Chunks survive page reloads and (when
 * the user grants persistence) survive browser restarts.
 *
 * Memory profile: chunks are written to disk as they arrive and read
 * back only at completion to assemble the final blob. The SDK is set up
 * to `discardBuffer` in the HTTP layer when storage is provided, so RAM
 * never holds more than one in-flight chunk at a time.
 *
 * Use:
 * ```ts
 * import { createIndexedDBDownloadStorage } from "@sidedrawer/sdk";
 *
 * const storage = createIndexedDBDownloadStorage();
 * const session = sd.files.createDownloadSession({ ..., storage });
 * ```
 *
 * Throws if called in an environment without `indexedDB` (e.g. Node).
 */
export function createIndexedDBDownloadStorage(
  options: IndexedDBDownloadStorageOptions = {}
): DownloadSessionStorage {
  const dbName = options.dbName ?? DEFAULT_DB_NAME;
  const metaStore = options.metaStoreName ?? DEFAULT_META_STORE;
  const chunksStore = options.chunksStoreName ?? DEFAULT_CHUNKS_STORE;

  if (typeof indexedDB === "undefined") {
    throw new Error(
      "createIndexedDBDownloadStorage: indexedDB is not available in this environment."
    );
  }

  let dbPromise: Promise<IDBDatabase> | null = null;
  function getDb(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(dbName, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        const tx = req.transaction;
        let metaStoreObj: IDBObjectStore;
        if (!db.objectStoreNames.contains(metaStore)) {
          metaStoreObj = db.createObjectStore(metaStore, {
            keyPath: "sessionId",
          });
        } else {
          metaStoreObj = tx!.objectStore(metaStore);
        }
        if (!metaStoreObj.indexNames.contains(USER_ID_INDEX)) {
          metaStoreObj.createIndex(USER_ID_INDEX, "userId", {
            unique: false,
          });
        }
        if (!db.objectStoreNames.contains(chunksStore)) {
          // Compound key [sessionId, offset] lets us scan chunks for a
          // single session in ascending offset order with a simple
          // bound range query.
          db.createObjectStore(chunksStore, {
            keyPath: ["sessionId", "offset"],
          });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        // If the DB is closed out from under us (user deletes it from
        // DevTools, browser evicts due to quota, another tab triggers a
        // version upgrade, etc.) we must drop the cached promise so the
        // next call re-opens. Without this, every subsequent transaction
        // would fail with InvalidStateError on a zombie connection.
        db.onclose = () => {
          if (dbPromise) {
            dbPromise = null;
          }
        };
        db.onversionchange = () => {
          // Another tab is upgrading — close this connection so the
          // upgrade can proceed, then drop our cache.
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
      req.onblocked = () => {
        dbPromise = null;
        reject(new Error("IndexedDB open blocked by another connection."));
      };
    });
    return dbPromise;
  }

  function attemptTx<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    fn: (tx: IDBTransaction) => Promise<T> | T
  ): Promise<T> {
    return getDb().then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          let tx: IDBTransaction;
          try {
            tx = db.transaction(storeNames, mode);
          } catch (err) {
            // Common case: DB was deleted/closed externally and our
            // cached connection is a zombie. Drop the cache so the
            // retry layer above can re-open.
            dbPromise = null;
            reject(err);
            return;
          }
          let settled = false;
          let result: T;
          tx.oncomplete = () => {
            if (!settled) {
              settled = true;
              resolve(result);
            }
          };
          tx.onerror = () => {
            if (!settled) {
              settled = true;
              reject(tx.error);
            }
          };
          tx.onabort = () => {
            if (!settled) {
              settled = true;
              reject(tx.error ?? new Error("IndexedDB transaction aborted."));
            }
          };

          Promise.resolve(fn(tx))
            .then((value) => {
              result = value;
            })
            .catch((err) => {
              if (!settled) {
                settled = true;
                try {
                  tx.abort();
                } catch {
                  /* tx may already be closed */
                }
                reject(err);
              }
            });
        })
    );
  }

  /**
   * Run a transaction with one transparent retry on stale-connection
   * errors. This is the main path callers should use. The retry covers
   * scenarios where the DB was deleted from DevTools, evicted by the
   * browser, or upgraded by another tab while our connection was idle.
   */
  function runTx<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    fn: (tx: IDBTransaction) => Promise<T> | T
  ): Promise<T> {
    return attemptTx(storeNames, mode, fn).catch((err) => {
      if (isStaleConnectionError(err)) {
        // Drop the cached DB and try once more with a fresh open.
        dbPromise = null;
        return attemptTx(storeNames, mode, fn);
      }
      throw err;
    });
  }

  function isStaleConnectionError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    // InvalidStateError is what browsers throw when you try to create a
    // transaction on a closed connection.
    return (
      err.name === "InvalidStateError" ||
      /closed|invalid state|database/i.test(err.message)
    );
  }

  return {
    async saveMeta(id, meta) {
      // Defensive: ensure the meta we persist carries the id passed by
      // the caller, since the object store is keyed on `sessionId`.
      const value: DownloadSessionMeta = { ...meta, sessionId: id };
      await runTx(metaStore, "readwrite", (tx) => {
        const store = tx.objectStore(metaStore);
        return wrapRequest(store.put(value));
      });
    },

    async loadMeta(id) {
      const value = await runTx(metaStore, "readonly", (tx) => {
        const store = tx.objectStore(metaStore);
        return wrapRequest<DownloadSessionMeta | undefined>(store.get(id));
      });
      return value ?? null;
    },

    async saveChunk(id, offset, chunk) {
      // Clone to a fresh Uint8Array so consumers reusing the buffer
      // don't corrupt what we persist.
      const data = new Uint8Array(chunk.byteLength);
      data.set(chunk);
      await runTx(chunksStore, "readwrite", (tx) => {
        const store = tx.objectStore(chunksStore);
        return wrapRequest(
          store.put({
            sessionId: id,
            offset,
            data,
          })
        );
      });
    },

    async loadChunks(id) {
      return runTx(chunksStore, "readonly", (tx) => {
        const store = tx.objectStore(chunksStore);
        const range = IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
        return new Promise<{ offset: number; data: Uint8Array }[]>(
          (resolve, reject) => {
            const results: { offset: number; data: Uint8Array }[] = [];
            const req = store.openCursor(range);
            req.onsuccess = () => {
              const cursor = req.result;
              if (cursor) {
                const value = cursor.value as {
                  offset: number;
                  data: Uint8Array;
                };
                results.push({ offset: value.offset, data: value.data });
                cursor.continue();
              } else {
                resolve(results);
              }
            };
            req.onerror = () => reject(req.error);
          }
        );
      });
    },

    async clear(id) {
      await runTx([metaStore, chunksStore], "readwrite", async (tx) => {
        const metaStoreObj = tx.objectStore(metaStore);
        const chunksStoreObj = tx.objectStore(chunksStore);
        await wrapRequest(metaStoreObj.delete(id));
        const range = IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
        await new Promise<void>((resolve, reject) => {
          const req = chunksStoreObj.openCursor(range);
          req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            } else {
              resolve();
            }
          };
          req.onerror = () => reject(req.error);
        });
      });
    },

    async listSessions(userId?: string) {
      return runTx(metaStore, "readonly", (tx) => {
        const store = tx.objectStore(metaStore);
        if (userId == null) {
          return wrapRequest<DownloadSessionMeta[]>(store.getAll()).then(
            (rows) => rows.filter((row) => row.userId != null)
          );
        }
        const index = store.index(USER_ID_INDEX);
        return wrapRequest<DownloadSessionMeta[]>(
          index.getAll(IDBKeyRange.only(userId))
        );
      });
    },

    async clearAllForUser(userId) {
      if (!userId) {
        throw new Error(
          "IndexedDBDownloadStorage.clearAllForUser: `userId` is required."
        );
      }
      await runTx(
        [metaStore, chunksStore],
        "readwrite",
        async (tx) => {
          const metaStoreObj = tx.objectStore(metaStore);
          const chunksStoreObj = tx.objectStore(chunksStore);
          const index = metaStoreObj.index(USER_ID_INDEX);

          const sessionIds = await new Promise<string[]>(
            (resolve, reject) => {
              const ids: string[] = [];
              const req = index.openCursor(IDBKeyRange.only(userId));
              req.onsuccess = () => {
                const cursor = req.result;
                if (cursor) {
                  const meta = cursor.value as DownloadSessionMeta;
                  ids.push(meta.sessionId);
                  cursor.continue();
                } else {
                  resolve(ids);
                }
              };
              req.onerror = () => reject(req.error);
            }
          );

          for (const id of sessionIds) {
            await wrapRequest(metaStoreObj.delete(id));
            const chunkRange = IDBKeyRange.bound(
              [id, 0],
              [id, Number.MAX_SAFE_INTEGER]
            );
            await new Promise<void>((resolve, reject) => {
              const req = chunksStoreObj.openCursor(chunkRange);
              req.onsuccess = () => {
                const cursor = req.result;
                if (cursor) {
                  cursor.delete();
                  cursor.continue();
                } else {
                  resolve();
                }
              };
              req.onerror = () => reject(req.error);
            });
          }
        }
      );
    },
  };
}

function wrapRequest<T = unknown>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
