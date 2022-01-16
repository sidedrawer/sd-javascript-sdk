import {MfaMode} from "./mfa-mode.enum";

export interface Settings {
    notificationMethod?: string;
    communicationLanguage?: string;
    country?: string;
    preferredLanguage?: string;
    mfaDisabled?: boolean;
    mfaMode?: MfaMode;
    currency?: string;
}
