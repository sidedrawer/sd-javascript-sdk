import config from '../config.json';
import BaseService from './base-service';
import { AxiosResponse } from 'axios';
import { RecordFile } from '../types/recordFile';


export interface IRecordFileService {

    getByRecord(sidedrawer_id: string, record_id: string): Promise<AxiosResponse<RecordFile[]>>;
    remove(sidedrawer_id: string, record_id: string, fileName: string): Promise<AxiosResponse<any>>;
    getStreamByUrl(url: string): Promise<AxiosResponse<any>>;

}
export default class RecordFileService extends BaseService implements IRecordFileService {
    constructor() {
        super(config.apiRecord);
    }


    getByRecord = async (sidedrawer_id: string, record_id: string): Promise<AxiosResponse<RecordFile[]>> => {
        return this.get<RecordFile[]>(`sidedrawer/sidedrawer-id/${sidedrawer_id}/records/record-id/${record_id}/record-files`);

    };

    remove = async (sidedrawer_id: string, record_id: string, fileName: string): Promise<AxiosResponse<any>> => {
        return this.delete(`sidedrawer/sidedrawer-id/${sidedrawer_id}/records/record-id/${record_id}/record-files/${fileName}`);

    };

    getStreamByUrl = async (url: string): Promise<AxiosResponse<any>> => {
        return this.get(url, { responseType: 'stream' });

    };


}





