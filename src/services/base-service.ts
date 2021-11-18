import axios, { AxiosResponse } from 'axios';
import { auth } from './auth-service';

export default class BaseService {

    instance = axios.create();

    constructor(baseURL: string) {
        this.instance.defaults.baseURL = baseURL;
    }

    protected get = async (url: string): Promise<AxiosResponse<any>> => {
        await this.setToken();
        return this.instance.get(url);
    }


    private setToken = async () => {
        if (!auth)
            throw new Error('The Auth Client have not been initialized');

        this.instance.defaults.headers.common['Authorization'] = `Bearer ${await auth.getTokenSilently()}`;
    };

}