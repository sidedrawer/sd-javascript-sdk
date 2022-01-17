import {SideDrawerModule} from "./modules/sidedrawer.module";
import {Environment} from "./models/environment.enum";
import {AccountModule} from "./modules/account.module";
import {RecordsModule} from "./modules/records.module";
import {PlanRequestsModule} from "./modules/plan-requests.module";

export class SdSdk {
    public SideDrawer = new SideDrawerModule(this.environment);
    public Account = new AccountModule(this.environment);
    public Records = new RecordsModule(this.environment);
    public PlanRequests = new PlanRequestsModule(this.environment);

    constructor(
        private environment: Environment = Environment.production,
    ) {
    }
}
