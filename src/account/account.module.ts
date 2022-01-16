import {Environment} from "../models/environment.enum";
import {env} from "../environments/environment";

export class AccountModule {
    private userApi: string;

    constructor(
        public environment: Environment,
    ) {
        this.userApi = env(this.environment).userApi;
    }

    /**
     * Get the Account Information using the OpenId
     * @returns The SideDrawer Information
     * @param payload.token The Bearer Token for the request
     * @param payload.openId User Open ID
     */
    getAccountByOpenId(payload: {
        /** Bearer Token */
        token: string,
        /** User OpenId */
        openId: string,
    }): Promise<Account> {
        return fetch(
            this.userApi + `/user/open-id/${payload?.openId}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }
}
