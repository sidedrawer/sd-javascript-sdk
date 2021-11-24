import config from '../config.json';
import BaseService from './base-service';
import { AxiosResponse } from 'axios';
import { Record } from '../types';


export interface IRecordService {

    getBySidedrawer(sidedrawer_id: string): Promise<AxiosResponse<Record[]>>;


}
export default class RecordService extends BaseService implements IRecordService {
    constructor() {
        super(config.apiRecord);
    }

    getBySidedrawer = async (sidedrawer_id: string): Promise<AxiosResponse<Record[]>> => {
        return this.get<Record[]>(`sidedrawer/sidedrawer-id/${sidedrawer_id}/records`);

    };



}



