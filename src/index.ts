import {SideDrawerModule} from "./modules/sidedrawer.module";
import {Environment} from "./models/environment.enum";
import {AccountModule} from "./modules/account.module";
import {RecordsModule} from "./modules/records.module";
import {PlanRequestsModule} from "./modules/plan-requests.module";
import {FilesModule} from "./modules/files.module";
import {NetworksModule} from "./modules/networks.module";

export class SdSdk {
    public SideDrawer = new SideDrawerModule(this.environment);
    public Account = new AccountModule(this.environment);
    public Records = new RecordsModule(this.environment);
    public PlanRequests = new PlanRequestsModule(this.environment);
    public Files = new FilesModule(this.environment);
    public Networks = new NetworksModule(this.environment);

    constructor(
        private environment: Environment = Environment.production,
    ) {
    }
}
