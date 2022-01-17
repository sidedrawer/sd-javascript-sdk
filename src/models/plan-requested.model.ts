import {PlanRequestedType} from './plan-requested-type.enum';
import {DisplayValue} from "./display-value.model";

export class PlanRequested {
    constructor(
        public id?: string,
        public plan?: {
            active?: boolean,
            type?: PlanRequestedType,
            typeOtherName?: string,
            description?: DisplayValue[],
            name?: DisplayValue[],
            orderId?: number,
        },
        public totalItems?: number,
        public completedItems?: number,
        public optionalItems?: number,
        public lastModifiedBy?: string,
        public updatedAt?: Date,
        public orderId?: number,
    ) {
    }
}
