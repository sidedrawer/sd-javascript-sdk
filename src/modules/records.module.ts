import {Environment} from "../models/environment.enum";
import {env} from "../environments/environment";
import {Record} from "../models/record.model";
import {UtilsHelper} from "../helpers/utils.helper";
import {RelatedRecord} from "../models/related-record.model";
import {SideDrawerTypesEnum} from "../models/side-drawer-types.enum";
import {Order} from "../models/order.enum";
import {RecordType} from "../models/record-type.model";
import {RecordSubType} from "../models/record-sub-type.model";

/**
 * @module
 * Records Module to handle Records level information
 */
export class RecordsModule {
    private recordsApi: string;

    constructor(
        public environment: Environment,
    ) {
        this.recordsApi = env(this.environment).recordsApi;
    }

    /**
     * Update the SideDrawer with the given information
     * @returns The ID of the new record created
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.name The Record Name
     * @param payload.description The Record Description
     * @param payload.storageLocation The Record Storage Location, a physical place in which the record is stored
     * @param payload.recordSubtypeName The Record SubType Name, use one suggested by the tenant or other to set a custom one
     * @param payload.recordSubtypeOther The Record SubType Other name, used when record subtype is equal to other
     * @param payload.recordTypeName The Record Type Name,
     * @param payload.editable used to enable the edition of the Record, default value true
     * @param payload.recordDetails custom information saved at Record level
     */
    createRecord(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Id */
        sidedrawerId: string,
        /** Record Name */
        name: string,
        /** Description */
        description: string,
        /** Storage Location */
        storageLocation: string,
        /** Record SubType Name */
        recordSubtypeName: string,
        /** Record SubType Other Name */
        recordSubtypeOther: string,
        /** Record Type Name */
        recordTypeName: string,
        /** used to enable the edition of the Record, default value true */
        editable: boolean,
        /** custom information saved at Record level */
        recordDetails: {}
    }): Promise<{ id: string }> {
        const body = {...payload};
        delete body.token;
        delete body.sidedrawerId;
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/records`,
            {
                method: 'POST',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Search Records in the SideDrawer
     * @returns An Array of Records
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.name The Record Name
     * @param payload.recordSubtypeName The Record SubType Name, use one suggested by the tenant or other to set a custom one
     * @param payload.recordSubtypeOther The Record SubType Other name, used when record subtype is equal to other
     * @param payload.recordTypeName The Record Type Name,
     */
    searchRecords(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer ID */
        sidedrawerId: string,
        /** Record Name */
        name: string,
        /** Record SubType Name */
        recordSubtypeName: string,
        /** Record SubType Other Name */
        recordSubtypeOther: string,
        /** Record Type Name */
        recordTypeName: string,
    }): Promise<Record[]> {
        let params = {...UtilsHelper.removeEmptyEntriesFromObject(payload)};
        delete params.token;
        delete params.sidedrawerId;
        // @ts-ignore
        const url = this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/records` + new URLSearchParams(params);
        return fetch(
            url,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Get one Record by RecordId
     * @returns One Record
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     */
    getRecord(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer ID */
        sidedrawerId: string,
        /** Record ID */
        recordId: string,
    }): Promise<Record> {
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/records/record-id/${payload?.recordId}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Update one Record by RecordId
     * @returns The Record before the update
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     * @param payload.name The Record Name
     * @param payload.description The Record Description
     * @param payload.storageLocation The Record Storage Location, a physical place in which the record is stored
     * @param payload.recordSubtypeName The Record SubType Name, use one suggested by the tenant or other to set a custom one
     * @param payload.recordSubtypeOther The Record SubType Other name, used when record subtype is equal to other
     * @param payload.recordTypeName The Record Type Name,
     * @param payload.editable used to enable the edition of the Record, default value true
     * @param payload.recordDetails custom information saved at Record level
     */
    updateRecord(
        payload: {
            /** Bearer Token */
            token: string,
            /** SideDrawer ID */
            sidedrawerId: string,
            /** Record ID */
            recordId: string,
            /** Record Name */
            name: string,
            /** Description */
            description: string,
            /** Storage Location */
            storageLocation: string,
            /** Record SubType Name */
            recordSubtypeName: string,
            /** Record SubType Other Name */
            recordSubtypeOther: string,
            /** Record Type Name */
            recordTypeName: string,
            /** used to enable the edition of the Record, default value true */
            editable: boolean,
            /** custom information saved at Record level */
            recordDetails: {}
        }
    ): Promise<Record> {
        let body = {...UtilsHelper.removeEmptyEntriesFromObject(payload)};
        delete body.token;
        delete body.sidedrawerId;
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/records/record-id/${payload?.recordId}`,
            {
                method: 'PUT',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Delete one Record by RecordId
     * @returns The ID of the Record deleted
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     */
    deleteRecord(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer ID */
        sidedrawerId: string,
        /** Record ID */
        recordId: string,
    }): Promise<{ id: string }> {
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/records/record-id/${payload?.recordId}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Creates one Related Record
     * @returns The new Related Record
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     * @param payload.relatedRecordId The Related Record ID
     */
    createRelatedRecord(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer ID */
        sidedrawerId: string,
        /** Record ID */
        recordId: string,
        /** Related Record ID */
        relatedRecordId: string,
    }): Promise<RelatedRecord> {
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/records/record-id/${payload?.recordId}/related`,
            {
                method: 'POST',
                body: JSON.stringify({recordId: payload.relatedRecordId}),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Get the Related Records of a Record
     * @returns An Array of Related Records
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     */
    getRelatedRecords(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer ID */
        sidedrawerId: string,
        /** Record ID */
        recordId: string,
    }): Promise<RelatedRecord[]> {
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/records/record-id/${payload?.recordId}/related`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Delete one Related Record
     * @returns The ID of the Related Record deleted
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     * @param payload.relatedRecordId The Related Record ID
     */
    deleteRelatedRecord(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer ID */
        sidedrawerId: string,
        /** Record ID */
        recordId: string,
        /** Related Record ID */
        relatedRecordId: string,
    }): Promise<{id: string}> {
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/records/record-id/${payload?.recordId}/related`,
            {
                method: 'DELETE',
                body: JSON.stringify({recordId: payload.relatedRecordId}),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Get Records Types
     * @returns An Array of Records Types
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerType The SideDrawer Type
     * @param payload.sidedrawerTypeOtherName SideDrawer Type Other Name, used when sidedrawerType is equal to 'other'
     * @param payload.locale The ID of the locale, example: en-CA
     * @param payload.order Order, default ASC
     * @param payload.cobrandId The ID of a Branding
     * @param payload.brandCode The BrandCode of a Branding,
     */
    getRecordsType(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Type */
        sidedrawerType: SideDrawerTypesEnum,
        /** SideDrawer Type Other Name, used when sidedrawerType is equal to 'other' */
        sidedrawerTypeOtherName: string,
        /** The ID of the locale, example: en-CA */
        locale?: string,
        /** Order, default ASC */
        order?: Order,
        /** The ID of a Branding */
        cobrandId?: string,
        /** The BrandCode of a Branding */
        brandCode?: string,
    }): Promise<RecordType[]> {
        let params = {...UtilsHelper.removeEmptyEntriesFromObject(payload)};
        delete params.token;
        // @ts-ignore
        const url = this.recordsApi + `records-type` + new URLSearchParams(params);
        return fetch(
            url,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Get Record SubTypes
     * @returns An Array of Record SubTypes
     * @param payload.token The Bearer Token for the request
     * @param payload.recordTypeName The Record Type Name
     * @param payload.locale The ID of the locale, example: en-CA
     * @param payload.order Order, default ASC
     */
    getRecordSubTypes(payload: {
        /** Bearer Token */
        token: string,
        /** Record Type Name */
        recordTypeName: string,
        /** The ID of the locale, example: en-CA */
        locale?: string,
        /** Order, default ASC */
        order?: Order,
    }): Promise<RecordSubType[]> {
        let params = {...UtilsHelper.removeEmptyEntriesFromObject(payload)};
        delete params.token;
        delete params.recordTypeName;
        // @ts-ignore
        const url = this.recordsApi + `records-type/record-type-name/${payload?.recordTypeName}/record-subtype` + new URLSearchParams(params);
        return fetch(
            url,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Get Record SubType Specific Fields
     * @returns An Array of Record SubTypes
     * @param payload.token The Bearer Token for the request
     * @param payload.recordTypeName The Record Type Name
     * @param payload.recordSubtypeName The Record SubType Name
     * @param payload.locale The ID of the locale, example: en-CA
     * @param payload.order Order, default ASC
     */
    getRecordSubTypeSpecificFields(payload: {
        /** Bearer Token */
        token: string,
        /** Record Type Name */
        recordTypeName: string,
        /** Record SubType Name */
        recordSubtypeName: string,
        /** The ID of the locale, example: en-CA */
        locale?: string,
        /** Order, default ASC */
        order?: Order,
    }): Promise<RecordSubType[]> {
        let params = {...UtilsHelper.removeEmptyEntriesFromObject(payload)};
        delete params.token;
        delete params.recordTypeName;
        delete params.recordSubtypeName;
        // @ts-ignore
        const url = this.recordsApi + `records-type/record-type-name/${payload?.recordTypeName}/record-subtype/record-subtype-name/${payload?.recordSubtypeName}/specific-fields` + new URLSearchParams(params);
        return fetch(
            url,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }
}
