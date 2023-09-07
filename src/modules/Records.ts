import Context from "../core/Context";
import { ObservablePromise } from "../types/core";
import { isRequired } from "../utils/core";

export interface SearchRecordsParams {
  limit?: string;
  startingAfter?: string;
  endingBefore?: string;
  totalCount?: number;
  name?: string;
  uniqueReference?: string;
  recordTypeName?: string;
  recordSubtypeName?: string;
  recordSubtypeOther?: string;
  recordTypeId?: string;
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

  public search({
    sidedrawerId = isRequired("sidedrawerId"),
    displayInactive = false,
    locale = this.context.locale,
    ...extraParams
  }: SearchRecordsParams): ObservablePromise<Object[]> {
    return this.context.http.get(
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
