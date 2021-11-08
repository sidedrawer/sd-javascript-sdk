import config from '../config.json';
import axios from 'axios';
import { auth } from './auth-service';

const instance = axios.create({
    baseURL: config.apiUser
});

export interface IUserSevice {

    getUserBy(auth: string): Promise<any>;
    getSetting(user_id: string): Promise<any>;

}

export default class UserSevice implements IUserSevice {

    getUserBy = async (auth: string) => {
        await setToken();
        return instance.get(`/accounts/open-id/${auth}`);
    };

    getSetting = async (user_id: string) => {
        await setToken();
        return instance.get(`/accounts/account-id/${user_id}/settings`);
    };

}


const setToken = async () => {
    if (!auth)
        throw new Error('The  Auth Client have not been initialized');

    instance.defaults.headers.common['Authorization'] = `Bearer ${await auth.getTokenSilently()}`;
};
