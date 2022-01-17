import {Environment} from "../models/environment.enum";
import {env} from "../environments/environment";
import {RequestPlanToSideDrawerDto} from "../models/request-plan-to-side-drawer.dto";
import {PlanRequested} from "../models/plan-requested.model";
import {UtilsHelper} from "../helpers/utils.helper";
import {PlanRequestedItem} from "../models/plan-requested-item.model";

export class PlanRequestsModule {
    private plansApi: string;

    constructor(public environment: Environment) {
        this.plansApi = env(this.environment).plansApi;
    }

    /**
     * Request Plan to a SideDrawer
     * @returns The IDs of the plan, the SideDrawer and the PlanRequest
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.planId The ID of the Plan to request to the SideDrawer
     */
    requestPlanToSideDrawer(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Id */
        sidedrawerId: string,
        /** Plan Id */
        planId: string
    }): Promise<RequestPlanToSideDrawerDto> {
        return fetch(
            this.plansApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/plan-requests`,
            {
                method: 'POST',
                body: JSON.stringify({planId: payload?.planId}),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Get a List of the Plans Requested to this SideDrawer
     * @returns The IDs of the plan, the SideDrawer and the PlanRequest
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.locale The ID of the locale, example: en-CA
     */
    getSideDrawersPlanRequests(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Id */
        sidedrawerId: string,
        /** The ID of the locale, example: en-CA */
        locale?: string,
    }): Promise<PlanRequested[]> {
        const params = {...UtilsHelper.removeEmptyEntriesFromObject({locale: payload?.locale})};
        return fetch(
            // @ts-ignore
            this.plansApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/plan-requests` + new URLSearchParams(params),
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Request Plan to a SideDrawer
     * @returns The PlanRequested removed
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.planRequestId The ID of the PlanRequested to the SideDrawer (it's different from the plan id)
     */
    removePlanRequestFromSideDrawer(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Id */
        sidedrawerId: string,
        /** Plan Requested ID */
        planRequestId: string
    }) {
        return fetch(
            this.plansApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/plan-requests/plan-request-id/${payload?.planRequestId}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Get the List of the Plans Requested Items
     * @returns An Array of PlanRequest Items
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.planRequestId The ID of the PlanRequested to the SideDrawer (it's different from the plan id)
     * @param payload.locale The ID of the locale, example: en-CA
     */
    getPlanRequestItems(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Id */
        sidedrawerId: string,
        /** Plan Requested ID */
        planRequestId: string
        /** The ID of the locale, example: en-CA */
        locale?: string,
    }): Promise<PlanRequestedItem[]> {
        const params = {...UtilsHelper.removeEmptyEntriesFromObject({locale: payload?.locale})};
        return fetch(
        // @ts-ignore
            this.plansApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/plan-requests/plan-request-id/${payload?.planRequestId}/items`  + new URLSearchParams(params),
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Add a Record or a Value to the Plan Request Item
     * @returns The PlanRequest Item
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.planRequestId The ID of the PlanRequested to the SideDrawer (it's different from the plan id)
     * @param payload.itemId The ID of the item
     * @param payload.recordId The ID of the record added to this item
     * @param payload.recordId The field value of this item, used when the recordId is not sent. It could be a string or an object
     */
    createPlanRequestItem(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Id */
        sidedrawerId: string,
        /** Plan Requested ID */
        planRequestId: string
        /** item ID */
        itemId: string
        /** The ID of the record added to this item */
        recordId?: string,
        /** The field value of this item, used when the recordId is not sent. It could be a string or an object */
        fieldValue?: string | object
    }): Promise<PlanRequestedItem> {
        const {recordId, fieldValue} = payload;
        const body = !!recordId ? {recordId} : {fieldValue};
        return fetch(
            this.plansApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/plan-requests/plan-request-id/${payload?.planRequestId}/items/item-id/${payload?.itemId}`,
            {
                method: 'POST',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Update the Plan Request Item Record or Value
     * @returns The PlanRequest Item before the update
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.planRequestId The ID of the PlanRequested to the SideDrawer (it's different from the plan id)
     * @param payload.itemId The ID of the item
     * @param payload.recordId The ID of the record added to this item
     * @param payload.recordId The field value of this item, used when the recordId is not sent. It could be a string or an object
     */
    updatePlanRequestItem(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Id */
        sidedrawerId: string,
        /** Plan Requested ID */
        planRequestId: string
        /** item ID */
        itemId: string
        /** The ID of the record added to this item */
        recordId?: string,
        /** The field value of this item, used when the recordId is not sent. It could be a string or an object */
        fieldValue?: string | object
    }): Promise<PlanRequestedItem> {
        const {recordId, fieldValue} = payload;
        const body = !!recordId ? {recordId} : {fieldValue};
        return fetch(
            this.plansApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/plan-requests/plan-request-id/${payload?.planRequestId}/items/item-id/${payload?.itemId}`,
            {
                method: 'PUT',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Delete the Plan Request Item Record or Value
     * @returns The PlanRequest Item before the update
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.planRequestId The ID of the PlanRequested to the SideDrawer (it's different from the plan id)
     * @param payload.itemId The ID of the item
     * @param payload.recordId The ID of the record added to this item
     * @param payload.recordId The field value of this item, used when the recordId is not sent. It could be a string or an object
     */
    deletePlanRequestItem(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Id */
        sidedrawerId: string,
        /** Plan Requested ID */
        planRequestId: string
        /** item ID */
        itemId: string
        /** The ID of the record added to this item */
        recordId?: string,
        /** The field value of this item, used when the recordId is not sent. It could be a string or an object */
        fieldValue?: string | object
    }): Promise<PlanRequestedItem> {
        const {recordId, fieldValue} = payload;
        const body = !!recordId ? {recordId} : {fieldValue};
        return fetch(
            this.plansApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/plan-requests/plan-request-id/${payload?.planRequestId}/items/item-id/${payload?.itemId}`,
            {
                method: 'DELETE',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }
}
