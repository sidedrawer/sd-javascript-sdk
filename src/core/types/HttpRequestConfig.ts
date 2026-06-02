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
}
