import { Contributor } from './contributor';
import { ContributorType } from './contributorType';
import { Relation } from './relation';
import { RecordsRoles } from './recordsRoles';

export interface RecordNetworkDto {
    recordRole?: RecordsRoles;
    contributor?: Contributor;
    contributorType?: ContributorType;
    relation?: Relation;
}
