import { AxiosResponse } from 'axios';
import config from '../config.json';
import BaseService from './base-service';
import { SideDrawer } from '../types/sidedrawer';


export interface INetworkService {

    getTimeline(sidedrawer_id: string, type: string): Promise<AxiosResponse<any>>;
    getShared(): Promise<AxiosResponse<any>>;
    getOwned(): Promise<AxiosResponse<SideDrawer[]>>;

}

export default class NetworkService extends BaseService implements INetworkService {
    constructor() {
        super(config.apiNetwork);

    }

    getTimeline = async (sidedrawer_id: string, type: string): Promise<AxiosResponse<any>> => {

        return this.get(`sidedrawer/sidedrawer-id/${sidedrawer_id}/log?locale=en-CA&page=1&entityType=${type}`);

    };

    getShared = async (): Promise<AxiosResponse<any>> => {

        return this.get(`sidedrawer/shared`);
    };

    getOwned = async (): Promise<AxiosResponse<SideDrawer[]>> => {

        return this.get<SideDrawer[]>(`sidedrawer/owned`);
    };

}


