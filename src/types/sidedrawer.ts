import { SidedrawerRoles } from './sidedrawerRoles'
import { Provider } from './provider'
import { SubscriptionFeatures } from './subscriptionFeatures'
import { Account } from './account'
import { RecordType } from './recordType'

export interface SideDrawer {

    id?: string,
    name?: string,
    firstName?: string,
    lastName?: string,
    email?: string,
    profilePhoto?: string,
    isDefault?: boolean,
    status?: string,
    userSidedrawerRole?: SidedrawerRoles[],
    subscriptionFeatures?: SubscriptionFeatures,
    type?: string,
    recordsType?: RecordType[],
    active?: boolean,
    maxRecordsReached?: boolean,
    integrations?: Provider[],
    licenseKey?: string,
    brandCode?: string,
    owners?: Account[]

}
