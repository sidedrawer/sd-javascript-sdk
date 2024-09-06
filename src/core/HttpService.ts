import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  CreateAxiosDefaults,
} from "axios";

import { Observable, concat, mergeMap, of, switchMap } from "rxjs";

interface ApiPaginatedResponse<T> {
  data: Array<T>;
  hasMore: boolean;
  nextPage?: string;
}

export interface PaginatedResponse<T> {
  data: Array<T>;
  hasMore: boolean;
  nextPage(): Observable<PaginatedResponse<T>>;
}

export class HttpServiceError extends Error {
  constructor(
    public message: string,
    public code?: string,
    public request?: unknown,
    public response?: unknown
  ) {
    super(message);
  }
}

const privateScope = new WeakMap();

export default class HttpService {
  /**
   * @param config Axios configurations
   */
  constructor(config?: CreateAxiosDefaults) {
    const axiosInstance: AxiosInstance = axios.create(config);

    privateScope.set(this, {
      axiosInstance,
    });
  }

  private get axios(): AxiosInstance {
    return privateScope.get(this).axiosInstance;
  }

  /**
   * @param config Axios request configuration
   * @returns Observable wrapper for Axios request
   */
  private _requestWrapper<T>(
    config: AxiosRequestConfig
  ): Observable<AxiosResponse<T>> {
    return new Observable<AxiosResponse>((subscriber) => {
      const controller = new AbortController();
      const { signal } = controller;

      let abortable = true;

      const { signal: outerSignal } = config;

      if (outerSignal !== undefined) {
        if (outerSignal.aborted) {
          controller.abort();
        } else {
          const outerSignalHandler = () => {
            if (!signal.aborted) {
              controller.abort();
            }

            if (!subscriber.closed) {
              subscriber.error(signal.reason);
            }
          };

          if (outerSignal.addEventListener) {
            outerSignal.addEventListener("abort", outerSignalHandler);
          }

          subscriber.add(() => {
            if (outerSignal.removeEventListener) {
              outerSignal.removeEventListener("abort", outerSignalHandler);
            }
          });
        }
      }

      const perSubscriberConfig: AxiosRequestConfig = { ...config, signal };

      this.axios
        .request<T>(perSubscriberConfig)
        .then((response) => {
          abortable = false;

          subscriber.next(response);
          subscriber.complete();
        })
        .catch((err: AxiosError) => {
          abortable = false;

          subscriber.error(
            new HttpServiceError(
              err.message,
              err.code,
              err.request,
              err.response
            )
          );
        });

      return () => {
        if (abortable) {
          controller.abort();
        }
      };
    });
  }

  /**
   * @param config Axios request configuration
   * @returns Observable wrapper for Axios request data
   */
  public request<T>(config: AxiosRequestConfig): Observable<T> {
    const request$: Observable<AxiosResponse<T>> =
      this._requestWrapper(config);

    return request$.pipe(
      switchMap((response: AxiosResponse<T>) => {
        return of(response.data);
      })
    );
  }

  /**
   * @param url URL or endpoint
   * @param config Axios request configuration
   * @returns Observable wrapper for Axios request data
   */
  public get<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Observable<T> {
    return this.request<T>({
      ...config,
      method: "get",
      url,
    });
  }

  /**
   * @param url Current url
   * @param nextPageParams Next page params. Example param1=value&param2=value
   * @returns Next page URL
   */
  private getNextPageUrl(url: string, nextPageParams: string): string {
    const nextUrl = new URL(url, this.axios.defaults.baseURL);
    const nextPageSearchParams = new URLSearchParams(nextPageParams);

    for (const [key, value] of nextPageSearchParams.entries()) {
      nextUrl.searchParams.set(key, value);
    }

    return nextUrl.toString();
  }

  /**
   * @param url URL or endpoint
   * @param config Axios request configuration
   * @returns Observable of resource page
   */
  public getWithPagination<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Observable<PaginatedResponse<T>> {
    const request$ = this.get<ApiPaginatedResponse<T>>(url, config);

    return request$.pipe(
      mergeMap((response: ApiPaginatedResponse<T>) => {
        const { data, hasMore, nextPage } = response;

        if (hasMore && nextPage != null) {
          const nextPageUrl = this.getNextPageUrl(url, nextPage);
          const nextPage$ = this.getWithPagination<T>(nextPageUrl);

          return concat(
            of({
              data,
              hasMore,
              nextPage: () => nextPage$,
            } as PaginatedResponse<T>),
            nextPage$
          );
        }

        return of({
          data,
          hasMore: false,
          nextPage: () => of({}),
        } as PaginatedResponse<T>);
      })
    );
  }

  /**
   * @param url URL or endpoint
   * @param config Axios request configuration
   * @returns Observable wrapper for Axios request data
   */
  public delete<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Observable<T> {
    return this.request<T>({
      ...config,
      method: "delete",
      url,
    });
  }

  /**
   * @param url URL or endpoint
   * @param data Axios data to send as request body
   * @param config Axios request configuration
   * @returns Observable wrapper for Axios request data
   */
  public post<T>(
    url: string,
    data: any,
    config?: AxiosRequestConfig
  ): Observable<T> {
    return this.request<T>({
      ...config,
      method: "post",
      url,
      data,
    });
  }

  /**
   * @param url URL or endpoint
   * @param data Axios data to send as request body
   * @param config Axios request configuration
   * @returns Observable wrapper for Axios request data
   */
  public put<T>(
    url: string,
    data: any,
    config?: AxiosRequestConfig
  ): Observable<AxiosResponse | T> {
    return this.request<T>({
      ...config,
      method: "put",
      url,
      data,
    });
  }
}
