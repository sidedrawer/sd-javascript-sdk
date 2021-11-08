import config from '../config.json';
import createAuth0Client, { Auth0Client, GetTokenSilentlyOptions, GetUserOptions, LogoutOptions, RedirectLoginOptions, RedirectLoginResult, User } from '@auth0/auth0-spa-js';

export var auth: Auth0Client | null = null;

export const createAuthClient = async (client_id: string) => {


    auth = await createAuth0Client({
        domain: config.auth0Domain,
        client_id: client_id,
        scope: 'openid profile offline_access',
        audience: 'https://user-api-stg.sidedrawer.com',
        useRefreshTokens: true

    });
};

export interface IAuthClient {
    /**
     * ```js
     * const isAuthenticated = await authClient.isAuthenticated();
     * ```
     *
     * Returns `true` if there's valid information stored,
     * otherwise returns `false`.
     *
     */
    isAuthenticated(): Promise<boolean>;

    /**
     * After the browser redirects back to the callback page,
     * call `handleRedirectCallback` to handle success and error
     * responses from Auth. If the response is successful, results
     * will be valid according to their expiration times.
     */
    handleRedirectCallback(url?: string): Promise<RedirectLoginResult>;

    /**
     * ```js
     * const user = await auth.getUser();
     * ```
     *
     * Returns the user information if available (decoded
     * from the `id_token`).
     *
     * If you provide an audience or scope, they should match an existing Access Token
     * (the SDK stores a corresponding ID Token with every Access Token, and uses the
     * scope and audience to look up the ID Token)
     *
     * @typeparam TUser The type to return, has to extend {@link User}.
     * @param options
     */
    getUser(options?: GetUserOptions): Promise<User | undefined>;

    /**
     * ```js
     * await authClient.loginWithRedirect(options);
     * ```
     *
     * Performs a redirect to `/authorize` using the parameters
     * provided as arguments. Random and secure `state` and `nonce`
     * parameters will be auto-generated.
     *
     * @param options
     */
    loginWithRedirect(options?: RedirectLoginOptions): Promise<void>;

    /**
     * ```js
     * const token = await authClient.getTokenSilently(options);
     * ```
     *
     * If there's a valid token stored, return it. Otherwise, opens an
     * iframe with the `/authorize` URL using the parameters provided
     * as arguments. Random and secure `state` and `nonce` parameters
     * will be auto-generated. If the response is successful, results
     * will be valid according to their expiration times.
     *
     * If refresh tokens are used, the token endpoint is called directly with the
     * 'refresh_token' grant. If no refresh token is available to make this call,
     * the SDK falls back to using an iframe to the '/authorize' URL.
     *
     * This method may use a web worker to perform the token call if the in-memory
     * cache is used.
     *
     * If an `audience` value is given to this function, the SDK always falls
     * back to using an iframe to make the token exchange.
     *
     * Note that in all cases, falling back to an iframe requires access to
     * the `auth0` cookie.
     *
     * @param options
     */
    getTokenSilently(options?: GetTokenSilentlyOptions): Promise<any>;

    /**
 * ```js
 * authClient.logout();
 * ```
 *
 * Clears the application session and performs a redirect to `/v2/logout`, using
 * the parameters provided as arguments, to clear the Auth session.

 * [Read more about how Logout works at Auth](https://auth0.com/docs/logout).
 *
 * @param options
 */
    logout(options?: LogoutOptions): Promise<void>;

}

export default class AuthClient implements IAuthClient {

    isAuthenticated = async (): Promise<boolean> => {

        return auth != null ? auth.isAuthenticated() : false;
    };

    handleRedirectCallback = async (url?: string): Promise<RedirectLoginResult> => {
        checkAuthClient();

        return auth!.handleRedirectCallback(url);

    };

    getUser = async (options?: GetUserOptions): Promise<User | undefined> => {
        checkAuthClient();

        return auth!.getUser(options);
    };

    loginWithRedirect = async (options?: RedirectLoginOptions): Promise<void> => {
        checkAuthClient();
        return auth!.loginWithRedirect(options);

    };


    getTokenSilently = async (options?: GetTokenSilentlyOptions): Promise<any> => {
        checkAuthClient();
        return auth!.getTokenSilently(options);

    };

    logout = async (options?: LogoutOptions): Promise<void> => {
        checkAuthClient();
        return await auth!.logout(options);

    };


}



const checkAuthClient = async () => {
    if (!auth)
        throw new Error('The  Auth Client have not been initialized');

};

