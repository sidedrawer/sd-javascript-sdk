import config from '../config.json';
import axios from 'axios';

const instance = axios.create({
    baseURL: config.apiRecord
});


export const getHome = async (sidedrawer_id: string) => {
    return instance.get(`sidedrawer/sidedrawer-id/${sidedrawer_id}/home?locale=en-CA`);
};

export const getById = async (sidedrawer_id: string) => {
    return instance.get(`sidedrawer/sidedrawer-id/${sidedrawer_id}`);
};