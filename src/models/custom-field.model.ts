import { SpecificFieldType } from './specific-field-type.enum';
export class CustomField {
  constructor(
    public label?: string,
    public value?: string | Date,
    public formType?: SpecificFieldType,
    public id?: string
  ) {
    if (!formType) this.formType = SpecificFieldType.string;
    if (!id) this.id = Math.random().toString(36).substr(2, 9);
    this.value = value ? value : '';
    this.label = label ? label : '';
  }
}
