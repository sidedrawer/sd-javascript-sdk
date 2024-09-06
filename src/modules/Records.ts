import Context from "../core/Context";
import { PaginatedResponse } from "../core/HttpService";
import { ObservablePromise } from "../types/core";
import { isRequired } from "../utils/core";

export interface SearchRecordsParams {
  limit?: number;
  startingAfter?: string;
  endingBefore?: string;
  name?: string;
  uniqueReference?: string;
  recordTypeName?: string;
  recordSubtypeName?: string;
  recordSubtypeOtherName?: string;
  recordTypeId?: string;
  recordSubtypeId?: string;
  locale?: string;
  displayInactive?: boolean;
  status?: string;
  externalKey?: string;
  externalKeyValue?: string;
  sidedrawerId: string;
}

export default class Records {
  private context: Context;

  constructor(context: Context) {
    this.context = context;
  }

  public search(params: SearchRecordsParams): ObservablePromise<PaginatedResponse<Object>> {
    const {
      sidedrawerId = isRequired("sidedrawerId"),
      displayInactive = false,
      locale = this.context.locale,
      ...extraParams
    } = params;

    return this.context.http.getWithPagination(
      `/api/v2/records/sidedrawer/sidedrawer-id/${sidedrawerId}/records`,
      {
        params: {
          locale,
          displayInactive,
          ...extraParams,
        },
      }
    );
  }

  public obtain() {}
  public create() {}
  public update() {}
  public delete() {}
}

export { Records };
