import config from '../config.json';
import BaseService from './base-service';
import { AxiosResponse } from 'axios';


export interface ISidedrawerSevice {

    getHome(sidedrawer_id: string): Promise<AxiosResponse<any>>;
    getById(user_id: string): Promise<AxiosResponse<any>>;

}

export default class SidedrawerSevice extends BaseService implements ISidedrawerSevice {
    constructor() {
        super(config.apiRecord);
    }

    getHome = async (sidedrawer_id: string) => {
        return this.get(`sidedrawer/sidedrawer-id/${sidedrawer_id}/home?locale=en-CA`);

    };

    getById = async (sidedrawer_id: string) => {
        return this.get(`sidedrawer/sidedrawer-id/${sidedrawer_id}`);

    };

}

