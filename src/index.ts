
import AuthClient, { createAuthClient, IAuthClient } from './services/auth-service';

import RecordService, { IRecordService } from './services/record-service';

import SidedrawerSevice, { ISidedrawerSevice } from './services/sidedrawer-service';

import UserSevice, { IUserSevice } from './services/user-service';

import NetworkService, { INetworkService } from './services/network-service';

export const authClient: IAuthClient = new AuthClient();

export const networks: INetworkService = new NetworkService();

export const records: IRecordService = new RecordService();

export const sidedrawers: ISidedrawerSevice = new SidedrawerSevice();

export const users: IUserSevice = new UserSevice();

export const createAuthSidedrawerClient = async (client_id: string) => {
    return await createAuthClient(client_id);
};



