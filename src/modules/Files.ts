import {
  catchError,
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

/**
 * Error code used when the SDK rejects a file before uploading it because
 * its size exceeds the caller-provided `maxUploadMBs` limit.
 */
export const ERR_FILE_TOO_LARGE = "ERR_FILE_TOO_LARGE";

/**
 * Error code used when the backend rejects the finalize step (`createRecordFile`)
 * with a `payload_too_large` message. The backend returns HTTP 409 instead of 413
 * today, so consumers should rely on this code rather than on the status code.
 */
export const ERR_PAYLOAD_TOO_LARGE = "ERR_PAYLOAD_TOO_LARGE";

/**
 * Thrown synchronously by `Files.upload` when the input file is larger than the
 * caller-provided `maxUploadMBs` limit. Carries the actual sizes so the consumer
 * can surface a useful message ("file is 192 MB, limit is 10 MB").
 *
 * For backend-side rejections (status 409 + `payload_too_large` message) the SDK
 * throws an `HttpServiceError` with `code === ERR_PAYLOAD_TOO_LARGE` instead, so
 * the response body is preserved.
 */
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
  /**
   * Optional client-side file size limit, in megabytes (matches the backend
   * `subscriptionFeatures.sidedrawer.maxUploadMBs` value). When set, the SDK
   * validates `file.size` before chunking and throws `FileTooLargeError`
   * synchronously if the file exceeds it.
   *
   * Recommended pattern: the consumer reads `maxUploadMBs` from the
   * SideDrawer subscription features they already loaded (e.g. the
   * `/records/sidedrawer/{id}/home` response) and forwards it here so the
   * SDK fails fast instead of uploading hundreds of MB only to be rejected
   * at finalize with `payload_too_large` (HTTP 409).
   */
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
} satisfies FileUploadOptions;

/**
 * Files Module
 */
export default class Files {
  private context: Context;

  constructor(context: Context) {
    this.context = context;
  }

  /**
   * Upload file to a record.
   *
   * If the caller passes `maxUploadMBs` (typically taken from the SideDrawer
   * subscription features) the SDK validates `file.size` synchronously and
   * throws `FileTooLargeError` before chunking — failing fast instead of
   * uploading every block only to be rejected at finalize.
   */
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

    // Preflight: fail fast if the file is bigger than what the subscription
    // allows, instead of uploading every block and then taking a 409
    // `payload_too_large` at finalize.
    if (
      optionsWithDefaults.maxUploadMBs != null &&
      optionsWithDefaults.maxUploadMBs > 0
    ) {
      const maxBytes = optionsWithDefaults.maxUploadMBs * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new FileTooLargeError(file.size, maxBytes);
      }
    }

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

    const {
      responseType = isBrowserEnvironment() ? "blob" : "arraybuffer",
      progressSubscriber$,
      resumeFrom,
      onChunk,
      discardBuffer,
      signal,
    } = options;

    if (discardBuffer && onChunk == null) {
      throw new Error(
        "files.download: `discardBuffer: true` requires `onChunk` — without it the streamed bytes are silently dropped."
      );
    }

    if (resumeFrom != null && (!Number.isFinite(resumeFrom) || resumeFrom < 0)) {
      throw new Error(
        `files.download: invalid resumeFrom (${resumeFrom}). Must be a non-negative finite number.`
      );
    }

    let downloadUrl;

    if (fileToken) {
      downloadUrl = `/api/v2/record-files/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}/record-files/${fileToken}`;
    } else if (fileNameWithExtension) {
      downloadUrl = `/api/v1/record-files/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}/record-files/${fileNameWithExtension}`;
    } else {
      return isRequired("fileNameWithExtension or fileToken");
    }

    // Build a composite progress handler that forwards to BOTH the raw
    // user callback (`options.onDownloadProgress`) and the legacy
    // percentage-based `progressSubscriber$`. The raw callback runs in
    // any environment; the percentage path is gated to browsers because
    // that's where the original implementation was scoped.
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
      onChunk != null
        ? (chunk: Uint8Array) => {
            const offsetFromStart = startOffset + receivedInThisCall;
            receivedInThisCall += chunk.byteLength;
            onChunk(chunk, offsetFromStart);
          }
        : undefined;

    return this.context.http.get<DownloadResponse>(downloadUrl, {
      responseType,
      onDownloadProgress,
      onChunk: wrappedOnChunk,
      discardBuffer,
      signal,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
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
  public createDownloadSession(params: DownloadSessionParams): DownloadSession {
    return new DownloadSession(this, params);
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
    options: { storage: DownloadSessionStorage }
  ): Promise<DownloadSession | null> {
    const meta = await options.storage.loadMeta(sessionId);
    if (meta == null) {
      return null;
    }

    return new DownloadSession(this, {
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
   * List every download session currently persisted in the given storage.
   * Use on app startup to discover unfinished downloads. Each returned
   * meta carries the original parameters plus the last persisted offset.
   */
  public async listPendingDownloads(
    storage: DownloadSessionStorage
  ): Promise<DownloadSessionMeta[]> {
    return storage.listSessions();
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
