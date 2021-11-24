import config from '../config.json';
import BaseService from './base-service';
import { AxiosResponse } from 'axios';
import { Record } from '../types';


export interface IRecordService {

    getBySidedrawer(sidedrawer_id: string): Promise<AxiosResponse<Record[]>>;

    getById(sidedrawer_id: string, record_id: string): Promise<AxiosResponse<Record>>;

    remove(sidedrawer_id: string, record_id: string): Promise<AxiosResponse<Record[]>>;

    create(sidedrawer_id: string, record: Record): Promise<AxiosResponse<{ id: string }>>;

    update(sidedrawer_id: string, record: Record): Promise<AxiosResponse<{ id: string }>>

}
export default class RecordService extends BaseService implements IRecordService {
    constructor() {
        super(config.apiRecord);
    }

    getBySidedrawer = async (sidedrawer_id: string): Promise<AxiosResponse<Record[]>> => {
        return this.get<Record[]>(`sidedrawer/sidedrawer-id/${sidedrawer_id}/records`);

    };

    getById = async (sidedrawer_id: string, record_id: string): Promise<AxiosResponse<Record>> => {
        return this.get<Record>(`sidedrawer/sidedrawer-id/${sidedrawer_id}/records/record-id/${record_id}`);

    };

    remove = async (sidedrawer_id: string, record_id: string): Promise<AxiosResponse<Record[]>> => {
        return this.delete<Record[]>(`sidedrawer/sidedrawer-id/${sidedrawer_id}/records/record-id/${record_id}`);

    };

    create = async (sidedrawer_id: string, record: Record): Promise<AxiosResponse<{ id: string }>> => {
        return this.post<{ id: string }>(`sidedrawer/sidedrawer-id/${sidedrawer_id}/records`, record);
    };

    update = async (sidedrawer_id: string, record: Record): Promise<AxiosResponse<{ id: string }>> => {
        return this.put<{ id: string }>(`sidedrawer/sidedrawer-id/${sidedrawer_id}/records`, record);
    };

}



