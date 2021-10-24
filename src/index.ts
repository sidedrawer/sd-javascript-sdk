import * as authservice from './services/auth-service';
import * as networkservice from './services/network-service';


export const createAuthSidedrawerClient = async (client_id: string) => {
    return await authservice.createAuthClient(client_id);
};

export const getSidedrawersOwned = async (token: string) => {
    return networkservice.getOwned(token);
};

