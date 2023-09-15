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

export interface DeleteRecordParams {

  sidedrawerId: string;
  recordId: string;
}

export interface UpdateRecordParams {
  sidedrawerId: string;
  recordId: string;
  name: string;
  description: string;
  uniqueReference?: string;
  storageLocation?: string;
  recordSubtypeName: string;
  recordSubtypeOther?: string;
  recordTypeName?: string;
  editable?: boolean;
  recordDetails?: {};
  status?: string;
  externalKeys?: [
    {
      key: string;
      value: string
    }
  ]
}

export interface CreateRecordParams {
  sidedrawerId: string;
  recordId: string;
  name: string;
  description: string;
  uniqueReference?: string;
  storageLocation?: string;
  recordSubtypeName: string;
  recordSubtypeOther?: string;
  recordTypeName?: string;
  editable?: boolean;
  recordDetails?: {};
  status?: string;
  externalKeys?: [
    {
      key: string;
      value: string
    }
  ]
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

  public create({
    sidedrawerId = isRequired("sidedrawerId"),
    recordId = isRequired("recordId"),
    ...extraParams
  }: CreateRecordParams): ObservablePromise<Object> {

    return this.context.http.post(`/api/v1/records/sidedrawer/sidedrawer-id/${sidedrawerId}/records`, extraParams);
  }

  public update({
    sidedrawerId = isRequired("sidedrawerId"),
    recordId = isRequired("recordId"),
    ...extraParams
  }: UpdateRecordParams): ObservablePromise<Object> {

    return this.context.http.put(`/api/v1/records/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}`, extraParams);
  }


  public delete({
    sidedrawerId = isRequired("sidedrawerId"),
    recordId = isRequired("recordId")
  }: DeleteRecordParams): ObservablePromise<Object> {

    return this.context.http.delete(`/api/v1/records/sidedrawer/sidedrawer-id/${sidedrawerId}/records/record-id/${recordId}`);
  }

}

export { Records };
