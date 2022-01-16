import {Price} from "./price.model";

export interface AssignedLicense {
    subscriptionId: string;
    plan: Price;
    sponsored: boolean;
    renewsOn: Date;
}
