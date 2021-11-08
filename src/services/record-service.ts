import config from '../config.json';
import axios from 'axios';
import { auth } from './auth-service';

const instance = axios.create({
    baseURL: config.apiRecord
});
export interface IRecordService {

    getBySidedrawer(sidedrawer_id: string): Promise<any>;
    getUserSetting(user_id: string): Promise<any>;

}
export default class RecordService implements IRecordService {

    getBySidedrawer = async (sidedrawer_id: string) => {
        await setToken();
        return instance.get(`sidedrawer/sidedrawer-id/${sidedrawer_id}/records`);
    };

    getUserSetting = async (user_id: string) => {
        await setToken();
        return instance.get(`/accounts/account-id/${user_id}/settings`);
    };

}

const setToken = async () => {
    if (!auth)
        throw new Error('The  Auth Client have not been initialized');

    instance.defaults.headers.common['Authorization'] = `Bearer ${await auth.getTokenSilently()}`;
};


