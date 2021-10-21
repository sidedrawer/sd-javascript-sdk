import config from '../config.json';
import axios from 'axios';

const instance = axios.create({
    baseURL: config.apiNetwork
});


export const getTimeline = async (sidedrawer_id: string, type: string) => {
    return instance.get(`sidedrawer/sidedrawer-id/${sidedrawer_id}/log?locale=en-CA&page=1&entityType=${type}`);
};

export const getShared = async () => {
    return instance.get(`sidedrawer/shared`);
};

export const getOwned = async () => {
    return instance.get(`sidedrawer/owned`);
};

