import { Contributor } from './contributor';
import { ContributorType } from './contributorType';
import { Relation } from './relation';


export interface TransferOwnershipDto {
    contributor?: Contributor;
    contributorType?: ContributorType;
    relation?: Relation;
    transferOwnership: true,
}
