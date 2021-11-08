import config from '../config.json';
import axios from 'axios';
import { auth } from './auth-service';

const instance = axios.create({
    baseURL: config.apiRecord
});

export interface ISidedrawerSevice {

    getHome(sidedrawer_id: string): Promise<any>;
    getById(user_id: string): Promise<any>;

}

export default class SidedrawerSevice implements ISidedrawerSevice {

    getHome = async (sidedrawer_id: string) => {
        await setToken();
        return instance.get(`sidedrawer/sidedrawer-id/${sidedrawer_id}/home?locale=en-CA`);
    };

    getById = async (sidedrawer_id: string) => {
        await setToken();
        return instance.get(`sidedrawer/sidedrawer-id/${sidedrawer_id}`);
    };

}

const setToken = async () => {
    if (!auth)
        throw new Error('The  Auth Client have not been initialized');

    instance.defaults.headers.common['Authorization'] = `Bearer ${await auth.getTokenSilently()}`;
};

