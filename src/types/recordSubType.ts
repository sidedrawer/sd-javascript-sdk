import { DisplayValue } from './displayValue';
import { RecordsSections } from './recordsSections';

export interface RecordSubType {

    name?: string,
    logo?: string,
    displayValue?: DisplayValue[],
    id?: string,
    orderId?: number,
    recordsSections?: RecordsSections,

}