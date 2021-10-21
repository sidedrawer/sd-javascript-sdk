import config from '../config.json';
import axios from 'axios';

const instance = axios.create({
    baseURL: config.apiUser
});


export const getUserBy = async (auth: string) => {
    return instance.get(`/accounts/open-id/${auth}`);
};

export const getUserSetting = async (user_id: string) => {
    return instance.get(`/accounts/account-id/${user_id}/settings`);
};

