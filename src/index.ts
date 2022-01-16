import {SideDrawerModule} from "./sidedrawers/sidedrawer.module";
import {Environment} from "./models/environment.enum";
import {AccountModule} from "./account/account.module";

export class SdSdk {
    public SideDrawer = new SideDrawerModule(this.environment);
    public Account = new AccountModule(this.environment);

    constructor(
        public environment: Environment = Environment.production,
    ) {
    }
}
