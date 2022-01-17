import {Relation} from './relation.model';
import {CollaboratorItemType} from './collaborator-item-type.enum';

export class MyNetwork {
  constructor(
    public name?: string,
    public email?: string,
    public openId?: string,
    public phoneNumber?: string,
    public profilePhoto?: string,
    public sidedrawer?: string,
    public id?: string,
    public record?: string,
    public recordRole?: string,
    public sidedrawerRole?: string,
    public relation?: Relation,
    public type?: CollaboratorItemType,
    public teamId?: string,
    public teamLogo?: string,
    public teamName?: string,
  ) {
  }
}
