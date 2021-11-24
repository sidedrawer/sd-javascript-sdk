import config from '../config.json';
import BaseService from './base-service';
import { AxiosResponse } from 'axios';
import { SideDrawer } from '../types';


export interface ISidedrawerSevice {

    getHome(sidedrawer_id: string, locale: string): Promise<AxiosResponse<SideDrawer>>;
    getById(user_id: string): Promise<AxiosResponse<SideDrawer>>;

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

}

