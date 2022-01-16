import {SideDrawerTypesEnum} from "../models/side-drawer-types.enum";
import {SideDrawer} from "../models/side-drawer.model";
import {StyleMode} from "../models/style-mode.enum";
import {Brand} from "../models/brand.model";
import {AssignedLicense} from "../models/assigned-license.model";
import {Environment} from "../models/environment.enum";
import {env} from "../environments/environment";

/**
 * @module
 * SideDrawer Module to handle SideDrawer level information
 */
export class SideDrawerModule {
    private recordsApi: string;

    constructor(
        public environment: Environment,
    ) {
        this.recordsApi = env(this.environment).recordsApi;
    }

    /**
     * Creates a new SideDrawer
     * @returns Id of the new SideDrawer
     * @param payload.token The Bearer Token for the request
     * @param payload.name The SideDrawer Name
     * @param payload.brandCode The SideDrawer BrandCode
     * @param payload.type The SideDrawer Type
     * @param payload.profilePhoto Profile photo for the SideDrawer
     * @param payload.firstName Owner First Name
     * @param payload.lastName Owner Last Name
     * @param payload.typeOtherName SideDrawer Type Other Name, used when type is equal to 'other'
     * @param payload.emailUsername Email or username of the owner
     * @param payload.licenseKey License Key to apply to the SideDrawer
     * @param payload.dataBaseRegion SideDrawer DataBase Region
     * @param payload.default used to set this SideDrawer as the owner defaults
     * @param payload.editable use to enable the edition of the SideDrawer, default value true
     * @param payload.metadata custom information saved at SideDrawer level
     */
    createSideDrawer(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Name */
        name: string,
        /** SideDrawer BrandCode */
        brandCode: string,
        /** SideDrawer Type */
        type: SideDrawerTypesEnum,
        /** Profile photo for the SideDrawer  */
        profilePhoto?: string,
        /** Owner First Name */
        firstName?: string,
        /** Owner Last Name */
        lastName?: string,
        /** SideDrawer Type Other Name */
        typeOtherName?: string,
        /** Email or username of the owner */
        emailUsername?: string,
        /** License Key to apply to the SideDrawer */
        licenseKey?: string,
        /** SideDrawer DataBase Region */
        dataBaseRegion?: string,
        /** used to set this SideDrawer as the owner defaults */
        default?: boolean,
        /** use to enable the edition of the SideDrawer, default value true */
        editable?: boolean,
        /** custom information saved at SideDrawer level */
        metadata?: {}
    }): Promise<{ id: string }> {
        const body = {...payload};
        delete body.token;
        if (typeof payload?.brandCode === "undefined") body.brandCode = 'sidedrawer';
        if (typeof payload?.default === "undefined") body.default = true;
        if (typeof payload?.editable === "undefined") body.editable = true;
        return fetch(
            this.recordsApi + `sidedrawer`,
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
     * @param payload.token The Bearer Token for the request
     * @param payload.id The SideDrawer ID
     * @param payload.name The SideDrawer Name
     * @param payload.profilePhoto Profile photo for the SideDrawer
     * @param payload.firstName Owner First Name
     * @param payload.lastName Owner Last Name
     * @param payload.emailUsername Email or username of the owner
     * @param payload.default used to set this SideDrawer as the owner defaults
     * @param payload.licenseKey License Key to apply to the SideDrawer
     * @param payload.brandCode The SideDrawer BrandCode
     * @param payload.metadata custom information saved at SideDrawer level
     * @param payload.dataBaseRegion SideDrawer DataBase Region
     */
    updateSideDrawer(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Id */
        id: string,
        /** SideDrawer Name */
        name?: string,
        /** Profile photo for the SideDrawer  */
        profilePhoto?: string,
        /** Owner First Name */
        firstName?: string,
        /** Owner Last Name */
        lastName?: string,
        /** Email or username of the owner */
        emailUsername?: string,
        /** used to set this SideDrawer as the owner defaults */
        default?: boolean,
        /** License Key to apply to the SideDrawer */
        licenseKey?: string,
        /** SideDrawer BrandCode */
        brandCode?: string,
        /** custom information saved at SideDrawer level */
        metadata?: {},
        /** SideDrawer DataBase Region */
        dataBaseRegion?: string,
    }): Promise<SideDrawer> {
        const body = {...payload};
        delete body.token;
        delete body.id;
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.id}`,
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
     * @param payload.token The Bearer Token for the request
     * @param payload.id The SideDrawer ID
     */
    getSideDrawer(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Id */
        id: string,
    }): Promise<SideDrawer> {
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.id}`,
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
     * @param payload.token The Bearer Token for the request
     * @param payload.id The SideDrawer ID
     */
    deleteSideDrawer(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Id */
        id: string,
    }): Promise<SideDrawer> {
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.id}`,
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
     * @param payload.token The Bearer Token for the request
     * @param payload.id The SideDrawer ID
     * @param payload.localeId Id of the Locale
     */
    getSideDrawerHome(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Id */
        id: string,
        /** Locale Id , default: en-CA */
        localeId?: string,
    }): Promise<SideDrawer> {
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.id}/home?locale=${!!payload?.localeId ? payload?.localeId : 'en-CA'}`,
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
     * @param payload.token The Bearer Token for the request
     * @param payload.id The SideDrawer ID
     * @param payload.localeId Id of the Locale
     * @param payload.styleMode Light or Dark Mode tu customize the colors. Default Light
     */
    getSideDrawerBranding(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Id */
        id: string,
        /** Locale Id , default: en-CA */
        localeId?: string,
        /** StyleMode, default = light */
        styleMode?: StyleMode,
    }): Promise<Brand> {
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.id}/branding?locale=${!!payload?.localeId ? payload?.localeId : 'en-CA'}&darkMode=${!!payload.styleMode ? payload.styleMode : StyleMode.light}`,
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
     * @param payload.token The Bearer Token for the request
     * @param payload.id The SideDrawer ID
     */
    getSideDrawerLicenses(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Id */
        id: string,
    }): Promise<AssignedLicense[]> {
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.id}/licenses`,
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
     * @param payload.token The Bearer Token for the request
     * @param payload.brandCode The BrandCode of the tenant or the subtenant
     */
    getSideDrawersTypes(payload: {
        /** Bearer Token */
        token: string,
        /** BrandCode */
        brandCode: string,
    }): Promise<string[]> {
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-types?brandCode=${payload?.brandCode}`,
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
