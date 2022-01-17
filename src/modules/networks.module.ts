import {Environment} from "../models/environment.enum";
import {env} from "../environments/environment";

export class NetworksModule {
    private networksApi: string;

    constructor(public environment: Environment) {
        this.networksApi = env(this.environment).networksApi;
    }

    searchNetworks() {}

    getRecordOrSideDrawerCollaborators() {}

    getRecordOrSideDrawerInvitations() {}

    getRecordOrSideDrawerTeams() {}

    getCurrentUserTeams() {}

    getSideDrawersShared() {}

    getSideDrawersOwned() {}

    getTemplatesWithUserAccess() {}

    createSideDrawerNetwork() {}

    updateSideDrawerNetworkById() {}

    deleteSideDrawerNetworkById() {}

    transferSideDrawerOwnership() {}

    createRecordNetwork() {}

    updateRecordNetworkById() {}

    deleteRecordNetworkById() {}
}
