import {
  from,
  mergeMap,
  Observable,
  of,
  retry,
  switchMap,
  toArray,
} from "rxjs";

import Context from "../core/Context";
import HttpService from "../core/HttpService";
import { Metadata } from "../types/base";
import { Abortable, ObservablePromise } from "../types/core";
import { FileDetail, FileRecordQueryParams } from "../types/files";
import { isRequired, IS_NODE_ENVIRONMENT } from "../utils/core";

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
  block: Blob | ArrayBuffer;
  order: number;
  hash?: string;
}

export interface FileUploadOptions extends Abortable {
  maxRetries: number;
  maxConcurrency: number;
}

export interface FileUploadParams extends FileRecordQueryParams {
  sidedrawerId: string;
  recordId: string;
  file: File | Blob;
  metadata?: Metadata;
}

const MAX_CHUNK_SIZE_BYTES = 4 * 1024 * 1024;

class UploadProcess {
  private sidedrawerId: string;
  private recordId: string;
  private httpService: HttpService;
  private file: File | Blob;

  constructor({
    httpService,
    file,
    sidedrawerId,
    recordId,
  }: UploadProcessParams) {
    this.httpService = httpService;
    this.file = file;
    this.sidedrawerId = sidedrawerId;
    this.recordId = recordId;
  }

  private async getBlock(blob: Blob): Promise<Blob | ArrayBuffer> {
    let block: Blob | ArrayBuffer = blob;

    if (IS_NODE_ENVIRONMENT) {
      block = await blob.arrayBuffer();
    }

    return block;
  }

  private createBlocks(): Observable<UploadProcessBlock> {
    return new Observable<UploadProcessBlock>((subscriber) => {
      let start = 0;
      let end = 0;
      let order = 1;

      const emitChunk = () => {
        end = start + MAX_CHUNK_SIZE_BYTES;

        const blob = this.file.slice(start, end);

        this.getBlock(blob)
          .then((block) => {
            subscriber.next({
              block,
              order,
            } satisfies UploadProcessBlock);

            start = end;
            order += 1;

            if (start < this.file.size) {
              emitChunk();
            } else {
              subscriber.complete();
            }
          })
          .catch((err) => {
            subscriber.error(err);
          });
      };

      emitChunk();
    });
  }

  private uploadBlock(
    uploadProcessBlock: UploadProcessBlock,
    signal?: AbortSignal
  ): Observable<UploadProcessBlock> {
    const { sidedrawerId, recordId } = this;

    return this.httpService
      .post<UploadResponse>(
        `/api/v2/blocks/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}/upload`,
        {
          block: uploadProcessBlock.block,
        },
        {
          params: {
            order: uploadProcessBlock.order,
          },
          headers: {
            "Content-Type": "multipart/form-data",
          },
          signal,
        }
      )
      .pipe(
        switchMap(({ order, hash }) => {
          uploadProcessBlock.order = order;
          uploadProcessBlock.hash = hash;

          return of(uploadProcessBlock);
        })
      );
  }

  public upload({
    record,
    metadata,
    options,
  }: {
    record: FileRecordQueryParams;
    metadata?: Metadata;
    options: FileUploadOptions;
  }): Observable<FileDetail> {
    return this.createBlocks().pipe(
      mergeMap((block) => {
        return from(
          this.uploadBlock(block, options.signal).pipe(
            retry(options.maxRetries)
          )
        );
      }, options.maxConcurrency),
      toArray(),
      switchMap((blocks: UploadProcessBlock[]) => {
        blocks.sort((a, b) => a.order - b.order);

        return from(
          this.createRecord({
            blocks,
            record,
            metadata,
          })
        );
      })
    );
  }

  private createRecord({
    blocks,
    record,
    metadata,
  }: {
    blocks: UploadProcessBlock[];
    record: FileRecordQueryParams;
    metadata?: Metadata;
  }) {
    const blocksData = blocks.map(({ hash, order }) => {
      return {
        hash,
        order,
      };
    });

    let metadataJSON;

    if (metadata) {
      metadataJSON = JSON.stringify(metadata);
    }

    return this.httpService.post<FileDetail>(
      `/api/v2/record-files/sidedrawer/sidedrawer-id/${this.sidedrawerId}/records/record-id/${this.recordId}/record-files`,
      {
        metadata: metadataJSON,
        blocks: JSON.stringify(blocksData),
      },
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        params: record,
      }
    );
  }
}

const DEFAULT_FILE_UPLOAD_OPTIONS = {
  maxRetries: 2,
  maxConcurrency: 4,
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
  ): ObservablePromise<FileDetail> {
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
      ...options
    } = params;

    const optionsWithDefaults = {
      ...DEFAULT_FILE_UPLOAD_OPTIONS,
      ...options,
    } satisfies FileUploadOptions;

    const uploadProcess = new UploadProcess({
      httpService: this.context.http,
      sidedrawerId,
      recordId,
      file,
    });

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
      options: optionsWithDefaults,
    });
  }
}

export { Files };
