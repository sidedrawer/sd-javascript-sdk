export interface SdkProgressEvent {
  loaded: number;
  total?: number;
}

export interface HttpServiceConfig {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export type HttpResponseType = "json" | "blob" | "arraybuffer" | "text";

export interface HttpRequestConfig {
  url?: string;
  method?: string;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  data?: unknown;
  signal?: AbortSignal;
  responseType?: HttpResponseType;
  onUploadProgress?: (event: SdkProgressEvent) => void;
  onDownloadProgress?: (event: SdkProgressEvent) => void;
  /**
   * Invoked once per streamed chunk while reading binary responses
   * (`blob` / `arraybuffer`). Useful for incremental persistence (e.g.
   * piping a large download to disk / IndexedDB without accumulating the
   * whole file in memory).
   *
   * Only used when streaming is active, which is when at least one of
   * `onDownloadProgress`, `onChunk`, or `discardBuffer` is set and the
   * runtime exposes `Response.body`. Otherwise the body is read in one go
   * and this callback is never invoked.
   */
  onChunk?: (chunk: Uint8Array) => void;
  /**
   * When true, the HTTP layer streams the response body to `onChunk` /
   * `onDownloadProgress` but does NOT accumulate the bytes for the
   * returned value. Intended for memory-safe large downloads where the
   * caller persists chunks elsewhere. The response `data` is `null`.
   *
   * Requires `onChunk` to be useful; without it the data is silently
   * discarded. Only effective for `responseType` `blob` / `arraybuffer`
   * (ignored for `json` / `text`).
   */
  discardBuffer?: boolean;
}

export interface HttpResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}
