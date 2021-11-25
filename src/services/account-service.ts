import config from '../config.json';
import BaseService from './base-service';
import { AxiosResponse } from 'axios';
import { Settings, Account, Mfa } from '../types';



export interface IAccountSevice {

    getByOpenId(open_id: string): Promise<AxiosResponse<Account>>;

    getSetting(account_id: string): Promise<AxiosResponse<Settings>>;

    getById(account_id: string): Promise<AxiosResponse<Account>>;

    getByUserName(username: string): Promise<AxiosResponse<Account>>;

    getMfa(account_id: string, code: string): Promise<AxiosResponse<any>>;

    sendInvitationCode(account: Account, invitationCode: string): Promise<AxiosResponse<any>>;

    updateSettings(account_id: string, settings: Settings): Promise<AxiosResponse<Settings>>;

    update(account_id: string, account: Account): Promise<AxiosResponse<Account>>;

    createMfaCode(account_id: string, mfa: Mfa, brandCode: string): Promise<AxiosResponse<any>>;

    create(account: Account, brandCode: string, referralCode?: string, invitationCode?: string): Promise<AxiosResponse<{ id: string }>>;

    remove(account_id: string): Promise<AxiosResponse<any>>;
}

export default class AccountSevice extends BaseService implements IAccountSevice {
    constructor() {
        super(config.apiUser);
    }

    getByOpenId = async (open_id: string): Promise<AxiosResponse<Account>> => {
        return this.get<Account>(`accounts/open-id/${open_id}`);
    };

    getSetting = async (account_id: string): Promise<AxiosResponse<Settings>> => {
        return this.get<Settings>(`accounts/account-id/${account_id}/settings`);
    };

    getById = async (account_id: string): Promise<AxiosResponse<Account>> => {
        return this.get<Account>(`accounts/account-id/${account_id}`);
    };

    getByUserName = async (username: string): Promise<AxiosResponse<Account>> => {
        return this.get<Account>(`accounts/username/${username}`);
    };

    getMfa = async (account_id: string, code: string): Promise<AxiosResponse<any>> => {
        return this.get(`accounts/account-id/${account_id}/mfa/mfa-code/${code}`);
    };


    sendInvitationCode = async (account: Account, invitationCode: string): Promise<AxiosResponse<any>> => {
        return this.put(`accounts/account-id/${account.id}`, { ...account, invitationCode });
    }

    updateSettings = async (account_id: string, settings: Settings): Promise<AxiosResponse<Settings>> => {
        return this.put<Settings>(`accounts/account-id/${account_id}/settings`, settings);
    }

    update = async (account_id: string, account: Account): Promise<AxiosResponse<Account>> => {
        return this.put<Account>(`accounts/account-id/${account_id}`, account);
    };

    createMfaCode(account_id: string, mfa: Mfa, brandCode: string): Promise<AxiosResponse<any>> {
        return this.post(`accounts/account-id/${account_id}/mfa?brandCode=${brandCode}`, mfa);
    };


    create = async (account: Account, brandCode: string, referralCode?: string, invitationCode?: string): Promise<AxiosResponse<{ id: string }>> => {

        let body = {};
        if (!!referralCode)
            body = { ...body, referralCode };

        if (!!invitationCode)
            body = { ...body, invitationCode };

        body = { ...body, ...account };
        return this.post<{ id: string }>(`accounts?brandCode=${brandCode}`, body);
    }

    remove = async (account_id: string): Promise<AxiosResponse<any>> => {

        return this.delete(`accounts/account-id/${account_id}`);
    };



}
