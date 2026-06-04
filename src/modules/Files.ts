import {
  catchError,
  from,
  mergeMap,
  Observable,
  of,
  retry,
  retryWhen,
  Subject,
  Subscriber,
  switchMap,
  take,
  tap,
  throwError,
  toArray,
} from "rxjs";

import Context from "../core/Context";
import HttpService, { HttpServiceError } from "../core/HttpService";
import { ExternalKeys, Metadata } from "../types/base";
import { Abortable, ObservablePromise } from "../types/core";
import { FileBlock, RecordFileDetail, RecordFileQueryParams } from "../types/files";
import { isBrowserEnvironment, isRequired } from "../utils/core";
import { generateHash } from "../utils/crypto";
import { SdkProgressEvent } from "../core/types/HttpRequestConfig";

console.log("[SDK Download] version 4");

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
  blocks?: FileBlock[]; // Blocks opcionales - si se proporcionan, se usan para descarga por blocks
}

export type FileDownloadResponseType = "blob" | "arraybuffer";

export interface FileDownloadOptions {
  responseType: FileDownloadResponseType;
  progressSubscriber$?: Subject<number>;
  chunkSizeBytes?: number; // Tamaño de chunk para descarga por partes (default: 4MB)
  useChunks?: boolean; // Si true, fuerza descarga por chunks. Si false, descarga normal. Si undefined, detecta automáticamente
  /** Base URL del API que sirve el stream (ej. blocks API). Si se pasa, las peticiones de stream/chunks usan esta URL en lugar del baseUrl del SDK (gateway). Útil cuando el stream con Range está en otro host. */
  streamBaseUrl?: string;
  /** Si true, no intenta POST /api/v2/blocks/download y va directo al endpoint /stream (Range). Útil cuando el backend aún no devuelve contenido en blocks/download. */
  skipBlocksDownload?: boolean;
  /**
   * Llamado tras cada chunk con los bytes descargados hasta ahora y el blob parcial.
   * Permite a la app acumular y persistir (ej. en IndexedDB) para reanudar de verdad al pausar.
   */
  onChunkDownloaded?: (bytesDownloaded: number, partialBlob: Blob | ArrayBuffer) => void;
  /** AbortSignal para cancelar la descarga (p. ej. al pausar o al detectar pérdida de conexión). */
  signal?: AbortSignal;
}

/**
 * Contexto para reanudar una descarga desde un byte dado.
 * Persistir en sessionStorage (ej. clave sdrw_download_resume_<fileId>) al pausar;
 * usar con downloadFromByte() al reanudar.
 */
export interface FileDownloadFromByteParams {
  sidedrawerId: string;
  recordId: string;
  fileToken: string;
  /** Byte desde el cual reanudar (bytes ya descargados). */
  startByte: number;
  /** Base URL del endpoint /stream (ej. blocks API). Si no se pasa, se usa el baseUrl del SDK. */
  streamBaseUrl?: string;
  responseType?: FileDownloadResponseType;
  progressSubscriber$?: Subject<number>;
  signal?: AbortSignal;
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

  /**
   * Get stream URL from /stream endpoint
   */
  private getStreamUrl(streamUrl: string, signal?: AbortSignal): ObservablePromise<string> {
    return this.context.http.get<{ url: string }>(streamUrl, { signal }).pipe(
      switchMap((response) => {
        if (!response || !response.url) {
          throw new Error("Invalid response from /stream endpoint: missing url");
        }
        console.log("[SDK Download] 🔗 URL de stream obtenida:", response.url);
        return of(response.url);
      })
    );
  }

  /**
   * Try to download by chunks. If it fails (server doesn't support Range), fallback to normal download.
   * We'll attempt to download the first chunk to test Range support, then continue with all chunks.
   */
  private tryDownloadByChunks(
    downloadUrl: string,
    chunkSizeBytes: number,
    responseType: FileDownloadResponseType,
    progressSubscriber$?: Subject<number>,
    isStreamEndpoint: boolean = false,
    onChunkDownloaded?: (bytesDownloaded: number, partialBlob: Blob | ArrayBuffer) => void,
    signal?: AbortSignal
  ): ObservablePromise<DownloadResponse> {
    if (isStreamEndpoint) {
      return this.getStreamUrl(downloadUrl, signal).pipe(
        switchMap((actualUrl) => {
          return this.tryDownloadByChunks(actualUrl, chunkSizeBytes, responseType, progressSubscriber$, false, onChunkDownloaded, signal);
        })
      );
    }
    return this.context.http.get<DownloadResponse>(downloadUrl, {
      responseType,
      headers: {
        Range: `bytes=0-${chunkSizeBytes - 1}`,
      },
      signal,
    }).pipe(
      switchMap((firstChunk: DownloadResponse) => {
        const firstChunkSize = firstChunk instanceof Blob ? firstChunk.size : firstChunk.byteLength;
        
        console.log("[SDK Download] 🔍 Primer chunk recibido:", firstChunkSize, "bytes (esperado:", chunkSizeBytes, "bytes)");
        
        // Caso 1: Recibimos exactamente el tamaño del chunk → servidor soporta Range
        if (firstChunkSize === chunkSizeBytes) {
          console.log("[SDK Download] ✅ Servidor soporta Range Requests, descargando por chunks");
          return this.downloadAllChunks(downloadUrl, chunkSizeBytes, responseType, progressSubscriber$, firstChunk, onChunkDownloaded, signal);
        }
        
        // Caso 2: Recibimos más que el chunk → servidor NO soporta Range (retornó archivo completo)
        if (firstChunkSize > chunkSizeBytes) {
          console.log("[SDK Download] ⚠️ Servidor NO soporta Range (retornó", firstChunkSize, "bytes en lugar del rango). Comprobar en Network: Request Header Range y Response 206 vs 200 + Content-Range.");
          console.log("[SDK Download] 📥 Usando archivo completo recibido");
          if (onChunkDownloaded) {
            onChunkDownloaded(firstChunkSize, firstChunk as Blob | ArrayBuffer);
          }
          if (progressSubscriber$) {
            progressSubscriber$.next(100);
          }
          return of(firstChunk);
        }
        
        // Caso 3: Recibimos menos que el chunk → podría ser archivo pequeño O no soporta Range
        // Pedir el "segundo" rango (bytes después del primer chunk). Si el servidor ignora Range,
        // devuelve el archivo completo otra vez → mismo tamaño que el primer chunk.
        console.log("[SDK Download] 🔍 Archivo pequeño o servidor no soporta Range, verificando con segundo chunk...");
        return this.context.http.get<DownloadResponse>(downloadUrl, {
          responseType,
          headers: {
            Range: `bytes=${chunkSizeBytes}-${chunkSizeBytes * 2 - 1}`,
          },
          signal,
        }).pipe(
          switchMap((secondChunk: DownloadResponse) => {
            const secondChunkSize = secondChunk instanceof Blob ? secondChunk.size : secondChunk.byteLength;
            console.log("[SDK Download] 🔍 Segundo chunk recibido:", secondChunkSize, "bytes");
            
            // Si el segundo chunk tiene el mismo tamaño que el primero, el servidor devolvió
            // el archivo completo en ambas peticiones (ignoró Range) → NO soporta Range.
            if (secondChunkSize === firstChunkSize) {
              console.log("[SDK Download] ⚠️ Servidor NO soporta Range (ambas peticiones devolvieron", firstChunkSize, "bytes). Comprobar en Network: Request Header Range y Response 206 vs 200.");
              if (onChunkDownloaded) {
                onChunkDownloaded(firstChunkSize, firstChunk as Blob | ArrayBuffer);
              }
              if (progressSubscriber$) {
                progressSubscriber$.next(100);
              }
              return of(firstChunk);
            }
            // Segundo chunk distinto y dentro del rango esperado → servidor soporta Range (archivo pequeño)
            if (secondChunkSize > 0 && secondChunkSize <= chunkSizeBytes) {
              console.log("[SDK Download] ✅ Servidor soporta Range Requests (archivo pequeño), descargando por chunks");
              return this.downloadAllChunks(downloadUrl, chunkSizeBytes, responseType, progressSubscriber$, firstChunk, onChunkDownloaded, signal);
            }
            // Segundo chunk 0 o inesperado → usar el primer chunk como archivo completo
            console.log("[SDK Download] ⚠️ Servidor NO soporta Range Requests, usando archivo completo recibido");
            if (onChunkDownloaded) {
              onChunkDownloaded(firstChunkSize, firstChunk as Blob | ArrayBuffer);
            }
            if (progressSubscriber$) {
              progressSubscriber$.next(100);
            }
            return of(firstChunk);
          }),
          catchError(() => {
            console.log("[SDK Download] ⚠️ Error al verificar segundo chunk, usando archivo completo recibido");
            if (onChunkDownloaded) {
              onChunkDownloaded(firstChunkSize, firstChunk as Blob | ArrayBuffer);
            }
            if (progressSubscriber$) {
              progressSubscriber$.next(100);
            }
            return of(firstChunk);
          })
        );
      }),
      // Si hay error, intentar descarga normal
      catchError(() => {
        console.log("[SDK Download] ⚠️ Error en descarga por chunks, intentando descarga normal");
        return this.downloadNormal(downloadUrl, responseType, progressSubscriber$);
      })
    );
  }

  /**
   * Download all chunks after verifying Range support
   */
  private downloadAllChunks(
    downloadUrl: string,
    chunkSizeBytes: number,
    responseType: FileDownloadResponseType,
    progressSubscriber$?: Subject<number>,
    firstChunk?: DownloadResponse,
    onChunkDownloaded?: (bytesDownloaded: number, partialBlob: Blob | ArrayBuffer) => void,
    signal?: AbortSignal
  ): ObservablePromise<DownloadResponse> {
    const chunks: DownloadResponse[] = [];
    const downloadedBytes: { [key: number]: number } = {};
    let chunkIndex = 0;

    const emitPartial = () => {
      if (!onChunkDownloaded || chunks.length === 0) return;
      const totalBytes = chunks.reduce((sum, c) => sum + (c instanceof Blob ? c.size : c.byteLength), 0);
      this.reconstructFile(chunks, responseType)
        .pipe(take(1))
        .subscribe((partial) => onChunkDownloaded(totalBytes, partial as Blob | ArrayBuffer));
    };

    if (firstChunk) {
      const firstChunkSize = firstChunk instanceof Blob ? firstChunk.size : firstChunk.byteLength;
      chunks.push(firstChunk);
      downloadedBytes[0] = firstChunkSize;
      chunkIndex = 1;
      console.log(`[SDK Download] ✅ Chunk 1 descargado: ${firstChunkSize} bytes`);
      emitPartial();
      if (firstChunkSize < chunkSizeBytes) {
        console.log("[SDK Download] 🔗 Archivo completo descargado en un solo chunk");
        if (progressSubscriber$) {
          progressSubscriber$.next(100);
        }
        return of(firstChunk);
      }
    }
    
    // Estrategia: descargar chunks secuencialmente hasta que uno sea menor que chunkSizeBytes
    const downloadNextChunk = (start: number): ObservablePromise<DownloadResponse> => {
      const end = start + chunkSizeBytes - 1;
      
      return this.context.http.get<DownloadResponse>(downloadUrl, {
        responseType,
        headers: {
          Range: `bytes=${start}-${end}`,
        },
        signal,
        onDownloadProgress: isBrowserEnvironment() ? (progressEvent: SdkProgressEvent) => {
          if (progressEvent.loaded !== undefined && progressSubscriber$) {
            downloadedBytes[chunkIndex] = progressEvent.loaded;
            // Estimamos el progreso basado en chunks descargados
            const estimatedProgress = Math.min(95, Math.round((chunkIndex / (chunkIndex + 1)) * 100));
            progressSubscriber$.next(estimatedProgress);
          }
        } : undefined,
      }).pipe(
        switchMap((chunk: DownloadResponse) => {
          const chunkSize = chunk instanceof Blob ? chunk.size : chunk.byteLength;
          downloadedBytes[chunkIndex] = chunkSize;
          if (chunkSize > 0) {
            chunks.push(chunk);
            emitPartial();
          }
          console.log(`[SDK Download] ✅ Chunk ${chunkIndex + 1} descargado: ${chunkSize} bytes`);
          if (chunkSize === 0 || chunkSize < chunkSizeBytes) {
            console.log("[SDK Download] 🔗 Reconstruyendo archivo completo...");
            if (progressSubscriber$) {
              progressSubscriber$.next(100);
            }
            return this.reconstructFile(chunks, responseType);
          }
          chunkIndex++;
          return downloadNextChunk(start + chunkSizeBytes);
        }),
        // No reintentar: error de red (sin respuesta o status 0) o 4xx → fallar de inmediato
        retryWhen((errors) =>
          errors.pipe(
            mergeMap((err) => {
              const e = err as HttpServiceError & { response?: { status?: number }; code?: string };
              const status = e?.response?.status;
              const isNetworkError = status === undefined || status === 0 || e?.code === "ERR_NETWORK";
              const is4xx = typeof status === "number" && status >= 400 && status < 500;
              if (isNetworkError || is4xx) {
                return throwError(() => err);
              }
              return throwError(() => err);
            })
          )
        ),
        catchError((err: HttpServiceError & { response?: { status?: number; data?: unknown } }) => {
          const status = err?.response?.status;
          if (status === 401) {
            console.warn("[SDK Download] ⚠️ 401 Unauthorized en un chunk - el token pudo haber expirado durante la descarga.");
            return throwError(
              () =>
                new Error(
                  "Unauthorized (401) durante la descarga por chunks. El token pudo haber expirado; intentá refrescar sesión y volver a descargar."
                )
            );
          }
          // 416 Range Not Satisfiable = pedimos bytes pasados del final del archivo; ya tenemos todo
          if (status === 416) {
            console.log("[SDK Download] 🔗 Rango pasado del final (416), reconstruyendo archivo con chunks descargados.");
            if (progressSubscriber$) {
              progressSubscriber$.next(100);
            }
            return this.reconstructFile(chunks, responseType);
          }
          return throwError(() => err);
        })
      );
    };
    
    // Si ya descargamos el primer chunk, empezar desde el segundo
    return downloadNextChunk(firstChunk ? chunkSizeBytes : 0);
  }

  /**
   * Descarga un archivo. Opciones pueden ir en params o en el segundo argumento.
   * Si se pasa options (segundo argumento), se aplican en todo el flujo (/stream, fallback, chunks).
   * Con skipBlocksDownload: true no se llama a POST /api/v2/blocks/download; se usa solo /stream con Range.
   */
  public download(
    params: FileDownloadParams & Partial<FileDownloadOptions>,
    options?: Partial<FileDownloadOptions>
  ): ObservablePromise<DownloadResponse> {
    const {
      sidedrawerId = isRequired("sidedrawerId"),
      recordId = isRequired("recordId"),
      fileNameWithExtension,
      fileToken,
      ...paramsRest
    } = params;

    // Unir opciones: defaults + lo que venga en params + segundo argumento (options gana)
    const mergedOptions: Partial<FileDownloadOptions> = {
      responseType: isBrowserEnvironment() ? "blob" : "arraybuffer",
      chunkSizeBytes: 4 * 1024 * 1024, // 4MB default solo si no se especifica
      ...paramsRest,
      ...options,
    };

    const {
      responseType = isBrowserEnvironment() ? "blob" : "arraybuffer",
      progressSubscriber$,
      chunkSizeBytes = 4 * 1024 * 1024,
      useChunks,
      streamBaseUrl,
      skipBlocksDownload,
      onChunkDownloaded,
      signal,
    } = mergedOptions;

    let downloadUrl: string;
    let streamUrl: string | undefined;

    if (fileToken) {
      downloadUrl = `/api/v2/record-files/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}/record-files/${fileToken}`;
      // Endpoint de stream disponible para v2 con fileToken
      streamUrl = `/api/v2/record-files/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}/record-files/${fileToken}/stream`;
    } else if (fileNameWithExtension) {
      downloadUrl = `/api/v1/record-files/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}/record-files/${fileNameWithExtension}`;
      // Endpoint de stream también disponible para v1
      streamUrl = `/api/v1/record-files/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}/record-files/${fileNameWithExtension}/stream`;
    } else {
      return isRequired("fileNameWithExtension or fileToken");
    }

    const base = streamBaseUrl ? streamBaseUrl.replace(/\/$/, "") : "";
    const streamUrlToUse = base ? base + streamUrl : streamUrl!;
    const downloadUrlToUse = base ? base + downloadUrl : downloadUrl;

    if (useChunks === false) {
      console.log("[SDK Download] 📥 Descargando archivo completo (modo normal - useChunks=false)");
      return this.downloadNormal(downloadUrlToUse, responseType, progressSubscriber$, signal);
    }

    if (useChunks === true || useChunks === undefined) {
      // skipBlocksDownload: true → no llamar a blocks; ir directo a /stream con Range
      if (skipBlocksDownload === true) {
        console.log("[SDK Download] 📦 skipBlocksDownload=true → usando solo /stream con Range (chunk size:", chunkSizeBytes, "bytes)");
        return this.tryDownloadByChunks(streamUrlToUse || downloadUrlToUse, chunkSizeBytes, responseType, progressSubscriber$, false, onChunkDownloaded, signal).pipe(
          catchError(() => {
            console.log("[SDK Download] ⚠️ Endpoint /stream falló, intentando con endpoint normal");
            return this.tryDownloadByChunks(downloadUrlToUse, chunkSizeBytes, responseType, progressSubscriber$, false, onChunkDownloaded, signal);
          })
        );
      }
      // fileToken y no skipBlocksDownload: intentar blocks primero, luego fallback a /stream
      if (fileToken && !skipBlocksDownload) {
        console.log("[SDK Download] 📦 Intentando descarga por blocks usando POST /api/v2/blocks/download");
        return this.downloadByBlocks(sidedrawerId, recordId, fileToken, responseType, progressSubscriber$, signal).pipe(
          catchError((error) => {
            console.log("[SDK Download] ⚠️ Error en descarga por blocks, intentando con endpoint /stream:", error);
            if (streamUrl) {
              console.log("[SDK Download] 📡 Enviando Range al endpoint /stream del API (W3C bytes=n-m)");
              return this.tryDownloadByChunks(streamUrlToUse, chunkSizeBytes, responseType, progressSubscriber$, false, onChunkDownloaded, signal).pipe(
                catchError(() => {
                  console.log("[SDK Download] ⚠️ Range en /stream falló, intentando con URL de gateway");
                  return this.getStreamUrl(streamUrl!, signal).pipe(
                    switchMap((actualStreamUrl) => {
                      return this.tryDownloadByChunks(actualStreamUrl, chunkSizeBytes, responseType, progressSubscriber$, false, onChunkDownloaded, signal);
                    }),
                    catchError(() => {
                      console.log("[SDK Download] ⚠️ Endpoint /stream no disponible, intentando con Range en endpoint normal");
                      return this.tryDownloadByChunks(downloadUrlToUse, chunkSizeBytes, responseType, progressSubscriber$, false, onChunkDownloaded, signal);
                    })
                  );
                })
              );
            } else {
              return this.tryDownloadByChunks(downloadUrlToUse, chunkSizeBytes, responseType, progressSubscriber$, false, onChunkDownloaded, signal);
            }
          })
        );
      }

      console.log("[SDK Download] 📦 Intentando descarga por chunks: Range en endpoint /stream (chunk size:", chunkSizeBytes, "bytes)");
      return this.tryDownloadByChunks(streamUrlToUse || downloadUrlToUse, chunkSizeBytes, responseType, progressSubscriber$, false, onChunkDownloaded, signal).pipe(
        catchError(() => {
          console.log("[SDK Download] ⚠️ Endpoint /stream no disponible, intentando con Range Requests en endpoint normal");
          return this.tryDownloadByChunks(downloadUrlToUse, chunkSizeBytes, responseType, progressSubscriber$, false, onChunkDownloaded, signal);
        })
      );
    }

    return this.downloadNormal(downloadUrlToUse, responseType, progressSubscriber$, signal);
  }

  /**
   * Descarga desde un byte dado hasta el final (para reanudar).
   * Usa Range: bytes=startByte- contra el endpoint /stream.
   * MY puede persistir resumeContext (sidedrawerId, recordId, fileToken, bytesDownloaded) al pausar
   * y llamar a este método con startByte = bytesDownloaded al reanudar.
   * Para reanudar de verdad hay que concatenar el blob parcial guardado (0..startByte-1) con el resultado.
   */
  public downloadFromByte(
    params: FileDownloadFromByteParams
  ): ObservablePromise<DownloadResponse> {
    const {
      sidedrawerId,
      recordId,
      fileToken,
      startByte,
      streamBaseUrl,
      responseType = isBrowserEnvironment() ? "blob" : "arraybuffer",
      progressSubscriber$,
      signal,
    } = params;

    const streamPath = `/api/v2/record-files/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}/record-files/${fileToken}/stream`;
    const base = streamBaseUrl ? streamBaseUrl.replace(/\/$/, "") : "";
    const url = base ? base + streamPath : streamPath;

    let onDownloadProgress: ((progressEvent: SdkProgressEvent) => void) | undefined;
    if (isBrowserEnvironment() && progressSubscriber$) {
      onDownloadProgress = (progressEvent: SdkProgressEvent) => {
        if (progressEvent.total != null && progressEvent.total > 0) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          progressSubscriber$.next(progress);
        }
      };
    }

    return this.context.http.get<DownloadResponse>(url, {
      responseType,
      headers: {
        Range: `bytes=${startByte}-`,
      },
      onDownloadProgress,
      signal,
    });
  }

  /**
   * Download file normally (without chunks)
   */
  private downloadNormal(
    downloadUrl: string,
    responseType: FileDownloadResponseType,
    progressSubscriber$?: Subject<number>,
    signal?: AbortSignal
  ): ObservablePromise<DownloadResponse> {
    let onDownloadProgress:
      | ((progressEvent: SdkProgressEvent) => void)
      | undefined;

    if (isBrowserEnvironment()) {
      onDownloadProgress = (progressEvent: SdkProgressEvent) => {
        if (
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

    return this.context.http.get<DownloadResponse>(downloadUrl, {
      responseType,
      onDownloadProgress,
      signal,
    });
  }

  /**
   * Reconstruct file from chunks
   */
  private reconstructFile(
    chunks: DownloadResponse[],
    responseType: FileDownloadResponseType
  ): ObservablePromise<DownloadResponse> {
    return from(
      Promise.all(
        chunks.map((chunk) => {
          if (chunk instanceof Blob) {
            return chunk.arrayBuffer();
          }
          return Promise.resolve(chunk);
        })
      )
    ).pipe(
      switchMap((buffers: ArrayBuffer[]) => {
        // Concatenar todos los ArrayBuffers
        const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
        const result = new Uint8Array(totalLength);
        
        let offset = 0;
        for (const buffer of buffers) {
          result.set(new Uint8Array(buffer), offset);
          offset += buffer.byteLength;
        }

        // Convertir a Blob o ArrayBuffer según responseType
        if (responseType === "blob" && isBrowserEnvironment()) {
          return of(new Blob([result.buffer]));
        }
        
        return of(result.buffer);
      })
    );
  }

  /**
   * Test if the backend supports HTTP Range Requests for file downloads.
   * This method makes a GET request with a Range header requesting only the first 1024 bytes.
   * If the server supports Range Requests, it will return exactly 1024 bytes (status 206).
   * If not, it will return the full file (status 200).
   *
   * @param params File download parameters
   * @returns Observable that emits true if Range Requests are supported, false otherwise
   */
  public testRangeRequestSupport(
    params: FileDownloadParams
  ): ObservablePromise<boolean> {
    const {
      sidedrawerId = isRequired("sidedrawerId"),
      recordId = isRequired("recordId"),
      fileNameWithExtension,
      fileToken,
    } = params;

    let downloadUrl;

    if (fileToken) {
      downloadUrl = `/api/v2/record-files/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}/record-files/${fileToken}`;
    } else if (fileNameWithExtension) {
      downloadUrl = `/api/v1/record-files/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}/record-files/${fileNameWithExtension}`;
    } else {
      return isRequired("fileNameWithExtension or fileToken");
    }

    // Request only the first 1024 bytes (0-1023) to test Range support
    const responseType = isBrowserEnvironment() ? "blob" : "arraybuffer";
    
    return this.context.http.get<DownloadResponse>(downloadUrl, {
      responseType,
      headers: {
        Range: "bytes=0-1023",
      },
    }).pipe(
      switchMap((data: DownloadResponse) => {
        // Check if we got exactly 1024 bytes (indicating Range Request support)
        // If the server doesn't support Range, it will return the full file
        let size: number;
        
        if (data instanceof Blob) {
          size = data.size;
        } else if (data instanceof ArrayBuffer) {
          size = data.byteLength;
        } else {
          size = 0;
        }
        
        // If we got exactly 1024 bytes, the server likely supports Range Requests
        // (Note: This is a heuristic - ideally we'd check for status 206, but HttpService
        // doesn't expose the full response. A more accurate test would require direct axios access)
        const supportsRange = size === 1024;
        
        console.log("[SDK Range Test] Response size:", size, "bytes");
        console.log("[SDK Range Test] Expected size (if Range supported):", 1024, "bytes");
        console.log("[SDK Range Test] Supports Range Requests:", supportsRange);
        console.log("[SDK Range Test] ⚠️ Note: This is a heuristic test. For accurate results, check server response headers manually.");
        
        return of(supportsRange);
      })
    ) as ObservablePromise<boolean>;
  }

  /**
   * Download a specific byte range of a file using HTTP Range Requests.
   * This method requires the backend to support Range Requests (HTTP 206 Partial Content).
   *
   * @param params File download parameters
   * @param rangeStart Start byte position (inclusive)
   * @param rangeEnd End byte position (inclusive), or undefined for end of file
   * @returns Observable that emits the requested byte range as ArrayBuffer or Blob
   */
  public downloadRange(
    params: FileDownloadParams & Partial<FileDownloadOptions>,
    rangeStart: number,
    rangeEnd?: number
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

    // Build Range header: "bytes=start-end" or "bytes=start-" for end of file
    const rangeHeader = rangeEnd !== undefined 
      ? `bytes=${rangeStart}-${rangeEnd}`
      : `bytes=${rangeStart}-`;

    console.log("[SDK Download Range] Requesting range:", rangeHeader);

    let onDownloadProgress:
      | ((progressEvent: SdkProgressEvent) => void)
      | undefined;

    if (isBrowserEnvironment()) {
      onDownloadProgress = (progressEvent: SdkProgressEvent) => {
        if (
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

    return this.context.http.get<DownloadResponse>(downloadUrl, {
          responseType,
          onDownloadProgress,
      headers: {
        Range: rangeHeader,
      },
    });
  }

  /**
   * Get RecordFileDetail to obtain blocks information
   */
  private getRecordFileDetail(
    sidedrawerId: string,
    recordId: string,
    fileToken: string
  ): ObservablePromise<RecordFileDetail> {
    const url = `/api/v2/record-files/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}/record-files/${fileToken}/recordfile-details`;
    
    return this.context.http.get<RecordFileDetail>(url);
  }

  /**
   * Download file by blocks using POST /api/v2/blocks/download
   * This is the native backend method for downloading files by chunks
   */
  private downloadByBlocks(
    sidedrawerId: string,
    recordId: string,
    fileToken: string,
    responseType: FileDownloadResponseType,
    progressSubscriber$?: Subject<number>,
    signal?: AbortSignal
  ): ObservablePromise<DownloadResponse> {
    // Primero obtener los blocks del archivo
    return this.getRecordFileDetail(sidedrawerId, recordId, fileToken).pipe(
      switchMap((fileDetail: RecordFileDetail) => {
        if (!fileDetail.blocks || fileDetail.blocks.length === 0) {
          throw new Error("File has no blocks information");
        }

        console.log(`[SDK Download] 📊 Archivo tiene ${fileDetail.blocks.length} blocks`);

        // Preparar request body para POST /api/v2/blocks/download
        // Según el Swagger, el endpoint espera un array de objetos con hash y order
        const blocks = fileDetail.blocks.map(block => ({
          hash: block.hash,
          order: block.order,
        }));

        // El endpoint probablemente espera solo el array de blocks, sin boundary ni provider
        const requestBody = {
          blocks,
        };

        console.log("[SDK Download] 📤 Enviando request a POST /api/v2/blocks/download con", blocks.length, "blocks");
        console.log("[SDK Download] 📤 Request body:", JSON.stringify(requestBody, null, 2));

        // Descargar todos los blocks.
        // En Swagger el endpoint suele devolver el archivo en BINARIO (application/octet-stream).
        // Si pedimos responseType "json", el cliente interpreta binario como texto y queda string vacío.
        // Pedimos el mismo responseType que el caller (blob/arraybuffer) para recibir el archivo tal cual.
        return this.context.http.post<DownloadResponse>(
          `/api/v2/blocks/download`,
          requestBody,
          {
            responseType,
            headers: {
              "Content-Type": "application/json",
            },
            signal,
          }
        ).pipe(
          switchMap((response) => {
            // Respuesta binaria (archivo completo): igual que en Swagger
            const isBlob = typeof Blob !== "undefined" && response instanceof Blob;
            const isArrayBuffer = response instanceof ArrayBuffer;
            if (isBlob && (response as Blob).size > 0) {
              console.log("[SDK Download] ✅ POST /api/v2/blocks/download devolvió archivo binario (Blob), size:", (response as Blob).size);
              return of(response as DownloadResponse);
            }
            if (isArrayBuffer && (response as ArrayBuffer).byteLength > 0) {
              console.log("[SDK Download] ✅ POST /api/v2/blocks/download devolvió archivo binario (ArrayBuffer), size:", (response as ArrayBuffer).byteLength);
              return of(response as DownloadResponse);
            }

            // Cuerpo vacío (ej. 204 o backend no devuelve binario aquí)
            if ((isBlob && (response as Blob).size === 0) || (isArrayBuffer && (response as ArrayBuffer).byteLength === 0)) {
              console.warn("[SDK Download] ⚠️ POST /api/v2/blocks/download devolvió cuerpo vacío; usando endpoint /stream como fallback.");
              throw new Error("Empty response from blocks/download endpoint - using /stream fallback");
            }

            // Respuesta string vacía (cuando el cliente pidió json y el servidor mandó binario, a veces se lee vacío)
            if (typeof response === "string" && response === "") {
              console.warn("[SDK Download] ⚠️ POST /api/v2/blocks/download devolvió string vacío; usando endpoint /stream como fallback.");
              throw new Error("Empty string response from blocks/download endpoint - using /stream fallback");
            }

            // Respuesta JSON (algunos backends devuelven { block: base64, order } o array de blocks)
            let responses: { block: string; fileToken: string; order: number }[] | undefined;
            
            // Validar que la respuesta existe
            if (response === null || response === undefined) {
              console.error("[SDK Download] ❌ Respuesta null o undefined del endpoint blocks/download");
              throw new Error("Empty response from blocks/download endpoint");
            }
            
            // Verificar si es un array
            if (Array.isArray(response)) {
              responses = response;
              console.log("[SDK Download] ✅ Respuesta es un array con", responses.length, "elementos");
            } 
            // Verificar si es un objeto con la propiedad 'block'
            else if (response && typeof response === 'object' && 'block' in response) {
              // Si es un solo objeto, convertirlo a array
              responses = [response as unknown as { block: string; fileToken: string; order: number }];
              console.log("[SDK Download] ✅ Respuesta es un objeto individual, convertido a array");
            } 
            // Si es un objeto pero no tiene 'block', puede ser un objeto con un array dentro
            else if (response && typeof response === 'object') {
              // Intentar buscar un array dentro del objeto
              const keys = Object.keys(response);
              console.log("[SDK Download] 🔍 Objeto con keys:", keys);
              
              // Buscar si hay alguna propiedad que sea un array
              for (const key of keys) {
                if (Array.isArray((response as any)[key])) {
                  responses = (response as any)[key];
                  console.log("[SDK Download] ✅ Encontrado array en propiedad:", key);
                  break;
                }
              }
            } 
            else {
              console.error("[SDK Download] ❌ Respuesta inesperada del endpoint blocks/download:", response);
              console.error("[SDK Download] ❌ Tipo:", typeof response);
              throw new Error("Invalid response format from blocks/download endpoint");
            }
            
            // Validar que responses fue asignado
            if (!responses) {
              console.error("[SDK Download] ❌ No se encontró array en la respuesta:", response);
              throw new Error("No array found in response from blocks/download endpoint");
            }
            
            // Validar que responses es un array antes de continuar
            if (!Array.isArray(responses)) {
              console.error("[SDK Download] ❌ responses no es un array después de procesamiento:", responses);
              throw new Error("Responses is not an array after processing");
            }
            
            console.log("[SDK Download] ✅ Blocks descargados:", responses.length);
            
            // Si no hay blocks, lanzar error
            if (responses.length === 0) {
              console.error("[SDK Download] ❌ No se recibieron blocks del endpoint");
              throw new Error("No blocks received from blocks/download endpoint");
            }
            
            // Ordenar responses por order
            responses.sort((a, b) => (a.order || 0) - (b.order || 0));
            
            // Convertir cada block (string) a ArrayBuffer/Blob
            // El block viene como string (probablemente base64 o similar)
            return from(
              Promise.all(
                responses.map(async (response) => {
                  // Convertir el string del block a ArrayBuffer
                  // Asumiendo que viene en base64
                  if (isBrowserEnvironment()) {
                    const binaryString = atob(response.block);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                      bytes[i] = binaryString.charCodeAt(i);
                    }
                    return responseType === "blob" ? new Blob([bytes.buffer]) : bytes.buffer;
                  } else {
                    // Node.js
                    const Buffer = require("buffer").Buffer;
                    const buffer = Buffer.from(response.block, "base64");
                    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
                  }
                })
              )
            ).pipe(
              switchMap((chunks: ArrayBuffer[]) => {
                // Reconstruir archivo completo
                console.log("[SDK Download] 🔗 Reconstruyendo archivo completo...");
                if (progressSubscriber$) {
                  progressSubscriber$.next(100);
                }
                return this.reconstructFile(chunks, responseType);
              })
            );
          })
        );
      }),
      catchError((error) => {
        console.log("[SDK Download] ❌ Error en descarga por blocks:", error);
        throw error;
      })
    );
  }
}

export { Files };
