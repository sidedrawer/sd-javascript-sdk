import {
  from,
  mergeMap,
  Observable,
  of,
  retry,
  Subject,
  Subscriber,
  switchMap,
  tap,
  toArray,
} from "rxjs";

import Context from "../core/Context";
import HttpService from "../core/HttpService";
import { ExternalKeys, Metadata } from "../types/base";
import { Abortable, ObservablePromise } from "../types/core";
import { RecordFileDetail, RecordFileQueryParams } from "../types/files";
import { isBrowserEnvironment, isRequired } from "../utils/core";
import { generateHash } from "../utils/crypto";
import { AxiosProgressEvent } from "axios";

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
}

export interface FileUploadParams extends RecordFileQueryParams {
  sidedrawerId: string;
  recordId: string;
  file: File | Blob;
  metadata?: Metadata;
  externalKeys?: ExternalKeys;
}

export type DownloadResponse = Blob | ArrayBuffer;

export interface FileDownloadParams {
  sidedrawerId: string;
  recordId: string;
  fileNameWithExtension?: string;
  fileToken?: string;
}

export type FileDownloadResponseType = "blob" | "arraybuffer";

export interface FileDownloadOptions {
  responseType: FileDownloadResponseType;
  progressSubscriber$?: Subject<number>;
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
  }

  async getFileChecksum(): Promise<string> {
    const fileArrayBuffer: ArrayBuffer = await this.file.arrayBuffer();
    return await generateHash(fileArrayBuffer, "SHA-256");
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
      | ((progressEvent: AxiosProgressEvent) => void)
      | undefined;

    if (isBrowserEnvironment()) {
      onUploadProgress = (progressEvent: AxiosProgressEvent) => {
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
          headers: {
            "Content-Type": "multipart/form-data",
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

        return from(this.getFileChecksum()).pipe(
          mergeMap((checksum) => {
            return this.createRecordFile({
              blocks,
              record,
              metadata,
              externalKeys,
              checksum,
            });
          })
        );
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

    return this.httpService.post<RecordFileDetail>(
      `/api/v2/record-files/sidedrawer/sidedrawer-id/${this.sidedrawerId}/records/record-id/${this.recordId}/record-files`,
      {
        metadata: metadataJSON,
        externalKeys: externalKeysJSON,
        blocks: blocksJSON,
      },
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        params: {
          ...record,
          checkSum: checksum,
        },
      }
    );
  }
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
    } = options;

    let downloadUrl;

    if (fileToken) {
      downloadUrl = `/api/v2/record-files/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}/record-files/${fileToken}`;
    } else if (fileNameWithExtension) {
      downloadUrl = `/api/v1/record-files/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}/record-files/${fileNameWithExtension}`;
    } else {
      return isRequired("fileNameWithExtension or fileToken");
    }

    let onDownloadProgress:
      | ((progressEvent: AxiosProgressEvent) => void)
      | undefined;

    if (isBrowserEnvironment()) {
      onDownloadProgress = (progressEvent: AxiosProgressEvent) => {
        if (
          progressSubscriber$ !== undefined &&
          progressEvent.total !== undefined
        ) {
          const progress = Math.floor(
            (progressEvent.loaded * 100) / progressEvent.total
          );

          progressSubscriber$.next(progress);
        }
      };
    }

    return this.context.http.get<DownloadResponse>(downloadUrl, {
      responseType,
      onDownloadProgress,
    });
  }
}

export { Files };
