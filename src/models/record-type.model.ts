import {DisplayValue} from "./display-value.model";

export interface RecordType {
    name?: string;
    logo?: string;
    displayValue?: DisplayValue[];
    id?: string;
    count?: number;
    sidedrawerType?: string;
    orderId?: number;
}
