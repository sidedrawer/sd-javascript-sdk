import { Observable } from "rxjs";

import { HttpServiceError } from "./HttpServiceError";
import {
  HttpRequestConfig,
  HttpServiceConfig,
  SdkProgressEvent,
} from "./types/HttpRequestConfig";

const privateScope = new WeakMap<FetchHttpService, HttpServiceConfig>();

function appendParams(
  url: string,
  params?: Record<string, unknown>
): string {
  if (params == null || Object.keys(params).length === 0) {
    return url;
  }

  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value == null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, String(item));
      }
    } else {
      search.append(key, String(value));
    }
  }

  const query = search.toString();
  if (!query) {
    return url;
  }

  return url.includes("?") ? `${url}&${query}` : `${url}?${query}`;
}

function buildUrl(
  defaults: HttpServiceConfig,
  config: HttpRequestConfig
): string {
  const { baseURL } = defaults;
  let { url = "" } = config;

  if (/^https?:\/\//i.test(url)) {
    return appendParams(url, config.params);
  }

  if (baseURL) {
    const base = baseURL.replace(/\/$/, "");
    const path = url.replace(/^\//, "");
    url = path ? `${base}/${path}` : base;
  }

  return appendParams(url, config.params);
}

function mergeHeaders(
  defaults: HttpServiceConfig,
  config: HttpRequestConfig,
  body: BodyInit | undefined
): Record<string, string> {
  const headers: Record<string, string> = {
    ...defaults.headers,
    ...config.headers,
  };

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (isFormData) {
    delete headers["Content-Type"];
    delete headers["content-type"];
  }

  return headers;
}

function buildBody(
  data: unknown,
  headers: Record<string, string>
): BodyInit | undefined {
  if (data == null) {
    return undefined;
  }

  if (
    typeof FormData !== "undefined" &&
    data instanceof FormData
  ) {
    return data;
  }

  if (
    typeof Blob !== "undefined" &&
    data instanceof Blob
  ) {
    return data;
  }

  if (
    typeof ArrayBuffer !== "undefined" &&
    (data instanceof ArrayBuffer || ArrayBuffer.isView(data))
  ) {
    return data as BodyInit;
  }

  const contentType =
    headers["Content-Type"] ?? headers["content-type"] ?? "";

  if (
    contentType.includes("application/json") ||
    typeof data === "object"
  ) {
    return JSON.stringify(data);
  }

  return String(data);
}

function errorCodeForStatus(status: number): string {
  if (status >= 500) {
    return "ERR_BAD_RESPONSE";
  }

  if (status >= 400) {
    return "ERR_BAD_REQUEST";
  }

  return "ERR_BAD_RESPONSE";
}

function toHttpServiceError(
  message: string,
  code: string | undefined,
  request: unknown,
  response: unknown
): HttpServiceError {
  return new HttpServiceError(message, code, request, response);
}

async function parseResponseBody(
  response: Response,
  responseType: HttpRequestConfig["responseType"],
  onDownloadProgress?: (event: SdkProgressEvent) => void
): Promise<unknown> {
  const type = responseType ?? "json";

  if (type === "blob") {
    return response.blob();
  }

  if (type === "arraybuffer") {
    const buffer = await response.arrayBuffer();

    if (typeof Buffer !== "undefined") {
      return Buffer.from(buffer);
    }

    return buffer;
  }

  if (type === "text") {
    return response.text();
  }

  if (onDownloadProgress && response.body) {
    const contentLength = response.headers.get("Content-Length");
    const total = contentLength ? parseInt(contentLength, 10) : undefined;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (value) {
        chunks.push(value);
        loaded += value.byteLength;
        onDownloadProgress({ loaded, total });
      }
    }

    const merged = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const text = new TextDecoder().decode(merged);
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function headersToRecord(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function mergeAbortSignals(
  signals: AbortSignal[],
  timeoutMs?: number
): AbortSignal {
  if (timeoutMs != null && timeoutMs > 0) {
    if (typeof AbortSignal.timeout === "function") {
      signals.push(AbortSignal.timeout(timeoutMs));
    } else {
      const timeoutController = new AbortController();
      setTimeout(() => timeoutController.abort(), timeoutMs);
      signals.push(timeoutController.signal);
    }
  }

  const valid = signals.filter(Boolean);
  if (valid.length === 0) {
    return new AbortController().signal;
  }

  if (valid.length === 1) {
    return valid[0];
  }

  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(valid);
  }

  const merged = new AbortController();
  const onAbort = () => merged.abort();

  for (const signal of valid) {
    if (signal.aborted) {
      merged.abort();
      break;
    }
    signal.addEventListener("abort", onAbort);
  }

  return merged.signal;
}

function xhrRequest<T>(
  url: string,
  init: RequestInit,
  config: HttpRequestConfig
): Promise<{ data: T; status: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(init.method ?? "GET", url, true);

    const headers = init.headers as Record<string, string> | undefined;
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value);
      }
    }

    xhr.responseType = "text";

    if (config.onUploadProgress) {
      xhr.upload.onprogress = (event) => {
        config.onUploadProgress?.({
          loaded: event.loaded,
          total: event.total || undefined,
        });
      };
    }

    const signal = init.signal;
    if (signal) {
      if (signal.aborted) {
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", () => {
        xhr.abort();
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      });
    }

    xhr.onload = () => {
      const responseHeaders: Record<string, string> = {};
      const raw = xhr.getAllResponseHeaders().trim();
      if (raw) {
        for (const line of raw.split(/[\r\n]+/)) {
          const idx = line.indexOf(":");
          if (idx > 0) {
            responseHeaders[line.slice(0, idx).trim().toLowerCase()] = line
              .slice(idx + 1)
              .trim();
          }
        }
      }

      const response = {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: responseHeaders,
        data: xhr.responseText,
      };

      if (xhr.status >= 200 && xhr.status < 300) {
        let data: unknown = xhr.responseText;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          /* plain text */
        }
        resolve({ data: data as T, status: xhr.status });
        return;
      }

      reject(
        toHttpServiceError(
          `Request failed with status code ${xhr.status}`,
          errorCodeForStatus(xhr.status),
          { url, method: init.method },
          response
        )
      );
    };

    xhr.onerror = () => {
      reject(
        toHttpServiceError(
          "Network Error",
          "ERR_NETWORK",
          { url, method: init.method },
          undefined
        )
      );
    };

    xhr.onabort = () => {
      reject(
        toHttpServiceError(
          "Request aborted",
          "ERR_CANCELED",
          { url, method: init.method },
          undefined
        )
      );
    };

    xhr.send(init.body as Document | XMLHttpRequestBodyInit | null);
  });
}

export default class FetchHttpService {
  constructor(config?: HttpServiceConfig) {
    privateScope.set(this, {
      baseURL: config?.baseURL,
      headers: config?.headers ?? {},
      timeout: config?.timeout,
    });
  }

  private get defaults(): HttpServiceConfig {
    return privateScope.get(this) as HttpServiceConfig;
  }

  private _requestWrapper<T>(config: HttpRequestConfig): Observable<T> {
    return new Observable<T>((subscriber) => {
      const innerController = new AbortController();
      let abortable = true;

      const outerSignal = config.signal;

      if (outerSignal !== undefined) {
        if (outerSignal.aborted) {
          innerController.abort();
        } else {
          const outerSignalHandler = () => {
            if (!innerController.signal.aborted) {
              innerController.abort();
            }

            if (!subscriber.closed) {
              subscriber.error(
                toHttpServiceError(
                  "canceled",
                  "ERR_CANCELED",
                  undefined,
                  undefined
                )
              );
            }
          };

          outerSignal.addEventListener("abort", outerSignalHandler);
          subscriber.add(() => {
            outerSignal.removeEventListener("abort", outerSignalHandler);
          });
        }
      }

      const mergedSignal = mergeAbortSignals(
        [innerController.signal, outerSignal].filter(
          (s): s is AbortSignal => s != null
        ),
        this.defaults.timeout
      );

      const perRequestConfig: HttpRequestConfig = {
        ...config,
        signal: mergedSignal,
      };

      const run = async () => {
        try {
          const data = await this.executeRequest<T>(perRequestConfig);
          abortable = false;
          subscriber.next(data);
          subscriber.complete();
        } catch (err) {
          abortable = false;
          subscriber.error(err);
        }
      };

      run();

      return () => {
        if (abortable) {
          innerController.abort();
        }
      };
    });
  }

  private async executeRequest<T>(
    config: HttpRequestConfig
  ): Promise<T> {
    const url = buildUrl(this.defaults, config);
    const method = (config.method ?? "get").toUpperCase();
    const headers = mergeHeaders(
      this.defaults,
      config,
      config.data as BodyInit | undefined
    );
    const body = buildBody(config.data, headers);

    const init: RequestInit = {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : body,
      signal: config.signal,
    };

    if (config.onUploadProgress && typeof XMLHttpRequest !== "undefined") {
      const { data } = await xhrRequest<T>(url, init, config);
      return data;
    }

    let response: Response;

    try {
      response = await fetch(url, init);
    } catch (err: unknown) {
      if (config.signal?.aborted) {
        throw toHttpServiceError(
          "canceled",
          "ERR_CANCELED",
          { url, method },
          undefined
        );
      }

      const message =
        err instanceof Error ? err.message : "Network Error";
      const cause = (err as { cause?: { code?: string } })?.cause;
      const isAbort =
        err instanceof Error &&
        (err.name === "AbortError" ||
          message.toLowerCase().includes("abort") ||
          message.toLowerCase().includes("cancel"));

      if (isAbort) {
        throw toHttpServiceError(
          message.toLowerCase().includes("cancel")
            ? message
            : "canceled",
          "ERR_CANCELED",
          { url, method },
          undefined
        );
      }

      const code =
        message.includes("ECONNREFUSED") ||
        (err as NodeJS.ErrnoException)?.code === "ECONNREFUSED" ||
        cause?.code === "ECONNREFUSED"
          ? "ECONNREFUSED"
          : "ERR_NETWORK";

      throw toHttpServiceError(
        message || "Network Error",
        code,
        { url, method },
        undefined
      );
    }

    const responseData = await parseResponseBody(
      response,
      config.responseType,
      config.onDownloadProgress
    );

    const responseObject = {
      status: response.status,
      statusText: response.statusText,
      headers: headersToRecord(response.headers),
      data: responseData,
    };

    if (!response.ok) {
      throw toHttpServiceError(
        `Request failed with status code ${response.status}`,
        errorCodeForStatus(response.status),
        { url, method },
        responseObject
      );
    }

    return responseData as T;
  }

  public request<T>(config: HttpRequestConfig): Observable<T> {
    return this._requestWrapper<T>(config);
  }

  public get<T>(url: string, config?: HttpRequestConfig): Observable<T> {
    return this.request<T>({
      ...config,
      method: "get",
      url,
    });
  }

  public delete<T>(url: string, config?: HttpRequestConfig): Observable<T> {
    return this.request<T>({
      ...config,
      method: "delete",
      url,
    });
  }

  public post<T>(
    url: string,
    data: unknown,
    config?: HttpRequestConfig
  ): Observable<T> {
    return this.request<T>({
      ...config,
      method: "post",
      url,
      data,
    });
  }

  public put<T>(
    url: string,
    data: unknown,
    config?: HttpRequestConfig
  ): Observable<T> {
    return this.request<T>({
      ...config,
      method: "put",
      url,
      data,
    });
  }
}
