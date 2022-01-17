import { CustomField } from "./custom-field.model";

export class RecordDetails {
  constructor(
    public cloudStorageFolder?: string[],
    public assetCurrentValue?: string,
    public assetHistory?: string[],
    public liabilityCurrentValue?: string,
    public liabilityHistory?: string[],
    public customFields? : CustomField[],
  ) {
  }
}
