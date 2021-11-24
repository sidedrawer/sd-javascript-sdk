import { AxiosResponse } from 'axios';
import config from '../config.json';
import BaseService from './base-service';
import { SideDrawerMain } from '../types';


export interface INetworkService {

    getTimeline(sidedrawer_id: string, type: string, locale: string, page: number): Promise<AxiosResponse<any>>;
    getShared(): Promise<AxiosResponse<SideDrawerMain[]>>;
    getOwned(): Promise<AxiosResponse<SideDrawerMain[]>>;
    remove(sidedrawer_id: string): Promise<AxiosResponse<any>>;

}

export default class NetworkService extends BaseService implements INetworkService {
    constructor() {
        super(config.apiNetwork);

    }

    getTimeline = async (sidedrawer_id: string, type: string, locale: string, page: number): Promise<AxiosResponse<any>> => {

        return this.get(`sidedrawer/sidedrawer-id/${sidedrawer_id}/log?locale==${locale}&page=${page}&entityType=${type}`);

    };

    getShared = async (): Promise<AxiosResponse<SideDrawerMain[]>> => {

        return this.get<SideDrawerMain[]>(`sidedrawer/shared`);
    };

    getOwned = async (): Promise<AxiosResponse<SideDrawerMain[]>> => {

        return this.get<SideDrawerMain[]>(`sidedrawer/owned`);
    };

    remove = async (sidedrawer_id: string): Promise<AxiosResponse<any>> => {

        return this.delete(`sidedrawer/sidedrawer-id/${sidedrawer_id}`);
    };


}


