// import {environment} from "../environments/environment";
// import {Account} from "../models/account.model";
//
// const userApi = environment.userApi;
//
// const getAccountByOpenId = (payload: {
//     openId: string,
//     token: string,
// }): Promise<Account> => {
//     return fetch(
//         userApi + `/user/open-id/${payload?.openId}`,
//         {
//             method: 'GET',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${payload?.token}`,
//             }
//         }
//     ).then(response => response.json())
// }
//
// export const AccountModule = {
//     getAccountByOpenId,
// }
