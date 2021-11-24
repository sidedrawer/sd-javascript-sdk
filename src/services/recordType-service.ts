import config from '../config.json';
import BaseService from './base-service';
import { AxiosResponse } from 'axios';
import { RecordType, RecordSubType } from '../types';


export interface IRecordTypeService {

    getBy(): Promise<AxiosResponse<RecordType[]>>;

    getRecordSubtype(recordTypeName: string): Promise<AxiosResponse<RecordSubType[]>>;


}
export default class RecordTypeService extends BaseService implements IRecordTypeService {
    constructor() {
        super(config.apiRecord);
    }

    getBy = async (): Promise<AxiosResponse<RecordType[]>> => {
        return this.get<RecordType[]>(`records-type`);

    };

    getRecordSubtype = async (recordTypeName: string): Promise<AxiosResponse<RecordSubType[]>> => {
        return this.get<RecordSubType[]>(`records-type/record-type-name/${recordTypeName}/record-subtype`);

    };

}



