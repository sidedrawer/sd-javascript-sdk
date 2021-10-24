import config from '../config.json';
import axios from 'axios';
//import { Auth0Client } from '@auth0/auth0-spa-js';


const instance = axios.create({
    baseURL: config.apiNetwork
});


export const getTimeline = async (sidedrawer_id: string, type: string) => {
    return instance.get(`sidedrawer/sidedrawer-id/${sidedrawer_id}/log?locale=en-CA&page=1&entityType=${type}`);
};

export const getShared = async () => {
    return instance.get(`sidedrawer/shared`);
};

export const getOwned = async (token: string) => {

    return instance.get(`sidedrawer/owned`, { headers: { authorization: `Bearer ${token}` } });
};
