
import { SpecificFieldType } from './specificFieldType';

export interface CustomField {

    label?: string,
    value?: string | Date,
    formType?: SpecificFieldType,
    id?: string

}