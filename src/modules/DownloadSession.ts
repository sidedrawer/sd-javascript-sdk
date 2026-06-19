import { BehaviorSubject, Observable, ReplaySubject } from "rxjs";

import type {
  DownloadResponse,
  FileDownloadOptions,
  FileDownloadParams,
} from "./Files";
import type Files from "./Files";
import { HttpServiceError } from "../core/HttpServiceError";
import type { DownloadSink } from "./sinks/types";

/**
 * Possible states of a {@link DownloadSession}.
 *
 * Transitions:
 *  - `idle` → `running` (via `start()`)
 *  - `running` → `paused` (via `pause()`)
 *  - `running` → `completed` (when the download finishes)
 *  - `running` → `failed` (on a non-cancel error)
 *  - `running` / `paused` → `canceled` (via `cancel()`)
 *  - `paused` → `running` (via `resume()` / `start()`)
 *
 * `completed`, `canceled` and `failed` are terminal — create a new session
 * to retry.
 */
export type DownloadSessionState =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "canceled"
  | "failed";

/**
 * Progress snapshot for a download session. `total` and `percentage` are
 * `undefined` until the server reports `Content-Length` for the first chunk.
 */
export interface DownloadSessionProgress {
  /** Bytes received so far (across all attempts, including resumed bytes). */
  loaded: number;
  /** Total file size, when known. */
  total?: number;
  /** 0–100, only when `total` is known. */
  percentage?: number;
  /** Next byte to download. Equals `resumeFrom` for the next attempt. */
  offset: number;
}

/**
 * Metadata persisted per session. Survives reloads when the session is
 * created with a {@link DownloadSessionStorage} adapter.
 */
export interface DownloadSessionMeta {
  /** Stable id used as the storage key. */
  sessionId: string;
  /**
   * Identifier of the user that owns this download. Required to prevent
   * cross-user leakage of persisted chunks on shared browsers / devices.
   */
  userId: string;
  sidedrawerId: string;
  recordId: string;
  fileToken?: string;
  fileNameWithExtension?: string;
  responseType?: "blob" | "arraybuffer";
  /** Last known offset of the next byte to download. */
  offset: number;
  /** Total file size, when known. */
  fileSize?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Pluggable storage for {@link DownloadSession}. Implementations decide
 * where bytes live (IndexedDB, OPFS, file system, in-memory, etc).
 *
 * Contract:
 * - `saveMeta` / `loadMeta` persist a single small JSON-shaped record per
 *   session id.
 * - `saveChunk` writes a binary chunk at an absolute offset; chunks may
 *   arrive out of order if the consumer parallelises, but the SDK calls
 *   them sequentially as bytes arrive.
 * - `loadChunks` returns the chunks **sorted by ascending offset** so the
 *   session can assemble the final blob without re-sorting.
 * - `clear` removes both meta and chunks for the session.
 * - `listSessions` returns all sessions currently persisted, used by
 *   {@link Files.listPendingDownloads}.
 */
export interface DownloadSessionStorage {
  saveMeta(id: string, meta: DownloadSessionMeta): Promise<void>;
  loadMeta(id: string): Promise<DownloadSessionMeta | null>;
  saveChunk(id: string, offset: number, chunk: Uint8Array): Promise<void>;
  loadChunks(id: string): Promise<{ offset: number; data: Uint8Array }[]>;
  clear(id: string): Promise<void>;
  /**
   * Return persisted sessions. When `userId` is provided, only sessions
   * belonging to that user must be returned. Implementations should also
   * exclude legacy entries that pre-date the `userId` field.
   */
  listSessions(userId?: string): Promise<DownloadSessionMeta[]>;
  /** Delete every session (meta + chunks) belonging to `userId`. */
  clearAllForUser(userId: string): Promise<void>;
}

export interface DownloadSessionParams
  extends FileDownloadParams,
    Partial<Pick<FileDownloadOptions, "responseType">> {
  /**
   * Identifier of the user currently authenticated on this client.
   * Required: the SDK uses it to scope persisted chunks so a different
   * user logging in on the same browser cannot see or resume them.
   */
  userId: string;
  /**
   * Optional stable identifier for the session. Used as the storage key
   * when a {@link DownloadSessionStorage} is provided, so the session can
   * be located and resumed across page reloads.
   *
   * When omitted, the SDK derives one deterministically from the
   * `userId` + `sidedrawerId` + `recordId` + `fileToken` /
   * `fileNameWithExtension` tuple so two starts of the same download
   * share progress.
   */
  sessionId?: string;
  /**
   * Persistence adapter. When provided, chunks are saved to storage as
   * they arrive (memory-safe) and the session survives page reloads.
   * When omitted, the session keeps chunks in-memory: pause/resume still
   * work within the session lifetime, but a page reload loses progress.
   *
   * When combined with a {@link sink}, the storage holds ONLY the small
   * metadata record (offset, sessionId, etc.) — the bytes themselves
   * live in whatever destination the sink writes to. This is the
   * recommended setup for very large files: pause/resume across reloads
   * with flat RAM usage and no IndexedDB-size pressure.
   */
  storage?: DownloadSessionStorage;
  /**
   * Optional streaming destination for the downloaded bytes. When set:
   *  - `discardBuffer` is forced on in the underlying HTTP layer
   *  - every chunk is piped to `sink.write` as it arrives
   *  - `sink.close()` runs on successful completion
   *  - `sink.abort()` runs on cancel / error
   *  - the {@link DownloadSessionStorage} (if any) stores only metadata,
   *    not chunks, so IndexedDB stays small regardless of file size
   *  - `result$` emits `null` on completion (the bytes are already at
   *    their final destination — the sink owns them)
   *
   * For cross-session resumable downloads with stream-to-disk, pair this
   * with `restoreFileSystemResumableSink` on the resume path so the same
   * file handle is reused (after a re-permission prompt from the
   * browser).
   */
  sink?: DownloadSink;
}

/**
 * High-level orchestration around `Files.download` that adds pause /
 * resume / cancel semantics, observable state, and optional persistence
 * for true cross-reload resume.
 *
 * Construct via `sd.files.createDownloadSession(...)` rather than `new`.
 */
export class DownloadSession {
  /** Stable session identifier (derived from params unless overridden). */
  public readonly id: string;

  private readonly _state$ = new BehaviorSubject<DownloadSessionState>("idle");
  private readonly _progress$ = new BehaviorSubject<DownloadSessionProgress>({
    loaded: 0,
    offset: 0,
  });
  // ReplaySubject(1) so late subscribers still receive the result once
  // it completes (typical UI binding pattern in Angular/Vue/React).
  private readonly _result$ = new ReplaySubject<DownloadResponse>(1);

  /** Current lifecycle state. */
  public readonly state$: Observable<DownloadSessionState> =
    this._state$.asObservable();
  /** Continuous progress updates. */
  public readonly progress$: Observable<DownloadSessionProgress> =
    this._progress$.asObservable();
  /**
   * Emits exactly once with the final payload on completion, then completes.
   * Throws via `error` on `failed`. Does not emit on `canceled`.
   */
  public readonly result$: Observable<DownloadResponse> =
    this._result$.asObservable();

  private readonly files: Files;
  private readonly params: DownloadSessionParams;
  private readonly storage?: DownloadSessionStorage;
  private readonly sink?: DownloadSink;
  /** In-memory chunk store used when no storage adapter and no sink are configured. */
  private inMemoryChunks: { offset: number; data: Uint8Array }[] = [];
  private currentController?: AbortController;
  /** Captures the intent of the latest abort so the catch can branch. */
  private pendingAbortIntent: "pause" | "cancel" | null = null;
  /**
   * Tracks in-flight chunk persistence promises. The HTTP layer drains
   * chunks synchronously while our IDB writes are async, so fast
   * downloads (small files, cached responses) can finish the stream
   * before all chunks are persisted. {@link handleCompletion} and
   * {@link cancel} must await these to avoid assembling/clearing while
   * writes are still landing.
   */
  private pendingChunkWrites: Promise<void>[] = [];

  constructor(files: Files, params: DownloadSessionParams) {
    if (!params.userId) {
      throw new Error(
        "DownloadSession: `userId` is required. Pass the id of the currently authenticated user to prevent cross-user leakage of persisted chunks."
      );
    }
    this.files = files;
    this.params = params;
    this.storage = params.storage;
    this.sink = params.sink;
    this.id = params.sessionId ?? deriveSessionId(params);
  }

  public getState(): DownloadSessionState {
    return this._state$.value;
  }

  public getProgress(): DownloadSessionProgress {
    return this._progress$.value;
  }

  /**
   * Start (or resume) the download. No-op when already running. Throws
   * when the session is in a terminal state (completed / canceled /
   * failed) — create a new session for retries.
   */
  public start(): void {
    const state = this._state$.value;
    if (state === "running") {
      return;
    }
    if (
      state === "completed" ||
      state === "canceled" ||
      state === "failed"
    ) {
      throw new Error(
        `DownloadSession.start: cannot start from terminal state "${state}". Create a new session.`
      );
    }
    void this.runAttempt();
  }

  /** Alias for {@link start}. Provided for symmetry with `pause`. */
  public resume(): void {
    this.start();
  }

  /**
   * Pause the download. The current request is aborted but the offset
   * (and persisted chunks, if any) are kept so the next `start()` /
   * `resume()` continues from where it stopped. No-op when not running.
   */
  public pause(): void {
    if (this._state$.value !== "running") {
      return;
    }
    this.pendingAbortIntent = "pause";
    // State transitions to "paused" eagerly so subscribers see the change
    // immediately rather than after the catch resolves.
    this._state$.next("paused");
    this.currentController?.abort();
  }

  /**
   * Cancel the download permanently. Aborts the current request and
   * clears any persisted chunks. Terminal — call `cancel()` on a paused
   * session to discard saved progress; otherwise call `dispose()` for
   * cleanup of finished sessions.
   */
  public cancel(): void {
    const state = this._state$.value;
    if (
      state === "completed" ||
      state === "canceled" ||
      state === "failed"
    ) {
      return;
    }
    this.pendingAbortIntent = "cancel";
    this._state$.next("canceled");
    this.currentController?.abort();
    this.inMemoryChunks = [];
    if (this.sink) {
      // Tear down the sink so its underlying resource (file handle,
      // stream, IDB cursor, …) is released. The download is canceled
      // and the partially-written destination is no longer trusted.
      Promise.resolve(this.sink.abort(new Error("DownloadSession: canceled"))).catch(() => {
        /* best-effort: sink failures during cancel should not crash */
      });
    }
    if (this.storage) {
      // Drain pending IDB writes first so they don't repopulate after
      // clear(). If any are in flight when cancel() is called, awaiting
      // them avoids leaving orphan rows in the chunks store.
      const inFlight = this.pendingChunkWrites;
      this.pendingChunkWrites = [];
      Promise.allSettled(inFlight)
        .then(() => this.storage!.clear(this.id))
        .catch(() => {
          /* best-effort: storage failure shouldn't crash cancel */
        });
    }
  }

  /**
   * Release internal subscriptions. After dispose, the observables
   * complete and the session can no longer be used. Cancels first when
   * still active.
   */
  public dispose(): void {
    const state = this._state$.value;
    if (state === "running" || state === "paused") {
      this.cancel();
    }
    this._state$.complete();
    this._progress$.complete();
    this._result$.complete();
  }

  private async runAttempt(): Promise<void> {
    this.pendingAbortIntent = null;

    // 1) Seed offset from storage if we have one.
    let offset = this._progress$.value.offset;
    if (this.storage) {
      const meta = await this.storage.loadMeta(this.id);
      if (meta) {
        offset = meta.offset;
        this._progress$.next({
          loaded: offset,
          total: meta.fileSize,
          percentage:
            meta.fileSize != null && meta.fileSize > 0
              ? Math.round((offset * 100) / meta.fileSize)
              : undefined,
          offset,
        });
      } else {
        await this.storage.saveMeta(this.id, this.buildMeta(0));
      }
    }

    this._state$.next("running");
    this.currentController = new AbortController();

    // Memory-safe streaming is enabled when we either have a sink
    // (bytes go straight to its destination) or a storage adapter
    // (bytes get persisted as they arrive). Without either, we let the
    // SDK accumulate a full blob in memory.
    const useStorage = this.storage != null;
    const useSink = this.sink != null;
    const streaming = useStorage || useSink;

    try {
      const responseType =
        this.params.responseType ??
        (typeof Blob !== "undefined" ? "blob" : "arraybuffer");

      // Capture the start offset for this attempt so the progress
      // callback can convert this-request's loaded/total (which reflect
      // only the bytes in the current HTTP response, since Range
      // requests return Content-Length of the partial body) into
      // full-file numbers.
      const attemptStartOffset = offset;
      const result = await new Promise<DownloadResponse>((resolve, reject) => {
        const subscription = this.files
          .download({
            sidedrawerId: this.params.sidedrawerId,
            recordId: this.params.recordId,
            fileToken: this.params.fileToken,
            fileNameWithExtension: this.params.fileNameWithExtension,
            responseType,
            resumeFrom: offset,
            discardBuffer: streaming,
            signal: this.currentController!.signal,
            onDownloadProgress: (event) => {
              // total may be undefined when Content-Length is missing
              // (e.g. server uses chunked transfer-encoding without
              // declaring a length). In that case we just keep what we
              // had before.
              if (event.total == null) return;
              const fullTotal = attemptStartOffset + event.total;
              const previous = this._progress$.value;
              if (previous.total === fullTotal) return;
              this._progress$.next({
                loaded: previous.loaded,
                total: fullTotal,
                percentage:
                  fullTotal > 0
                    ? Math.round((previous.loaded * 100) / fullTotal)
                    : undefined,
                offset: previous.offset,
              });
            },
            onChunk: (chunk, offsetFromStart) => {
              // Track the Promise so handleCompletion/cancel can wait
              // for the IDB write to actually land before reassembling
              // or clearing. Without this, fast streams race ahead of
              // persistence and we end up with incomplete blobs.
              this.pendingChunkWrites.push(
                this.handleChunk(chunk, offsetFromStart)
              );
            },
          })
          .subscribe({
            next: (value) => resolve(value),
            error: (err) => reject(err),
            complete: () => {
              // download() emits exactly one value before completing; if
              // for any reason `next` did not fire (e.g. discardBuffer
              // with null swallowed by an Observable contract corner),
              // we fall back here to make sure the awaiter resolves.
              resolve(null);
            },
          });
        // Cleanup when the promise settles (subscriber retained by RxJS).
        void subscription;
      });

      await this.handleCompletion(result, useStorage, useSink);
    } catch (err) {
      this.handleError(err);
    } finally {
      this.currentController = undefined;
    }
  }

  private async handleChunk(
    chunk: Uint8Array,
    offsetFromStart: number
  ): Promise<void> {
    const nextOffset = offsetFromStart + chunk.byteLength;

    try {
      if (this.sink) {
        // Sink owns the bytes — write them out (to disk, OPFS, etc.)
        // and let storage hold only the small metadata record. Chunks
        // are not duplicated in IDB so this stays memory- and
        // disk-efficient regardless of file size.
        await this.sink.write(chunk);
        if (this.storage) {
          await this.storage.saveMeta(this.id, this.buildMeta(nextOffset));
        }
      } else if (this.storage) {
        await this.storage.saveChunk(this.id, offsetFromStart, chunk);
        await this.storage.saveMeta(this.id, this.buildMeta(nextOffset));
      } else {
        // No sink + no storage — keep in memory so a pause/resume cycle
        // within the same JS context can still reassemble.
        this.inMemoryChunks.push({ offset: offsetFromStart, data: chunk });
      }
    } catch (err) {
      // Surface the persistence failure (sink or storage) as a session
      // failure so subscribers stop waiting on a download that won't
      // resolve.
      this._state$.next("failed");
      this._result$.error(err);
      this.currentController?.abort();
      return;
    }

    const previous = this._progress$.value;
    this._progress$.next({
      loaded: nextOffset,
      total: previous.total,
      percentage:
        previous.total != null && previous.total > 0
          ? Math.round((nextOffset * 100) / previous.total)
          : undefined,
      offset: nextOffset,
    });
  }

  private async handleCompletion(
    sdkResult: DownloadResponse,
    useStorage: boolean,
    useSink: boolean
  ): Promise<void> {
    // Drain any in-flight IDB / sink writes BEFORE checking state — a
    // pause() that lands while we're still persisting should be
    // respected.
    if (this.pendingChunkWrites.length > 0) {
      const inFlight = this.pendingChunkWrites;
      this.pendingChunkWrites = [];
      await Promise.allSettled(inFlight);
    }

    if (this._state$.value !== "running") {
      // pause() or cancel() flipped state before completion — already
      // handled, do not emit completion.
      return;
    }

    let finalResult: DownloadResponse;

    if (useSink && this.sink) {
      // Sink owns the bytes. Flush + close the destination, then clear
      // any session metadata. result$ emits null because the consumer
      // already chose where the bytes live (disk / OPFS / …) and the
      // SDK doesn't hold a copy.
      try {
        await this.sink.close();
      } catch (err) {
        this._state$.next("failed");
        this._result$.error(err);
        return;
      }
      if (this.storage) {
        await this.storage.clear(this.id).catch(() => {
          /* best-effort */
        });
      }
      finalResult = null;
    } else if (useStorage && this.storage) {
      // Reassemble from persisted chunks (sorted by offset per storage
      // contract). Then clear the persisted state.
      const chunks = await this.storage.loadChunks(this.id);
      finalResult = assembleBlob(chunks.map((c) => c.data), this.params.responseType);
      await this.storage.clear(this.id);
    } else if (this.inMemoryChunks.length > 0) {
      // We had pause/resume cycles without storage — assemble from
      // in-memory chunks (already in arrival order, which is offset order
      // because the SDK emits them sequentially).
      const sorted = [...this.inMemoryChunks].sort((a, b) => a.offset - b.offset);
      finalResult = assembleBlob(
        sorted.map((c) => c.data),
        this.params.responseType
      );
      this.inMemoryChunks = [];
    } else {
      // Single-shot path: the SDK already built the final blob/buffer.
      finalResult = sdkResult;
    }

    this._state$.next("completed");
    this._result$.next(finalResult);
    this._result$.complete();
  }

  private handleError(err: unknown): void {
    const isCancel =
      err instanceof HttpServiceError && err.code === "ERR_CANCELED";

    if (isCancel) {
      // The state was already advanced by pause() or cancel(); nothing
      // else to do beyond swallowing the AbortError.
      if (
        this.pendingAbortIntent === "pause" ||
        this.pendingAbortIntent === "cancel"
      ) {
        this.pendingAbortIntent = null;
        return;
      }
      // Defensive: cancel came from an external signal we don't own.
      this._state$.next("canceled");
      return;
    }

    this._state$.next("failed");
    this._result$.error(err);
  }

  private buildMeta(offset: number): DownloadSessionMeta {
    const now = Date.now();
    return {
      sessionId: this.id,
      userId: this.params.userId,
      sidedrawerId: this.params.sidedrawerId,
      recordId: this.params.recordId,
      fileToken: this.params.fileToken,
      fileNameWithExtension: this.params.fileNameWithExtension,
      responseType: this.params.responseType,
      offset,
      fileSize: this._progress$.value.total,
      createdAt: now,
      updatedAt: now,
    };
  }
}

function deriveSessionId(
  params: { userId: string } & FileDownloadParams
): string {
  const ref = params.fileToken ?? params.fileNameWithExtension ?? "no-ref";
  return `user:${params.userId}:sd:${params.sidedrawerId}:rec:${params.recordId}:ref:${ref}`;
}

function assembleBlob(
  parts: Uint8Array[],
  responseType: "blob" | "arraybuffer" | undefined
): DownloadResponse {
  const type = responseType ?? (typeof Blob !== "undefined" ? "blob" : "arraybuffer");

  if (type === "arraybuffer") {
    const totalSize = parts.reduce((acc, p) => acc + p.byteLength, 0);
    const merged = new Uint8Array(totalSize);
    let cursor = 0;
    for (const part of parts) {
      merged.set(part, cursor);
      cursor += part.byteLength;
    }
    if (typeof Buffer !== "undefined") {
      return Buffer.from(merged) as unknown as ArrayBuffer;
    }
    return merged.buffer;
  }

  // blob
  if (typeof Blob !== "undefined") {
    return new Blob(parts.map((p) => p.buffer as ArrayBuffer));
  }
  // No Blob available — fall back to ArrayBuffer / Buffer.
  const totalSize = parts.reduce((acc, p) => acc + p.byteLength, 0);
  const merged = new Uint8Array(totalSize);
  let cursor = 0;
  for (const part of parts) {
    merged.set(part, cursor);
    cursor += part.byteLength;
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(merged) as unknown as ArrayBuffer;
  }
  return merged.buffer;
}
