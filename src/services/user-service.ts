import config from '../config.json';
import BaseService from './base-service';
import { AxiosResponse } from 'axios';

export interface IUserSevice {

    getUserBy(auth: string): Promise<AxiosResponse<any>>;
    getSetting(user_id: string): Promise<AxiosResponse<any>>;

}

export default class UserSevice extends BaseService implements IUserSevice {
    constructor() {
        super(config.apiUser);
    }

    getUserBy = async (auth: string) => {

        return this.get(`/accounts/open-id/${auth}`);
    };

    getSetting = async (user_id: string) => {
        return this.get(`/accounts/account-id/${user_id}/settings`);
    };

}
