import { DisplayValue } from "./base"

/** Record Detail */
export interface RecordDetail {
    id: string,
    name: string,
    description: string,
    recordSubType: {
        name: string,
        logo?: string,
        description?: string // remove?
        orderId?: number,
        displayValue: DisplayValue
    },
    recordSubtypeOther: string,
    storageLocation: string,
    recordType: {
        name: string,
        sidedrawerType?: 'individual' | 'business' | 'other',
        sidedrawerTypeOtherName?: string,
        logo: string,
        displayValue: DisplayValue,
        cobrantId?: string,
        orderId?: number
    },
    status: string,
    updatedAt: string | Date,
    lastModifiedBy: string,
    contributors: string[]
}

export interface GetRecordParams {
    sidedrawerId: string,
    recordId?: string
}
