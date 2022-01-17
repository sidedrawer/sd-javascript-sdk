import {Environment} from "../models/environment.enum";
import {env} from "../environments/environment";
import {SideDrawerRole} from "../models/side-drawer-role.enum";
import {RecordRole} from "../models/record-role.enum";
import {UtilsHelper} from "../helpers/utils.helper";
import {MyNetworkResponseDto} from "../models/my-network-response-dto.model";
import {Team} from "../models/team.model";
import {MyOtherSideDrawer} from "../models/my-other-side-drawer.model";
import {Contributor} from "../models/contributor.model";
import {ContributorType} from "../models/contributor-type.enum";
import {Relation} from "../models/relation.model";
import {Network} from "../models/network.model";

export class NetworksModule {
    private networksApi: string;

    constructor(public environment: Environment) {
        this.networksApi = env(this.environment).networksApi;
    }

    /**
     * Search Networks
     * @returns An Array of Networks
     * @param payload.token The Bearer Token for the request
     * @param payload.networkId The Network ID
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.sidedrawerRole The SideDrawer Role
     * @param payload.recordId The Record ID
     * @param payload.recordRole The Record Role
     * @param payload.invitationCode The Invitation Code
     */
    searchNetworks(payload: {
        /** Bearer Token */
        token: string,
        /** The Network ID */
        networkId?: string,
        /** The SideDrawer ID */
        sidedrawerId?: string,
        /** The SideDrawer Role */
        sidedrawerRole?: SideDrawerRole,
        /** The Record ID */
        recordId?: string,
        /** The Record Role */
        recordRole?: RecordRole,
        /** The Invitation Code */
        invitationCode?: string,
    }) {
        let params = {...UtilsHelper.removeEmptyEntriesFromObject(payload)};
        delete params.token;
        return fetch(
            // @ts-ignore
            this.networksApi + `network` + new URLSearchParams(params),
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json());
    }

    /**
     * Get a List of active Collaborators to given sidedrawer or record
     * @returns An Array of Networks
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     */
    getRecordOrSideDrawerCollaborators(payload: {
        /** Bearer Token */
        token: string,
        /** The Network ID */
        networkId?: string,
        /** The SideDrawer ID */
        sidedrawerId?: string,
        /** The Record ID */
        recordId?: string,
    }): Promise<MyNetworkResponseDto[]> {
        let params = {...UtilsHelper.removeEmptyEntriesFromObject(payload)};
        delete params.token;
        return fetch(
            // @ts-ignore
            this.networksApi + `network/collaborators` + new URLSearchParams(params),
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json());
    }

    /**
     * Get a List of pending Collaborators to given sidedrawer or record
     * @returns An Array of Networks
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     */
    getRecordOrSideDrawerInvitations(payload: {
        /** Bearer Token */
        token: string,
        /** The Network ID */
        networkId?: string,
        /** The SideDrawer ID */
        sidedrawerId?: string,
        /** The Record ID */
        recordId?: string,
    }): Promise<MyNetworkResponseDto[]> {
        let params = {...UtilsHelper.removeEmptyEntriesFromObject(payload)};
        delete params.token;
        return fetch(
            // @ts-ignore
            this.networksApi + `network/invitations` + new URLSearchParams(params),
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json());
    }

    /**
     * Get a List of the Team Networks to given sidedrawer or record
     * @returns An Array of Networks
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     */
    getRecordOrSideDrawerTeams(payload: {
        /** Bearer Token */
        token: string,
        /** The Network ID */
        networkId?: string,
        /** The SideDrawer ID */
        sidedrawerId?: string,
        /** The Record ID */
        recordId?: string,
    }): Promise<MyNetworkResponseDto[]> {
        let params = {...UtilsHelper.removeEmptyEntriesFromObject(payload)};
        delete params.token;
        return fetch(
            // @ts-ignore
            this.networksApi + `network/teams` + new URLSearchParams(params),
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json());
    }

    /**
     * Get a List of the Team the user belongs to
     * @returns An Array of Networks
     * @param payload.token The Bearer Token for the request
     */
    getCurrentUserTeams(payload: {
        /** Bearer Token */
        token: string,
    }): Promise<Team[]> {
        return fetch(
            // @ts-ignore
            this.networksApi + `network/my-teams`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json());
    }

    /**
     * Get a List of SideDrawers the current user has been given permission
     * @returns An Array of MyOtherSideDrawer
     * @param payload.token The Bearer Token for the request
     */
    getSideDrawersShared(payload: {
        /** Bearer Token */
        token: string,
    }): Promise<MyOtherSideDrawer[]> {
        return fetch(
            // @ts-ignore
            this.networksApi + `network/shared`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json());
    }

    /**
     * Get a List of SideDrawers owned by the current user
     * @returns An Array of MyOtherSideDrawer
     * @param payload.token The Bearer Token for the request
     */
    getSideDrawersOwned(payload: {
        /** Bearer Token */
        token: string,
    }): Promise<MyOtherSideDrawer[]> {
        return fetch(
            // @ts-ignore
            this.networksApi + `network/owned`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json());
    }

    /**
     * Get a List of Templates the current user has been given permission
     * @returns An Array of MyOtherSideDrawer
     * @param payload.token The Bearer Token for the request
     */
    getTemplatesWithUserAccess(payload: {
        /** Bearer Token */
        token: string,
    }): Promise<MyOtherSideDrawer[]> {
        return fetch(
            // @ts-ignore
            this.networksApi + `network/templates`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json());
    }

    /**
     * Creates a new SideDrawer Network
     * @returns The id of the new Network
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.sidedrawerRole The SideDrawer Role
     * @param payload.contributor The Contributor
     * @param payload.contributorType The Contributor Type
     * @param payload.relation The Relation
     */
    createSideDrawerNetwork(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer ID */
        sidedrawerId: string,
        /** SideDrawer Role */
        sidedrawerRole: SideDrawerRole,
        /** Contributor */
        contributor: Contributor,
        /** Contributor Type */
        contributorType: ContributorType,
        /** Relation */
        relation: Relation,
    }): Promise<{ id: string }> {
        const body = {...payload};
        delete body.token;
        delete body.sidedrawerId;
        return fetch(
            // @ts-ignore
            this.networksApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/network`,
            {
                method: 'POST',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        )
            .then(response => response.json())
            .then(response => ({id: !!response?.id ? response?.id : response?._id,}));
    }

    /**
     * Updates a SideDrawer Network
     * @returns The Network before the update
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.networkId The Network ID
     * @param payload.sidedrawerRole The SideDrawer Role
     * @param payload.relation The Relation
     */
    updateSideDrawerNetworkById(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer ID */
        sidedrawerId: string,
        /** Network ID */
        networkId: string,
        /** SideDrawer Role */
        sidedrawerRole: SideDrawerRole,
        /** Relation */
        relation: Relation,
    }): Promise<Network> {
        const body = {...payload};
        delete body.token;
        delete body.sidedrawerId;
        delete body.networkId;
        return fetch(
            this.networksApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/network/network-id/${payload?.networkId}`,
            {
                method: 'PUT',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json());
    }

    /**
     * Deletes a SideDrawer Network
     * @returns The Network deleted
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.networkId The Network ID
     */
    deleteSideDrawerNetworkById(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer ID */
        sidedrawerId: string,
        /** Network ID */
        networkId: string,
    }): Promise<Network> {
        return fetch(
            this.networksApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/network/network-id/${payload?.networkId}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json());
    }


    /**
     * Transfer SideDrawer Ownership
     * @returns The id of the new Network
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.sidedrawerRole The SideDrawer Role
     * @param payload.contributor The Contributor
     * @param payload.contributorType The Contributor Type
     * @param payload.relation The Relation
     */
    transferSideDrawerOwnership(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer ID */
        sidedrawerId: string,
        /** SideDrawer Role */
        sidedrawerRole: SideDrawerRole,
        /** Contributor */
        contributor: Contributor,
        /** Contributor Type */
        contributorType: ContributorType,
        /** Relation */
        relation: Relation,
    }): Promise<{ id: string }> {
        const body = {...payload};
        delete body.token;
        delete body.sidedrawerId;
        return fetch(
            // @ts-ignore
            this.networksApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/transfer`,
            {
                method: 'POST',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        )
            .then(response => response.json())
            .then(response => ({id: !!response?.id ? response?.id : response?._id,}));
    }

    /**
     * Create Record Network
     * @returns The id of the new Network
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.sidedrawerRole The SideDrawer Role
     * @param payload.contributor The Contributor
     * @param payload.contributorType The Contributor Type
     * @param payload.relation The Relation
     */
    createRecordNetwork(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer ID */
        sidedrawerId: string,
        /** Record ID */
        recordId: string,
        /** Record Role */
        recordRole: RecordRole,
        /** Contributor */
        contributor: Contributor,
        /** Contributor Type */
        contributorType: ContributorType,
        /** Relation */
        relation: Relation,
    }): Promise<{ id: string }> {
        const body = {...payload};
        delete body.token;
        delete body.sidedrawerId;
        delete body.recordId;
        return fetch(
            this.networksApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/record/record-id/${payload?.recordId}/network`,
            {
                method: 'POST',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        )
            .then(response => response.json())
            .then(response => ({id: !!response?.id ? response?.id : response?._id,}));
    }

    /**
     * Updates a Record Network
     * @returns The Network before the update
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     * @param payload.networkId The Network ID
     * @param payload.sidedrawerRole The SideDrawer Role
     * @param payload.relation The Relation
     */
    updateRecordNetworkById(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer ID */
        sidedrawerId: string,
        /** Record ID */
        recordId: string,
        /** Network ID */
        networkId: string,
        /** SideDrawer Role */
        sidedrawerRole: SideDrawerRole,
        /** Relation */
        relation: Relation,
    }): Promise<Network> {
        const body = {...payload};
        delete body.token;
        delete body.recordId;
        delete body.sidedrawerId;
        delete body.networkId;
        return fetch(
            this.networksApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/record/record-id/${payload?.recordId}/network/network-id/${payload?.networkId}`,
            {
                method: 'PUT',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json());
    }

    /**
     * Deletes a Record Network
     * @returns The Network deleted
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     * @param payload.networkId The Network ID
     */
    deleteRecordNetworkById(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer ID */
        sidedrawerId: string,
        /** Record ID */
        recordId: string,
        /** Network ID */
        networkId: string,
    }): Promise<Network> {
        return fetch(
            this.networksApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/record/record-id/${payload?.recordId}/network/network-id/${payload?.networkId}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json());
    }
}
