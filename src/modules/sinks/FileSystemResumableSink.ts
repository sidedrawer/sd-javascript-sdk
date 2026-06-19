import {
  DownloadSink,
  NoFileSystemAccessError,
  PermissionDeniedError,
  ResumableSinkNotFoundError,
} from "./types";

/**
 * Options for {@link createFileSystemResumableSink}.
 */
export interface FileSystemResumableSinkCreateOptions {
  /**
   * Stable identifier used as the storage key for the file handle.
   * Should match the `sessionId` of the {@link DownloadSession} so the
   * two records can be paired on resume.
   */
  sessionId: string;
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
  excludeAcceptAllOption?: boolean;
  startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
  /**
   * Override the storage adapter used to persist the file handle.
   * Defaults to an IndexedDB-backed adapter
   * ({@link createIndexedDBResumableSinkHandleStorage}). Provide a
   * custom adapter to use OPFS, sessionStorage, in-memory (for tests),
   * etc.
   */
  handleStorage?: ResumableSinkHandleStorage;
}

/**
 * Options for {@link restoreFileSystemResumableSink}.
 */
export interface FileSystemResumableSinkRestoreOptions {
  /** Identifier originally passed to {@link createFileSystemResumableSink}. */
  sessionId: string;
  /**
   * Byte offset where the next write must land. Typically the
   * `offset` field of the matching {@link DownloadSessionMeta} returned
   * by `files.listPendingDownloads`.
   */
  startOffset: number;
  /** Optional override; defaults to the IndexedDB-backed adapter. */
  handleStorage?: ResumableSinkHandleStorage;
}

/** Metadata stored alongside each persisted handle. */
export interface ResumableSinkHandleMeta {
  sessionId: string;
  suggestedName?: string;
  createdAt: number;
}

/**
 * Pluggable storage for {@link createFileSystemResumableSink} so the
 * persisted `FileSystemFileHandle` can live wherever the consumer
 * wants — IndexedDB by default, but easy to swap for OPFS, an
 * in-memory adapter (tests), or any other key-value store that can
 * round-trip an opaque value.
 */
export interface ResumableSinkHandleStorage {
  save(
    sessionId: string,
    entry: { handle: unknown; meta: ResumableSinkHandleMeta }
  ): Promise<void>;
  load(
    sessionId: string
  ): Promise<{ handle: unknown; meta: ResumableSinkHandleMeta } | null>;
  list(): Promise<ResumableSinkHandleMeta[]>;
  remove(sessionId: string): Promise<void>;
  removeAll(): Promise<void>;
}

interface MinimalFsHandle {
  name: string;
  queryPermission?(opts: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission?(opts: { mode: "readwrite" }): Promise<PermissionState>;
  createWritable(options?: {
    keepExistingData?: boolean;
  }): Promise<MinimalFsWritable>;
}

interface MinimalFsWritable {
  write(chunk: BufferSource | Blob | string): Promise<void>;
  seek(offset: number): Promise<void>;
  close(): Promise<void>;
  abort(reason?: unknown): Promise<void>;
}

interface ShowSaveFilePickerWindow {
  showSaveFilePicker(options?: {
    suggestedName?: string;
    types?: Array<{ description?: string; accept: Record<string, string[]> }>;
    excludeAcceptAllOption?: boolean;
    startIn?: string;
  }): Promise<MinimalFsHandle>;
}

const HANDLES_DB_NAME = "sidedrawer-sdk-fs-handles";
const HANDLES_STORE = "handles";
const HANDLES_DB_VERSION = 1;

/**
 * Returns true when the browser exposes `showSaveFilePicker`. Note that
 * a `handleStorage` override may relax the IndexedDB requirement, but
 * the picker itself is non-negotiable for the FSA-backed sink.
 */
export function isFileSystemResumableSinkSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as ShowSaveFilePickerWindow)
      .showSaveFilePicker === "function"
  );
}

/**
 * Open the save picker and create a {@link DownloadSink} that:
 *  - writes incoming chunks straight to the chosen file on disk
 *  - persists the underlying `FileSystemFileHandle` via the configured
 *    `handleStorage` (IndexedDB by default) so a subsequent
 *    {@link restoreFileSystemResumableSink} call can reopen the same
 *    file (after the user re-grants permission)
 *  - cleans up the persisted handle on `sink.close()` (download
 *    completed) and on `sink.abort()` (download canceled)
 *
 * Pair with a {@link DownloadSessionStorage} (e.g.
 * `createIndexedDBDownloadStorage`) so the session offset survives the
 * reload too: only metadata is stored in IDB (no chunks), and the bytes
 * live on disk via the sink.
 *
 * @example
 * ```ts
 * const sink = await createFileSystemResumableSink({
 *   sessionId: deriveSessionId(...),
 *   suggestedName: "video-2gb.mp4",
 * });
 * const session = sd.files.createDownloadSession({
 *   fileToken, sink, storage: createIndexedDBDownloadStorage(),
 * });
 * session.start();
 * ```
 *
 * Throws {@link NoFileSystemAccessError} when the browser does not
 * support the File System Access API.
 */
export async function createFileSystemResumableSink(
  options: FileSystemResumableSinkCreateOptions
): Promise<DownloadSink> {
  if (!isFileSystemResumableSinkSupported()) {
    throw new NoFileSystemAccessError();
  }
  if (!options.sessionId) {
    throw new Error(
      "createFileSystemResumableSink: `sessionId` is required so the handle can be reopened on resume."
    );
  }

  const handleStorage =
    options.handleStorage ?? createIndexedDBResumableSinkHandleStorage();

  const picker = (window as unknown as ShowSaveFilePickerWindow)
    .showSaveFilePicker;
  const handle = await picker({
    suggestedName: options.suggestedName,
    types: options.types,
    excludeAcceptAllOption: options.excludeAcceptAllOption,
    startIn: options.startIn,
  });

  await handleStorage.save(options.sessionId, {
    handle,
    meta: {
      sessionId: options.sessionId,
      suggestedName: options.suggestedName,
      createdAt: Date.now(),
    },
  });

  // Default `createWritable()` truncates the file and positions the
  // cursor at 0 — correct for a fresh download.
  const writable = await handle.createWritable();

  return buildSink(writable, options.sessionId, handleStorage);
}

/**
 * Recreate a {@link DownloadSink} bound to a previously persisted file
 * handle. Used on the resume path after the page was reloaded or the
 * tab closed and reopened.
 *
 * Behavior:
 *  - Looks up the handle via `handleStorage`. Throws
 *    {@link ResumableSinkNotFoundError} if missing.
 *  - Calls `handle.requestPermission({mode:'readwrite'})` — the browser
 *    is required to show a permission prompt here. Throws
 *    {@link PermissionDeniedError} if the user declines.
 *  - Opens the writable with `{keepExistingData: true}` and seeks to
 *    `startOffset` so the next chunk lands where the previous attempt
 *    stopped, preserving the bytes already on disk.
 */
export async function restoreFileSystemResumableSink(
  options: FileSystemResumableSinkRestoreOptions
): Promise<DownloadSink> {
  if (!isFileSystemResumableSinkSupported()) {
    throw new NoFileSystemAccessError();
  }
  if (!options.sessionId) {
    throw new Error("restoreFileSystemResumableSink: `sessionId` is required.");
  }
  if (
    !Number.isFinite(options.startOffset) ||
    options.startOffset < 0
  ) {
    throw new Error(
      `restoreFileSystemResumableSink: invalid startOffset (${options.startOffset}). Must be a non-negative finite number.`
    );
  }

  const handleStorage =
    options.handleStorage ?? createIndexedDBResumableSinkHandleStorage();

  const entry = await handleStorage.load(options.sessionId);
  if (entry == null) {
    throw new ResumableSinkNotFoundError(options.sessionId);
  }

  const handle = entry.handle as MinimalFsHandle;

  if (typeof handle.requestPermission === "function") {
    const existing =
      typeof handle.queryPermission === "function"
        ? await handle.queryPermission({ mode: "readwrite" })
        : "prompt";
    if (existing !== "granted") {
      const granted = await handle.requestPermission({ mode: "readwrite" });
      if (granted !== "granted") {
        throw new PermissionDeniedError(options.sessionId);
      }
    }
  }

  const writable = await handle.createWritable({ keepExistingData: true });
  if (options.startOffset > 0) {
    await writable.seek(options.startOffset);
  }

  return buildSink(writable, options.sessionId, handleStorage);
}

/**
 * List the metadata for every file handle currently persisted via the
 * given (or default) storage adapter. Useful on app startup to pair
 * pending download sessions with the handles that can resume them.
 */
export async function listResumableSinkHandles(
  handleStorage?: ResumableSinkHandleStorage
): Promise<ResumableSinkHandleMeta[]> {
  const storage = handleStorage ?? createIndexedDBResumableSinkHandleStorage();
  return storage.list();
}

/**
 * Remove a single persisted handle. Called automatically by the sink on
 * `close()` and `abort()`; exposed for consumers that want to drop a
 * stale handle without finishing the download (e.g. user logged out).
 */
export async function clearResumableSinkHandle(
  sessionId: string,
  handleStorage?: ResumableSinkHandleStorage
): Promise<void> {
  const storage = handleStorage ?? createIndexedDBResumableSinkHandleStorage();
  return storage.remove(sessionId);
}

/** Remove every persisted handle. Use on logout / account switch. */
export async function clearAllResumableSinkHandles(
  handleStorage?: ResumableSinkHandleStorage
): Promise<void> {
  const storage = handleStorage ?? createIndexedDBResumableSinkHandleStorage();
  return storage.removeAll();
}

// ─────────────────────────────────────────────────────────────────────
// Built-in IndexedDB-backed handle storage
// ─────────────────────────────────────────────────────────────────────

/**
 * Default {@link ResumableSinkHandleStorage} implementation: persists
 * each handle (and a small metadata record) to a dedicated IndexedDB
 * database. Survives reloads. Throws on first access if `indexedDB` is
 * not available in this environment.
 */
export function createIndexedDBResumableSinkHandleStorage(options: {
  dbName?: string;
  storeName?: string;
} = {}): ResumableSinkHandleStorage {
  const dbName = options.dbName ?? HANDLES_DB_NAME;
  const storeName = options.storeName ?? HANDLES_STORE;

  function openDb(): Promise<IDBDatabase> {
    if (typeof indexedDB === "undefined") {
      return Promise.reject(
        new Error(
          "FileSystemResumableSink: indexedDB is not available in this environment. Pass a custom `handleStorage` to use a different backend."
        )
      );
    }
    return new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(dbName, HANDLES_DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: "sessionId" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () =>
        reject(
          new Error(
            "FileSystemResumableSink: IndexedDB open blocked by another connection."
          )
        );
    });
  }

  function runTx<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
  ): Promise<T> {
    return openDb().then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          const tx = db.transaction(storeName, mode);
          const store = tx.objectStore(storeName);
          let result: T;
          tx.oncomplete = () => {
            db.close();
            resolve(result);
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
          const reqOrPromise = fn(store);
          if ("onsuccess" in (reqOrPromise as object)) {
            const req = reqOrPromise as IDBRequest<T>;
            req.onsuccess = () => {
              result = req.result;
            };
            req.onerror = () => reject(req.error);
          } else {
            (reqOrPromise as Promise<T>)
              .then((value) => {
                result = value;
              })
              .catch(reject);
          }
        })
    );
  }

  return {
    async save(sessionId, entry) {
      await runTx("readwrite", (store) =>
        store.put({
          sessionId,
          suggestedName: entry.meta.suggestedName,
          createdAt: entry.meta.createdAt,
          handle: entry.handle,
        })
      );
    },
    async load(sessionId) {
      const row = await runTx<
        | {
            sessionId: string;
            suggestedName?: string;
            createdAt: number;
            handle: unknown;
          }
        | undefined
      >("readonly", (store) => store.get(sessionId));
      if (row == null) return null;
      return {
        handle: row.handle,
        meta: {
          sessionId: row.sessionId,
          suggestedName: row.suggestedName,
          createdAt: row.createdAt,
        },
      };
    },
    async list() {
      const rows = await runTx<
        Array<{
          sessionId: string;
          suggestedName?: string;
          createdAt: number;
        }>
      >("readonly", (store) => store.getAll());
      return rows.map((row) => ({
        sessionId: row.sessionId,
        suggestedName: row.suggestedName,
        createdAt: row.createdAt,
      }));
    },
    async remove(sessionId) {
      await runTx("readwrite", (store) => store.delete(sessionId));
    },
    async removeAll() {
      await runTx("readwrite", (store) => store.clear());
    },
  };
}

/**
 * Ephemeral in-memory adapter — useful for tests and for "in-session
 * only" usage (no cross-reload resume, but the abstraction is the same).
 */
export function createMemoryResumableSinkHandleStorage(): ResumableSinkHandleStorage {
  const store = new Map<
    string,
    { handle: unknown; meta: ResumableSinkHandleMeta }
  >();
  return {
    async save(sessionId, entry) {
      store.set(sessionId, entry);
    },
    async load(sessionId) {
      return store.get(sessionId) ?? null;
    },
    async list() {
      return Array.from(store.values()).map((v) => v.meta);
    },
    async remove(sessionId) {
      store.delete(sessionId);
    },
    async removeAll() {
      store.clear();
    },
  };
}

// ─────────────────────────────────────────────────────────────────────
// Internal sink builder
// ─────────────────────────────────────────────────────────────────────

function buildSink(
  writable: MinimalFsWritable,
  sessionId: string,
  handleStorage: ResumableSinkHandleStorage
): DownloadSink {
  let chain: Promise<void> = Promise.resolve();
  let aborted = false;
  let closed = false;

  return {
    write(chunk: Uint8Array): Promise<void> {
      if (aborted) {
        return Promise.reject(
          new Error("[SideDrawer SDK] Cannot write to an aborted sink.")
        );
      }
      if (closed) {
        return Promise.reject(
          new Error("[SideDrawer SDK] Cannot write to a closed sink.")
        );
      }
      chain = chain.then(() => writable.write(chunk));
      return chain;
    },
    async close(): Promise<void> {
      if (aborted || closed) return;
      closed = true;
      await chain;
      await writable.close();
      await handleStorage.remove(sessionId).catch(() => {
        /* best-effort */
      });
    },
    async abort(reason?: unknown): Promise<void> {
      if (aborted || closed) return;
      aborted = true;
      try {
        await writable.abort(reason);
      } catch {
        /* best-effort: ignore secondary failures during abort */
      }
      await handleStorage.remove(sessionId).catch(() => {
        /* best-effort */
      });
    },
  };
}
