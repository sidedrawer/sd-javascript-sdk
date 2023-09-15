import Context from "../core/Context";
import { ObservablePromise } from "../types/core";


export interface NotificationsParams {
  entityType?: string;
  modificationType?: string;
  sender?: string;
  dateFrom?: string;
  dateTo?: string;
  region?: string;

}

export default class Notifications {
  private context: Context;

  constructor(context: Context) {
    this.context = context;
  }


  public owned(
    apiParams
      : NotificationsParams): ObservablePromise<Object> {
    return this.context.http.get(`/api/v1/networks/networks/sidedrawer/owned/raw-log-lite`,
      {
        params: apiParams
      });
  }

  public shared(
    apiParams
      : NotificationsParams): ObservablePromise<Object> {
    return this.context.http.get(`/api/v1/networks/networks/sidedrawer/shared/raw-log-lite`,
      {
        params: apiParams
      });
  }
}

export { Notifications };
