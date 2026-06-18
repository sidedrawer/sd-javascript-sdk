import {
  catchError,
  defer,
  mergeMap,
  Observable,
  of,
  retry,
  Subject,
  Subscriber,
  switchMap,
  tap,
  throwError,
  toArray,
} from "rxjs";

import Context from "../core/Context";
import HttpService from "../core/HttpService";
import { HttpServiceError } from "../core/HttpServiceError";
import { ExternalKeys, Metadata } from "../types/base";
import { Abortable, ObservablePromise } from "../types/core";
import { RecordFileDetail, RecordFileQueryParams } from "../types/files";
import { isBrowserEnvironment, isRequired } from "../utils/core";
import {
  createSha256Hasher,
  generateHash,
  IncrementalHasher,
} from "../utils/crypto";
import { SdkProgressEvent } from "../core/types/HttpRequestConfig";
import {
  DownloadSession,
  type DownloadSessionMeta,
  type DownloadSessionParams,
  type DownloadSessionStorage,
} from "./DownloadSession";
import type { DownloadSink } from "./sinks/types";

export const ERR_FILE_TOO_LARGE = "ERR_FILE_TOO_LARGE";

/**
 * Error code used when the backend rejects the finalize step (`createRecordFile`)
 * with a `payload_too_large` message. The backend returns HTTP 409 instead of 413
 * today, so consumers should rely on this code rather than on the status code.
 */
export const ERR_PAYLOAD_TOO_LARGE = "ERR_PAYLOAD_TOO_LARGE";

export class FileTooLargeError extends Error {
  public readonly code = ERR_FILE_TOO_LARGE;

  constructor(
    public readonly fileSizeBytes: number,
    public readonly maxBytes: number
  ) {
    const fileMb = (fileSizeBytes / (1024 * 1024)).toFixed(2);
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(2);
    super(
      `File size ${fileMb} MB exceeds the upload limit of ${maxMb} MB for this SideDrawer.`
    );
    this.name = "FileTooLargeError";
  }
}

interface UploadProcessParams {
  httpService: HttpService;
  file: File | Blob;
  sidedrawerId: string;
  recordId: string;
}

type UploadResponse = {
  hash: string;
  order: number;
};

interface UploadProcessBlock {
  block: ArrayBuffer;
  order: number;
  hash?: string;
  size: number;
  checksum: string;
}

export interface FileUploadOptions extends Abortable {
  maxRetries: number;
  maxConcurrency: number;
  progressSubscriber$?: Subject<number>;
  maxChunkSizeBytes: number;
  skipSizeCheck?: boolean;
  maxUploadMBs?: number;
}

export interface FileUploadParams extends RecordFileQueryParams {
  sidedrawerId: string;
  recordId: string;
  file: File | Blob;
  metadata?: Metadata;
  externalKeys?: ExternalKeys;
}

/**
 * Result of {@link Files.download}. `null` only when `discardBuffer: true`
 * was set in the options (memory-safe streaming mode).
 */
export type DownloadResponse = Blob | ArrayBuffer | null;

export interface FileDownloadParams {
  sidedrawerId: string;
  recordId: string;
  fileNameWithExtension?: string;
  fileToken?: string;
}

export type FileDownloadResponseType = "blob" | "arraybuffer";

export interface FileDownloadOptions extends Abortable {
  responseType: FileDownloadResponseType;
  /**
   * Lossy convenience callback used by simple UIs: receives the
   * percentage (0–100) for the **current HTTP request**. For Range
   * requests (`resumeFrom > 0`) this percentage reflects the progress
   * over the remaining bytes, NOT the full file. Use
   * {@link onDownloadProgress} if you need the raw `{loaded, total}`
   * pair to compute full-file percentages yourself.
   */
  progressSubscriber$?: Subject<number>;
  /**
   * Raw progress callback that receives the underlying
   * `{loaded, total}` pair from the HTTP layer for each downloaded
   * chunk. `loaded` and `total` reflect this HTTP request only — for
   * Range requests `total` is `Content-Length` of the partial response.
   * To get full-file numbers, add `resumeFrom` to both. Prefer this over
   * {@link progressSubscriber$} when you need precise figures.
   */
  onDownloadProgress?: (event: SdkProgressEvent) => void;
  /**
   * Start byte offset for the download. Defaults to `0` (whole file). When
   * `> 0`, the SDK issues an HTTP `Range: bytes=resumeFrom-` request and
   * the returned `Blob`/`ArrayBuffer` contains ONLY the bytes from
   * `resumeFrom` to the end. The caller is responsible for combining those
   * bytes with whatever was downloaded earlier (typically via `onChunk`).
   *
   * If the server doesn't satisfy the range it usually returns `416`; the
   * SDK surfaces that as an `HttpServiceError` so the caller can fall back
   * to a full download.
   */
  resumeFrom?: number;
  /**
   * Invoked once per network chunk while streaming. The `offsetFromStart`
   * is the **absolute** position in the original file (i.e. `resumeFrom +
   * bytesReceivedInThisCall - chunk.byteLength`), so the caller can append
   * to a partial file without bookkeeping.
   *
   * Combine with `discardBuffer: true` to keep memory flat: in that mode
   * the SDK does not accumulate the chunks for the returned value, it just
   * pipes them through this callback.
   */
  onChunk?: (chunk: Uint8Array, offsetFromStart: number) => void;
  /**
   * When `true`, the SDK does NOT buffer the streamed bytes for the
   * returned value (the download resolves with `null`). Intended for
   * memory-safe pipelines where `onChunk` writes directly to disk /
   * IndexedDB / etc.
   *
   * Requires `onChunk`; otherwise the bytes are silently dropped.
   */
  discardBuffer?: boolean;
  /**
   * Optional sink that receives each network chunk directly. When set,
   * the SDK auto-enables streaming (`discardBuffer: true`), pipes every
   * chunk through `sink.write`, calls `sink.close()` on successful
   * completion, and `sink.abort(error)` on failure / cancellation.
   *
   * Mutually compatible with `onChunk` (both fire). Pair with
   * `createFileSystemWriterSink` for stream-to-disk downloads with
   * memory usage flat at the chunk size, regardless of total file size.
   */
  sink?: DownloadSink;
}

class UploadProcess {
  private sidedrawerId: string;
  private recordId: string;
  private httpService: HttpService;
  private file: File | Blob;

  private uploadedBytesByBlockOrder: {
    [key: number]: number;
  };

  private progressSubscriber$?: Subject<number>;
  private maxChunkSizeBytes: number;

  // Whole-file SHA-256 accumulated incrementally as blocks are read in
  // `emitBlock`. This avoids the previous "second pass" via
  // `file.arrayBuffer()` after all blocks were uploaded, which forced
  // the entire file (potentially hundreds of MB) back into memory just
  // for the final `checkSum` query param.
  private fileHasher: IncrementalHasher;

  constructor(
    { httpService, file, sidedrawerId, recordId }: UploadProcessParams,
    { progressSubscriber$, maxChunkSizeBytes }: FileUploadOptions
  ) {
    this.httpService = httpService;
    this.file = file;
    this.sidedrawerId = sidedrawerId;
    this.recordId = recordId;
    this.uploadedBytesByBlockOrder = {};
    this.progressSubscriber$ = progressSubscriber$;
    this.maxChunkSizeBytes = maxChunkSizeBytes;
    this.fileHasher = createSha256Hasher();
  }

  /**
   * Returns the whole-file SHA-256 accumulated during `emitBlock`.
   *
   * Safe to call only after the block emission has completed (the upload
   * pipeline guarantees this by piping through `toArray()` before
   * `getFileChecksum()`). Calling it earlier would yield a partial digest.
   */
  getFileChecksum(): string {
    return this.fileHasher.digest();
  }

  private async emitBlock(
    subscriber: Subscriber<UploadProcessBlock>,
    totalChunks: number,
    i: number
  ): Promise<void> {
    if (i === totalChunks) {
      subscriber.complete();

      return;
    }

    const start = i * this.maxChunkSizeBytes;
    const end = Math.min(start + this.maxChunkSizeBytes, this.file.size);

    const blob: Blob = this.file.slice(start, end);
    const block: ArrayBuffer = await blob.arrayBuffer();
    const size = block.byteLength;

    // emitBlock is sequential (recursive `await`), so feeding chunks to
    // the hasher in this order produces the same digest as hashing the
    // whole file at once. The HTTP upload is parallel via `mergeMap`,
    // but that happens downstream and does not reorder our reads.
    this.fileHasher.update(block);

    const checksum = await generateHash(block, "SHA-256");

    const data: UploadProcessBlock = {
      block,
      order: i + 1,
      size,
      checksum,
    };

    subscriber.next(data);
    await this.emitBlock(subscriber, totalChunks, i + 1);
  }

  private emitBlocks(): ObservablePromise<UploadProcessBlock> {
    const self = this;

    return new Observable<UploadProcessBlock>(
      (subscriber: Subscriber<UploadProcessBlock>) => {
        const totalChunks = Math.ceil(self.file.size / this.maxChunkSizeBytes);

        self
          .emitBlock(subscriber, totalChunks, 0)
          .catch((e) => subscriber.error(e));
      }
    );
  }

  private uploadBlock(
    uploadProcessBlock: UploadProcessBlock,
    signal?: AbortSignal
  ): ObservablePromise<UploadProcessBlock> {
    const { sidedrawerId, recordId, uploadedBytesByBlockOrder } = this;

    uploadedBytesByBlockOrder[uploadProcessBlock.order] = 0;

    let onUploadProgress:
      | ((progressEvent: SdkProgressEvent) => void)
      | undefined;

    if (isBrowserEnvironment()) {
      onUploadProgress = (progressEvent: SdkProgressEvent) => {
        uploadedBytesByBlockOrder[uploadProcessBlock.order] =
          progressEvent.loaded;
        this.emitUploadProgress();
      };
    }

    const formData = new FormData();
    formData.append("block", new Blob([uploadProcessBlock.block]));

    return this.httpService
      .post<UploadResponse>(
        `/api/v2/blocks/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}/upload`,
        formData,
        {
          params: {
            order: uploadProcessBlock.order,
          },
          signal,
          onUploadProgress,
        }
      )
      .pipe(
        switchMap(({ order, hash }) => {
          uploadProcessBlock.order = order;
          uploadProcessBlock.hash = hash;

          return of(uploadProcessBlock);
        }),
        tap((uploadProcessBlock) => {
          uploadedBytesByBlockOrder[uploadProcessBlock.order] =
            uploadProcessBlock.size;
          this.emitUploadProgress();
        })
      );
  }

  emitUploadProgress() {
    if (this.progressSubscriber$ == null) {
      return;
    }

    const totalUploadedBytes = Object.values(
      this.uploadedBytesByBlockOrder
    ).reduce((accumulator, blockUploadedBytes) => {
      return accumulator + blockUploadedBytes;
    }, 0);

    const uploadedPercentage = Math.round(
      (totalUploadedBytes * 100) / this.file.size
    );

    this.progressSubscriber$.next(uploadedPercentage);
  }

  public upload({
    record,
    metadata,
    externalKeys,
    options,
  }: {
    record: RecordFileQueryParams;
    metadata?: Metadata;
    externalKeys?: ExternalKeys;
    options: FileUploadOptions;
  }): ObservablePromise<RecordFileDetail> {
    this.emitUploadProgress();

    return this.emitBlocks().pipe(
      mergeMap((block) => {
        return this.uploadBlock(block, options.signal).pipe(
          retry(options.maxRetries)
        );
      }, options.maxConcurrency),
      toArray(),
      switchMap((blocks: UploadProcessBlock[]) => {
        blocks.sort((a, b) => a.order - b.order);

        const checksum = this.getFileChecksum();

        return this.createRecordFile({
          blocks,
          record,
          metadata,
          externalKeys,
          checksum,
        });
      })
    );
  }

  private createRecordFile({
    blocks,
    record,
    metadata,
    externalKeys,
    checksum,
  }: {
    blocks: UploadProcessBlock[];
    record: RecordFileQueryParams;
    metadata?: Metadata;
    externalKeys?: ExternalKeys;
    checksum: string;
  }): ObservablePromise<RecordFileDetail> {
    const blocksJSON: string = JSON.stringify(
      blocks.map(({ hash, order }) => {
        return {
          hash,
          order,
        };
      })
    );

    let metadataJSON: string | undefined;
    let externalKeysJSON: string | undefined;

    if (metadata != null) {
      metadataJSON = JSON.stringify(metadata);
    }

    if (externalKeys != null) {
      externalKeysJSON = JSON.stringify(externalKeys);
    }

    return this.httpService
      .post<RecordFileDetail>(
        `/api/v2/record-files/sidedrawer/sidedrawer-id/${this.sidedrawerId}/records/record-id/${this.recordId}/record-files`,
        {
          metadata: metadataJSON,
          externalKeys: externalKeysJSON,
          blocks: blocksJSON,
        },
        {
          params: {
            ...record,
            checkSum: checksum,
          },
        }
      )
      .pipe(catchError((err: unknown) => throwError(() => enrichFinalizeError(err))));
  }
}

/**
 * Maps backend errors at the finalize step (`createRecordFile`) to friendlier
 * SDK errors. Today the backend returns HTTP 409 with `message: "payload_too_large"`
 * when the file exceeds the subscription's `maxUploadMBs`; the status code is
 * misleading (413 would be expected), so we normalise it via `err.code` so
 * consumers can branch on `ERR_PAYLOAD_TOO_LARGE` regardless of status.
 */
function enrichFinalizeError(err: unknown): unknown {
  if (!(err instanceof HttpServiceError)) {
    return err;
  }
  const response = err.response as
    | { status?: number; data?: { message?: string; error?: string } }
    | undefined;
  const message = response?.data?.message;
  if (message === "payload_too_large") {
    const enriched = new HttpServiceError(
      `Upload rejected by server: payload_too_large (status ${
        response?.status ?? "?"
      }). The file exceeds the SideDrawer's upload limit.`,
      ERR_PAYLOAD_TOO_LARGE,
      err.request,
      err.response
    );
    return enriched;
  }
  return err;
}

const DEFAULT_FILE_UPLOAD_OPTIONS = {
  maxRetries: 2,
  maxConcurrency: 4,
  maxChunkSizeBytes: 4 * 1024 * 1024,
  skipSizeCheck: false,
} satisfies FileUploadOptions;

function composeOnChunk(
  a: ((chunk: Uint8Array, offsetFromStart: number) => void) | undefined,
  b: (chunk: Uint8Array, offsetFromStart: number) => void
): (chunk: Uint8Array, offsetFromStart: number) => void {
  if (a == null) return b;
  return (chunk, offset) => {
    a(chunk, offset);
    b(chunk, offset);
  };
}

function preflightSizeCheck(
  file: File | Blob,
  skipSizeCheck: boolean,
  maxUploadMBs?: number
): void {
  if (skipSizeCheck) return;
  if (maxUploadMBs == null) return;
  if (!Number.isFinite(maxUploadMBs) || maxUploadMBs <= 0) return;

  const maxBytes = maxUploadMBs * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new FileTooLargeError(file.size, maxBytes);
  }
}

/**
 * Files Module
 */
export default class Files {
  private context: Context;

  constructor(context: Context) {
    this.context = context;
  }

  public upload(
    params: FileUploadParams & Partial<FileUploadOptions>
  ): ObservablePromise<RecordFileDetail> {
    const {
      sidedrawerId = isRequired("sidedrawerId"),
      recordId = isRequired("recordId"),
      file = isRequired("file"),
      fileName = isRequired("fileName"),
      uploadTitle = isRequired("uploadTitle"),
      fileType = isRequired("fileType"),
      displayType,
      envelopeId,
      correlationId,
      fileExtension,
      metadata,
      externalKeys,
      ...options
    } = params;

    const optionsWithDefaults = {
      ...DEFAULT_FILE_UPLOAD_OPTIONS,
      ...options,
    } satisfies FileUploadOptions;

    return defer(() => {
      preflightSizeCheck(
        file,
        optionsWithDefaults.skipSizeCheck ?? false,
        optionsWithDefaults.maxUploadMBs
      );

      const uploadProcess = new UploadProcess(
        {
          httpService: this.context.http,
          sidedrawerId,
          recordId,
          file,
        },
        optionsWithDefaults
      );

      return uploadProcess.upload({
        record: {
          fileName,
          uploadTitle,
          fileType,
          displayType,
          envelopeId,
          correlationId,
          fileExtension,
        },
        metadata,
        externalKeys,
        options: optionsWithDefaults,
      });
    }) as ObservablePromise<RecordFileDetail>;
  }

  /**
   * Download a file by `fileToken` (v2) or `fileNameWithExtension` (v1).
   *
   * Supports resumable downloads: pass `resumeFrom` to send an HTTP `Range`
   * request and `onChunk` to receive each network chunk as it arrives
   * (useful for streaming to disk / IndexedDB without buffering the whole
   * file). Combine with `discardBuffer: true` to opt out of in-memory
   * accumulation; the returned value is then `null` and the only data
   * exposed to the caller is via `onChunk`.
   */
  public download(
    params: FileDownloadParams & Partial<FileDownloadOptions>
  ): ObservablePromise<DownloadResponse> {
    const {
      sidedrawerId = isRequired("sidedrawerId"),
      recordId = isRequired("recordId"),
      fileNameWithExtension,
      fileToken,
      ...options
    } = params;

    let downloadUrl;

    if (fileToken) {
      downloadUrl = `/api/v2/record-files/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}/record-files/${fileToken}`;
    } else if (fileNameWithExtension) {
      downloadUrl = `/api/v1/record-files/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}/record-files/${fileNameWithExtension}`;
    } else {
      return isRequired("fileNameWithExtension or fileToken");
    }

    return this.executeDownload(downloadUrl, options);
  }

  /**
   * Download an arbitrary URL using the SDK's HTTP client (so auth
   * headers, streaming, progress, abort, and sink lifecycle all work the
   * same as in {@link download}). Use for resources that don't fit the
   * `(sidedrawerId, recordId, fileToken)` shape — typically generated
   * ZIPs, exports, or pre-signed URLs returned by the backend.
   *
   * The URL can be relative to the configured `baseUrl` or an absolute
   * `http(s)` URL.
   *
   * @example
   * ```ts
   * const sink = await createFileSystemWriterSink({ suggestedName: "all-files.zip" });
   * await sd.files.downloadByUrl(zipUrl, { sink });
   * ```
   */
  public downloadByUrl(
    url: string,
    options?: Partial<FileDownloadOptions>
  ): ObservablePromise<DownloadResponse> {
    if (typeof url !== "string" || url.length === 0) {
      return isRequired("url");
    }
    return this.executeDownload(url, options ?? {});
  }

  /**
   * Shared download pipeline used by {@link download} and
   * {@link downloadByUrl}. Wires resume/Range, progress, chunk
   * forwarding, and (when a `sink` is set) the sink lifecycle —
   * `discardBuffer` is forced on, every chunk is piped through
   * `sink.write`, and `sink.close()` / `sink.abort()` are invoked on
   * completion or failure.
   */
  private executeDownload(
    url: string,
    options: Partial<FileDownloadOptions>
  ): ObservablePromise<DownloadResponse> {
    const {
      responseType = isBrowserEnvironment() ? "blob" : "arraybuffer",
      progressSubscriber$,
      resumeFrom,
      onChunk,
      discardBuffer,
      signal,
      sink,
    } = options;

    const effectiveDiscardBuffer = sink != null ? true : discardBuffer;
    const effectiveOnChunk = sink != null
      ? composeOnChunk(onChunk, (chunk: Uint8Array) => {
          void sink.write(chunk);
        })
      : onChunk;

    if (effectiveDiscardBuffer && effectiveOnChunk == null) {
      throw new Error(
        "files.download: `discardBuffer: true` requires `onChunk` (or a `sink`) — without it the streamed bytes are silently dropped."
      );
    }

    if (resumeFrom != null && (!Number.isFinite(resumeFrom) || resumeFrom < 0)) {
      throw new Error(
        `files.download: invalid resumeFrom (${resumeFrom}). Must be a non-negative finite number.`
      );
    }

    const userOnDownloadProgress = options.onDownloadProgress;
    let onDownloadProgress:
      | ((progressEvent: SdkProgressEvent) => void)
      | undefined;

    if (userOnDownloadProgress != null || isBrowserEnvironment()) {
      onDownloadProgress = (progressEvent: SdkProgressEvent) => {
        userOnDownloadProgress?.(progressEvent);
        if (
          isBrowserEnvironment() &&
          progressSubscriber$ !== undefined &&
          progressEvent.total !== undefined
        ) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );

          progressSubscriber$.next(progress);
        }
      };
    }

    const headers: Record<string, string> = {};
    const startOffset = resumeFrom ?? 0;
    if (startOffset > 0) {
      headers["Range"] = `bytes=${startOffset}-`;
    }

    let receivedInThisCall = 0;
    const wrappedOnChunk: ((chunk: Uint8Array) => void) | undefined =
      effectiveOnChunk != null
        ? (chunk: Uint8Array) => {
            const offsetFromStart = startOffset + receivedInThisCall;
            receivedInThisCall += chunk.byteLength;
            effectiveOnChunk(chunk, offsetFromStart);
          }
        : undefined;

    const httpObservable = this.context.http.get<DownloadResponse>(url, {
      responseType,
      onDownloadProgress,
      onChunk: wrappedOnChunk,
      discardBuffer: effectiveDiscardBuffer,
      signal,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });

    if (sink == null) {
      return httpObservable;
    }

    return new Observable<DownloadResponse>((subscriber) => {
      const sub = httpObservable.subscribe({
        next: (value) => subscriber.next(value),
        error: async (err) => {
          try {
            await sink.abort(err);
          } catch {
            /* swallow secondary abort failures so the original error wins */
          }
          subscriber.error(err);
        },
        complete: () => {
          (async () => {
            try {
              await sink.close();
              subscriber.complete();
            } catch (closeErr) {
              subscriber.error(closeErr);
            }
          })();
        },
      });
      return () => sub.unsubscribe();
    }) as ObservablePromise<DownloadResponse>;
  }

  /**
   * Create a {@link DownloadSession} — a high-level wrapper around
   * `download()` that adds pause / resume / cancel semantics, observable
   * progress, and optional persistence across page reloads.
   *
   * When a {@link DownloadSessionStorage} is provided, chunks and offset
   * are persisted as they arrive so the user can close the browser and
   * later resume from the same byte. Without storage the session keeps
   * progress in memory (lost on reload).
   *
   * The session starts in `idle` state; call `session.start()` to begin.
   *
   * @example
   * ```ts
   * const session = sd.files.createDownloadSession({
   *   sidedrawerId, recordId, fileToken,
   *   responseType: "blob",
   *   storage: createIndexedDBDownloadStorage(),
   * });
   *
   * session.state$.subscribe(state => console.log("state ->", state));
   * session.progress$.subscribe(p => updateBar(p.percentage));
   * session.result$.subscribe(blob => saveToDisk(blob));
   *
   * session.start();
   * // later... session.pause(); session.resume(); session.cancel();
   * ```
   */
  public createDownloadSession(
    params: Omit<DownloadSessionParams, "userId"> & { userId?: string }
  ): DownloadSession {
    const userId = this.resolveUserId(params.userId);
    return new DownloadSession(this, { ...params, userId });
  }

  /**
   * Resolves the userId used to scope persisted download sessions.
   * Prefers an explicit value from the caller, falls back to the `sub`
   * claim decoded from the configured JWT access token. Throws when
   * neither is available so the SDK never silently writes session
   * chunks under a missing/empty owner.
   */
  public resolveUserId(explicit?: string | null): string {
    if (explicit) return explicit;
    const fromToken = this.context.userId;
    if (fromToken) return fromToken;
    throw new Error(
      "Could not determine the current userId. Pass `userId` explicitly or configure the SDK with a JWT access token that contains a `sub` claim."
    );
  }

  /**
   * Recreate a {@link DownloadSession} from previously persisted state.
   * Used on app startup to surface unfinished downloads to the user so
   * they can decide whether to resume or cancel.
   *
   * Returns `null` if no session with that id exists in storage.
   *
   * @example
   * ```ts
   * const storage = createIndexedDBDownloadStorage();
   * const pending = await sd.files.listPendingDownloads(storage);
   * for (const meta of pending) {
   *   const session = await sd.files.restoreDownloadSession(meta.sessionId, { storage });
   *   if (session && shouldAutoResume(meta)) session.resume();
   * }
   * ```
   */
  public async restoreDownloadSession(
    sessionId: string,
    options: { storage: DownloadSessionStorage; userId?: string }
  ): Promise<DownloadSession | null> {
    const userId = this.resolveUserId(options.userId);
    const meta = await options.storage.loadMeta(sessionId);
    if (meta == null) {
      return null;
    }
    if (meta.userId !== userId) {
      return null;
    }

    return new DownloadSession(this, {
      userId: meta.userId,
      sidedrawerId: meta.sidedrawerId,
      recordId: meta.recordId,
      fileToken: meta.fileToken,
      fileNameWithExtension: meta.fileNameWithExtension,
      responseType: meta.responseType,
      sessionId,
      storage: options.storage,
    });
  }

  /**
   * List every download session currently persisted in the given storage
   * for the given user. Use on app startup to discover unfinished
   * downloads for the currently authenticated user. Sessions belonging
   * to other users (or to legacy schemas without a `userId`) are NOT
   * returned.
   */
  public async listPendingDownloads(
    storage: DownloadSessionStorage,
    options: { userId?: string } = {}
  ): Promise<DownloadSessionMeta[]> {
    const userId = this.resolveUserId(options.userId);
    return storage.listSessions(userId);
  }

  /**
   * Delete every persisted download session belonging to the given user.
   * Intended for logout / account-switch flows on shared devices so the
   * next user does not inherit chunks they don't own. When `userId` is
   * omitted the SDK uses the userId derived from the configured JWT.
   */
  public async clearDownloadsForUser(
    storage: DownloadSessionStorage,
    userId?: string
  ): Promise<void> {
    const resolved = this.resolveUserId(userId);
    await storage.clearAllForUser(resolved);
  }
}

export { Files };
export {
  DownloadSession,
  type DownloadSessionMeta,
  type DownloadSessionParams,
  type DownloadSessionProgress,
  type DownloadSessionState,
  type DownloadSessionStorage,
} from "./DownloadSession";
