import config from '../config.json';
import axios from 'axios';
import { auth } from './auth-service';

const instance = axios.create({
    baseURL: config.apiNetwork
});


export interface INetworkService {

    getTimeline(sidedrawer_id: string, type: string): Promise<any>;
    getShared(): Promise<any>;
    getOwned(): Promise<any>;

}

export default class NetworkService implements INetworkService {

    getTimeline = async (sidedrawer_id: string, type: string) => {
        await setToken();
        return instance.get(`sidedrawer/sidedrawer-id/${sidedrawer_id}/log?locale=en-CA&page=1&entityType=${type}`);
    };

    getShared = async () => {
        await setToken();
        return instance.get(`sidedrawer/shared`);
    };

    getOwned = async () => {
        await setToken();
        return instance.get(`sidedrawer/owned`);
    };


}


const setToken = async () => {
    if (!auth)
        throw new Error('The  Auth Client have not been initialized');

    instance.defaults.headers.common['Authorization'] = `Bearer ${await auth.getTokenSilently()}`;
};

