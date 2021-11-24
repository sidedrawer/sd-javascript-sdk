import config from '../config.json';
import BaseService from './base-service';
import { AxiosResponse } from 'axios';
import { SideDrawer } from '../types';


export interface ISidedrawerSevice {

    getHome(sidedrawer_id: string, locale: string): Promise<AxiosResponse<SideDrawer>>;

    getById(sidedrawer_id: string): Promise<AxiosResponse<SideDrawer>>;

    remove(sidedrawer_id: string): Promise<AxiosResponse<any>>;

    create(sidedrawer: SideDrawer): Promise<AxiosResponse<{ id: string }>>;

    update(sidedrawer: SideDrawer): Promise<AxiosResponse<SideDrawer>>;

}

export default class SidedrawerSevice extends BaseService implements ISidedrawerSevice {
    constructor() {
        super(config.apiRecord);
    }

    getHome = async (sidedrawer_id: string, locale: string): Promise<AxiosResponse<SideDrawer>> => {
        return this.get<SideDrawer>(`sidedrawer/sidedrawer-id/${sidedrawer_id}/home?locale=${locale}`);

    };

    getById = async (sidedrawer_id: string): Promise<AxiosResponse<SideDrawer>> => {
        return this.get<SideDrawer>(`sidedrawer/sidedrawer-id/${sidedrawer_id}`);

    };

    remove = async (sidedrawer_id: string): Promise<AxiosResponse<any>> => {
        return this.delete(`sidedrawer/sidedrawer-id/${sidedrawer_id}`);

    };

    create = async (sidedrawer: SideDrawer): Promise<AxiosResponse<{ id: string }>> => {
        return this.post<{ id: string }>(`sidedrawer`, sidedrawer);
    };

    update = async (sidedrawer: SideDrawer): Promise<AxiosResponse<SideDrawer>> => {
        return this.put<SideDrawer>(`sidedrawer`, sidedrawer);
    };

}

