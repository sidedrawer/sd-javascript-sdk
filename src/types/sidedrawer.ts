import { SidedrawerRoles } from './sidedrawerRoles'

export interface SideDrawer {

    id?: string,
    name?: string,
    networkId?: string,
    plan?: string,
    sdPhoto?: string,
    sdRole?: SidedrawerRoles,
    isDefault?: boolean,

}

