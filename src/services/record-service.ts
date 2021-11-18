import config from '../config.json';
import BaseService from './base-service';
import { AxiosResponse } from 'axios';


export interface IRecordService {

    getBySidedrawer(sidedrawer_id: string): Promise<AxiosResponse<any>>;
    getUserSetting(user_id: string): Promise<AxiosResponse<any>>;

}
export default class RecordService extends BaseService implements IRecordService {
    constructor() {
        super(config.apiRecord);
    }

    getBySidedrawer = async (sidedrawer_id: string): Promise<AxiosResponse<any>> => {
        return this.get(`sidedrawer/sidedrawer-id/${sidedrawer_id}/records`);

    };

    getUserSetting = async (user_id: string): Promise<AxiosResponse<any>> => {

        return this.get(`/accounts/account-id/${user_id}/settings`);

    };

}



