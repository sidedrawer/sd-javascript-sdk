import {Contributor} from './contributor.model';
import {Relation} from './relation.model';
import {ContributorType} from './contributor-type.enum';

export class Network {
  constructor(
    public sidedrawer?: string,
    public record?: string,
    public recordRole?: string,
    public sidedrawerRole?: string,
    public contributor?: Contributor,
    public relation?: Relation,
    public id?: string,
    public contributorType?: ContributorType,
  ) {
  }
}
