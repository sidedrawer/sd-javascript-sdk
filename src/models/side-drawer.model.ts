import {Provider} from "./provider.enum";
import {RecordType} from "./record-type.model";
import {SideDrawerRole} from "./side-drawer-role.enum";
import {SubscriptionFeatures} from "./subscription-features.model";

export interface SideDrawer {
    id?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    profilePhoto?: string;
    isDefault?: boolean;
    status?: string;
    userSidedrawerRole?: SideDrawerRole[];
    subscriptionFeatures?: SubscriptionFeatures;
    type?: string;
    recordsType?: RecordType[];
    active?: boolean;
    maxRecordsReached?: boolean;
    integrations?: Provider[];
    licenseKey?: string;
    brandCode?: string;
    owners?: Account[];
}
