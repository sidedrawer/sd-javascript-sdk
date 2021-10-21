import * as authservice from './services/auth-service';


export const createAuthSidedrawerClient = async (client_id: string) => {
    return await authservice.createAuthClient(client_id);
};

