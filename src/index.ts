
import AuthClient, { createAuthClient, IAuthClient } from './services/auth-service';

import RecordService, { IRecordService } from './services/record-service';

import RecordFileService, { IRecordFileService } from './services/recordFile-service';

import SidedrawerSevice, { ISidedrawerSevice } from './services/sidedrawer-service';

import AccountSevice, { IAccountSevice } from './services/account-service';

import NetworkService, { INetworkService } from './services/network-service';

export const authClient: IAuthClient = new AuthClient();

export const networks: INetworkService = new NetworkService();

export const records: IRecordService = new RecordService();

export const recordfiles: IRecordFileService = new RecordFileService();

export const sidedrawers: ISidedrawerSevice = new SidedrawerSevice();

export const users: IAccountSevice = new AccountSevice();

export const createAuthSidedrawerClient = async (client_id: string) => {
    return await createAuthClient(client_id);
};

export * from './types';



