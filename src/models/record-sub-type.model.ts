import { DisplayValue } from './display-value.model';
import { RecordsSections } from './records-sections.model';

export class RecordSubType {
  constructor(
    public name?: string,
    public logo?: string,
    public displayValue?: DisplayValue[],
    public id?: string,
    public orderId?: number,
    public recordsSections?: RecordsSections,
  ) {
  }
}
