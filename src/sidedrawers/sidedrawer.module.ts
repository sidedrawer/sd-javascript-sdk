import {SideDrawerTypesEnum} from "../models/side-drawer-types.enum";
import {environment} from '../environments/environment';
import {SideDrawer} from "../models/side-drawer.model";
import {StyleMode} from "../models/style-mode.enum";
import {Brand} from "../models/brand.model";
import {AssignedLicense} from "../models/assigned-license.model";

const recordsApi = environment.recordsApi;

/**
 * Creates a new SideDrawer
 * @returns Id of the new SideDrawer.
 */
const createSideDrawer = (payload: {
    /** Bearer Token */
    token: string,
    /** SideDrawer Name */
    name: string,
    /** SideDrawer BrandCode */
    brandCode: string,
    type: SideDrawerTypesEnum,
    profilePhoto?: string,
    firstName?: string,
    lastName?: string,
    typeOtherName?: string,
    emailUsername?: string,
    licenseKey?: string,
    dataBaseRegion?: string,
    default?: boolean,
    editable?: boolean,
    metadata?: {}
}): Promise<{ id: string }> => {
    const body = {...payload};
    delete body.token;
    if (typeof payload?.brandCode === "undefined") body.brandCode = 'sidedrawer';
    if (typeof payload?.default === "undefined") body.default = true;
    if (typeof payload?.editable === "undefined") body.editable = true;
    return fetch(
        recordsApi + `sidedrawer`,
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
 * Update the SideDrawer with the given information
 * @returns The SideDrawer Information before the update
 */
const updateSideDrawer = (payload: {
    /** Bearer Token */
    token: string,
    /** SideDrawer Id */
    id: string,
    name?: string,
    profilePhoto?: string,
    firstName?: string,
    emailUsername?: string,
    lastName?: string,
    default?: boolean,
    licenseKey?: string,
    brandCode?: string,
    metadata?: {},
    dataBaseRegion?: string,
}): Promise<SideDrawer> => {
    const body = {...payload};
    delete body.token;
    delete body.id;
    return fetch(
        recordsApi + `sidedrawer/sidedrawer-id/${payload?.id}`,
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
 * Get the information of a SideDrawer using the SideDrawer ID
 * @returns The SideDrawer Information
 */
const getSideDrawer = (payload: {
    /** Bearer Token */
    token: string,
    /** SideDrawer Id */
    id: string,
}): Promise<SideDrawer> => {
    return fetch(
        recordsApi + `sidedrawer/sidedrawer-id/${payload?.id}`,
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
 * Delete a SideDrawer using the SideDrawer ID
 * @returns The deleted SideDrawer Information
 */
const deleteSideDrawer = (payload: {
    /** Bearer Token */
    token: string,
    /** SideDrawer Id */
    id: string,
}): Promise<SideDrawer> => {
    return fetch(
        recordsApi + `sidedrawer/sidedrawer-id/${payload?.id}`,
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
 * Get the information of a SideDrawer using the SideDrawer ID for the Home View
 * @returns The SideDrawer Information
 */
const getSideDrawerHome = (payload: {
    /** Bearer Token */
    token: string,
    /** SideDrawer Id */
    id: string,
    /** Locale Id , default: en-CA */
    localeId?: string,
}): Promise<SideDrawer> => {
    return fetch(
        recordsApi + `sidedrawer/sidedrawer-id/${payload?.id}/home?locale=${!!payload?.localeId ? payload?.localeId : 'en-CA'}`,
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
 * Get the branding of the SideDrawer that contains styles, available sections and display configuration
 * @returns The Branding of the SideDrawer
 */
const getSideDrawerBranding = (payload: {
    /** Bearer Token */
    token: string,
    /** SideDrawer Id */
    id: string,
    /** Locale Id , default: en-CA */
    localeId?: string,
    /** StyleMode, default = light */
    styleMode?: StyleMode,
}): Promise<Brand> => {
    return fetch(
        recordsApi + `sidedrawer/sidedrawer-id/${payload?.id}/branding?locale=${!!payload?.localeId ? payload?.localeId : 'en-CA'}&darkMode=${!!payload.styleMode ? payload.styleMode : StyleMode.light}`,
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
 * Get the licenses of the SideDrawer
 * @returns The Licenses of the SideDrawer
 */
const getSideDrawerLicenses = (payload: {
    /** Bearer Token */
    token: string,
    /** SideDrawer Id */
    id: string,
}): Promise<AssignedLicense[]> => {
    return fetch(
        recordsApi + `sidedrawer/sidedrawer-id/${payload?.id}/licenses`,
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
 * Get an Array of SideDrawerTypes for the given BrandCode
 * @returns An array of strings that are the SideDrawer Types of the tenant
 */
const getSideDrawersTypes = (payload: {
    /** Bearer Token */
    token: string,
    /** Tenant BrandCode */
    brandCode: string,
}): Promise<string[]> => {
    return fetch(
        recordsApi + `sidedrawer/sidedrawer-types?brandCode=${payload?.brandCode}`,
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
 * @module
 * SideDrawer Module to handle SideDrawer level information
 */
export const SideDrawerModule = {
    createSideDrawer,
    updateSideDrawer,
    getSideDrawer,
    getSideDrawerHome,
    getSideDrawerBranding,
    getSideDrawerLicenses,
    deleteSideDrawer,
    getSideDrawersTypes,
}
