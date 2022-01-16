import {SideDrawerModule} from "./sidedrawers/sidedrawer.module";
import {Environment} from "./models/environment.enum";

export class SdSdk {
   constructor(
      public environment: Environment = Environment.production,
  ) {
  }

  public SideDrawer = new SideDrawerModule(this.environment);
}
