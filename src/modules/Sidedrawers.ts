import Context from "../core/Context";
import { ObservablePromise } from "../types/core";
import { isRequired } from "../utils/core";


export interface HomeSidedrawerParams {

  locale?: string;
  sidedrawerId: string;

}

export interface SearchSidedrawersParams {
  limit?: string;
  startingAfter?: string;
  endingBefore?: string;
  totalCount?: number;
  name?: string;
  type?: string;
  isTemplate?: string;
  region?: string;
  externalKey?: string;
  externalKeyValue?: string;
}

export default class Sidedrawers {
  private context: Context;

  constructor(context: Context) {
    this.context = context;
  }

  public shared(): ObservablePromise<Object> {
    return this.context.http.get(`/api/v1/networks/sidedrawer/shared`);
  }

  public owned(): ObservablePromise<Object> {
    return this.context.http.get(`/api/v1/networks/sidedrawer/owned`);
  }

  public search(
    apiParams
      : SearchSidedrawersParams): ObservablePromise<Object> {
    return this.context.http.get(
      `/api/v2/networks/sidedrawer-lite`,
      {
        params: apiParams
      }
    );
  }

  public homeLite({
    sidedrawerId = isRequired("sidedrawerId"),
    locale = this.context.locale,
    ...extraParams
  }: HomeSidedrawerParams): ObservablePromise<Object> {
    return this.context.http.get(
      `/api/v1/records/sidedrawer/sidedrawer-id/${sidedrawerId}/home-lite`,
      {
        params: {
          locale,
          ...extraParams,
        },
      }
    );
  }

  public home({
    sidedrawerId = isRequired("sidedrawerId"),
    locale = this.context.locale,
    ...extraParams
  }: HomeSidedrawerParams): ObservablePromise<Object> {
    return this.context.http.get(
      `/api/v1/records/sidedrawer/sidedrawer-id/${sidedrawerId}/home`,
      {
        params: {
          locale,
          ...extraParams,
        },
      }
    );
  }

}

export { Sidedrawers };
