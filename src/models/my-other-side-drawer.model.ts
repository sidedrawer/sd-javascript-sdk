import {SideDrawerRole} from "./side-drawer-role.enum";

export class MyOtherSideDrawer {
  constructor(
    public id?: string,
    public name?: string,
    public networkId?: string,
    public plan?: string,
    public sdPhoto?: string,
    public sdRole?: SideDrawerRole,
    public isDefault?: boolean,
  ) {
  }
}
