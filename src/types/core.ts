import { Observable } from "rxjs";

export type ObservablePromise<T> = Observable<T> & PromiseLike<T>;

export interface Abortable {
  signal?: AbortSignal;
}