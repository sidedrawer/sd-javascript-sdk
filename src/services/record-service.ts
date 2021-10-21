import config from '../config.json';
import axios from 'axios';

const instance = axios.create({
    baseURL: config.apiRecord
});


export const getBySidedrawer = async (sidedrawer_id: string) => {
    return instance.get(`sidedrawer/sidedrawer-id/${sidedrawer_id}/records`);
};

export const getUserSetting = async (user_id: string) => {
    return instance.get(`/accounts/account-id/${user_id}/settings`);
};



