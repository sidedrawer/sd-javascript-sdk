import {SideDrawerModule} from "./sidedrawers/sidedrawer.module";
import {Environment} from "./models/environment.enum";
import {AccountModule} from "./account/account.module";
import {RecordsModule} from "./records/records.module";

export class SdSdk {
    public SideDrawer = new SideDrawerModule(this.environment);
    public Account = new AccountModule(this.environment);
    public Records = new RecordsModule(this.environment);

    constructor(
        private environment: Environment = Environment.production,
    ) {
    }
}
