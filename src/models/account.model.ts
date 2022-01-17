import {PrimaryResidence} from "./primary-residence.model";
import {Email} from "./email.model";
import {Phone} from "./phone.model";
import {Settings} from "./settings.model";
import {Agreement} from "./agreement.model";

export interface Account {
    username?: string;
    firstName?: string;
    lastName?: string;
    profilePhoto?: string;
    dateOfBirth?: string;
    maritalStatus?: string;
    primaryResidence?: PrimaryResidence;
    gender?: string;
    emails?: Email[];
    phones?: Phone[];
    settings?: Settings;
    agreements?: Agreement[];
    id?: string;
    openId?: string;
    customerId?: string;
}
