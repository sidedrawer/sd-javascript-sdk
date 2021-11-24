
import { CustomField } from './customField';

export interface RecordDetails {

    cloudStorageFolder?: string[],
    assetCurrentValue?: string,
    assetHistory?: string[],
    liabilityCurrentValue?: string,
    liabilityHistory?: string[],
    customFields?: CustomField[],

}