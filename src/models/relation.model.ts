import {Relationship} from '../../dictionary/models/relationship.model';

export class Relation {
  constructor(
    public personal?: string,
    public profession?: string,
    public professionOther?: string,
    public personalOther?: string,
  ) {
  }

  public static getRelationString(relation: Relation, relationships: Relationship[]): string {
    if ((relation.personal === 'other' || !relation.personal) && !!relation.profession && relation.profession !== 'other') {
      return this.getRelationshipNameFromRelationID(relation.profession, relationships);
    }
    if ((relation.profession === 'other' || !relation.profession) && !!relation.personal && relation.personal !== 'other') {
      return this.getRelationshipNameFromRelationID(relation.personal, relationships);
    }
    if (!!relation.personalOther && relation.personalOther.length > 0) {
      return relation.personalOther;
    }
    if (!!relation.professionOther && relation.professionOther.length > 0) {
      return relation.professionOther;
    }
    if (!!relation.profession && relation.profession === 'other') {
      return this.getOtherRelationString(false, relationships);
    }
    return this.getOtherRelationString(true, relationships);
  }

  public static getRelationshipNameFromRelationID(relationId: string, relationships: Relationship[]): string {
    return !!relationships && relationships.find(relationship => relationship.relationship_relationshipid === relationId)
      ? relationships.find(relationship => relationship.relationship_relationshipid === relationId)?.relationship_relationshipname
      : relationId;
  }

  public static getOtherRelationString(personal: boolean, relationships: Relationship[]): string {
    if (!relationships) {
      return null;
    }
    return relationships.find(relationship =>
      relationship.relationship_relationshipid === 'other'
      && relationship.relationship_relationshipgroupid === (personal ? 'personal' : 'professional')
    )?.relationship_relationshipname;
  }

  public static areRelationsDifferent(a: Relation, b: Relation): boolean {
    return a.profession !== b.profession || a.personal !== b.personal;
  }
}
