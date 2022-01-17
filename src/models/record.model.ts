import {RecordType} from './record-type.model';
import {RecordSubType} from "./record-sub-type.model";
import {RecordDetails} from "./record-details.model";
import {SideDrawerRole} from "./side-drawer-role.enum";
import {RecordRole} from "./record-role.enum";
import {FileHistory} from "./file-history.model";

export class Record {
    constructor(
        public id?: string,
        public name?: string,
        public description?: string,
        public uniqueReference?: string,
        public storageLocation?: string,
        public recordSubtypeName?: string,
        public recordTypeName?: string,
        public recordSubtype?: RecordSubType,
        public recordType?: RecordType,
        public recordSubtypeOther?: string,
        public active?: boolean,
        public status?: any,
        public recordDetails?: RecordDetails,
        public userSidedrawerRole?: SideDrawerRole[],
        public userRecordRole?: RecordRole[],
        public filesHistory?: FileHistory[],
    ) {
    }

    public static isRecordValid(record: Record): boolean {
        return !!record.recordType && typeof record.recordType === 'object' &&
            !!record.recordSubtype && typeof record.recordSubtype === 'object';
    }
}
