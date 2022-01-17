import {DisplayValue} from "./display-value.model";
import {PlanRequestedItemType} from './plan-requested-item-type.enum';
import {SpecificFieldType} from './specific-field-type.enum';
import {PlanItemFormTypeDto} from "./plan-item-form-type.dto";
import {RecordType} from './record-type.model';
import {RecordSubType} from './record-sub-type.model';
import {Record} from './record.model';

export class PlanRequestedItem {
    constructor(
        public id?: string,
        public name?: string,
        public info?: DisplayValue[],
        public itemType?: PlanRequestedItemType,
        public completed?: boolean,
        public lastModifiedBy?: string,
        public updatedAt?: boolean,
        public optional?: boolean,
        // FIELD TYPE
        public fieldValue?: any,
        public validation?: {
            formType?: SpecificFieldType | PlanItemFormTypeDto,
        },
        // RECORD TYPE
        public records?: Record[],
        public recordType?: RecordType,
        public recordSubtype?: RecordSubType,
        public subtypeOtherName?: string,
        public orderId?: number,
    ) {
    }
}
