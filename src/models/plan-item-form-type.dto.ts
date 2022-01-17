import {SpecificFieldType} from "./specific-field-type.enum";

export interface PlanItemFormTypeDto {
  type: SpecificFieldType;
  options: string[] | {header: string, type: SpecificFieldType}[];
}
