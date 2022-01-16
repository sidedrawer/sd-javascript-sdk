import {SideDrawerModule} from "./sidedrawers/sidedrawer.module";

export class SdSdk {
  public static SideDrawer = SideDrawerModule;

  constructor(
      public environment?: string,
  ) {
  }
}
