import config from '../config.json';
import createAuth0Client from '@auth0/auth0-spa-js';


export const createAuthClient = async (client_id: string) => {

    return await createAuth0Client({
        domain: config.auth0Domain,
        client_id: client_id,
        scope: 'openid profile offline_access',
        audience: 'https://user-api-stg.sidedrawer.com',
        useRefreshTokens: true

    });
};



