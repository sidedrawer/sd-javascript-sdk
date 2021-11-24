
import { SidedrawerRoles } from './sidedrawerRoles'
import { Contributor } from './contributor'
import { ContributorType } from './contributorType'
import { Relation } from './relation'


export interface SidedrawerNetworkDto {
    sidedrawerRole?: SidedrawerRoles;
    contributor?: Contributor;
    contributorType?: ContributorType;
    relation?: Relation;

}