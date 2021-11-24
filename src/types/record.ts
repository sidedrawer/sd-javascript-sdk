
import { RecordType } from './recordType';
import { RecordSubType } from './recordSubType';
import { Contributor } from './contributor';
import { RecordDetails } from './recordDetails';
import { SidedrawerRoles } from './sidedrawerRoles';
import { RecordsRoles } from './recordsRoles';
import { FileHistory } from './fileHistory';


export interface Record {
    id?: string,
    name?: string,
    storageLocation?: string,
    recordSubtypeOther?: string,
    description?: string,
    recordSubtype?: RecordSubType,
    recordType?: RecordType,
    updatedAt?: Date,
    lastModifiedBy?: string,
    status?: any,
    editable?: boolean,
    contributors?: Contributor[],
    uniqueReference?: string,
    recordSubtypeName?: string,
    recordTypeName?: string,
    active?: boolean,
    recordDetails?: RecordDetails,
    userSidedrawerRole?: SidedrawerRoles[],
    userRecordRole?: RecordsRoles[],
    filesHistory?: FileHistory[],


}