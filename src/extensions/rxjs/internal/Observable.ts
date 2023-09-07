import * as rxjs from "rxjs";

declare module "rxjs/internal/Observable" {
  interface Observable<T> extends Promise<T> {}
}

rxjs.Observable.prototype.then = function <TResult1 = any, TResult2 = never>(
  onfulfilled: (value: any) => TResult1 | PromiseLike<TResult1>,
  onrejected: (reason: any) => TResult2 | PromiseLike<TResult2>
): Promise<TResult1 | TResult2> {
  return new Promise(
    (
      resolve: (
        value: TResult1 | TResult2 | PromiseLike<TResult1 | TResult2>
      ) => void,
      reject: (reason?: any) => void
    ) => {
      rxjs
        .firstValueFrom<TResult1>(this)
        .then((value: TResult1) => {
          return resolve(onfulfilled(value));
        })
        .catch((rejectReason: any) => {
          return (onrejected || reject)(rejectReason);
        });
    }
  );
};

rxjs.Observable.prototype.catch = function <TResult = never>(
  onrejected: (reason: any) => TResult | PromiseLike<TResult>
): Promise<TResult> {
  return this.then(undefined, onrejected);
};
