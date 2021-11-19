import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import { auth } from './auth-service';

export default class BaseService {

    instance = axios.create();

    constructor(baseURL: string) {
        this.instance.defaults.baseURL = baseURL;
    }

    protected get = async <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        await this.setToken();
        return this.instance.get<T, AxiosResponse<T>>(url, config);
    }

    protected delete = async <T = any>(url: string): Promise<AxiosResponse<T>> => {
        await this.setToken();
        return this.instance.delete<T, AxiosResponse<T>>(url);
    }

    protected post = async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        await this.setToken();
        return this.instance.post<T, AxiosResponse<T>>(url, data, config);
    }


    private setToken = async () => {
        if (!auth)
            throw new Error('The Auth Client have not been initialized');

        this.instance.defaults.headers.common['Authorization'] = `Bearer ${await auth.getTokenSilently()}`;
    };

}