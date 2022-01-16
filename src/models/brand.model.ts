import {BrandStyleSheet} from "./brand-style-sheet.model";
import {BrandVCard} from "./brand-v-card.model";
import {BrandImage} from "./brand-image.model";

export interface Brand {
    id: string;
    tenant: string;
    brandName: string;
    brandCode: string;
    locale: string;
    primaryLogoExpanded: BrandImage;
    primaryLogoContracted: BrandImage;
    secondaryLogo: BrandImage;
    primaryIsoLogo: BrandImage;
    secondaryIsoLogo: BrandImage;
    topBanner: BrandImage;
    footerMessage: string;
    styleSheet: BrandStyleSheet;
    appSections: {
        manageSubscriptions: boolean,
        paymentDetails: boolean,
        tellAFriend: boolean,
        faqs: boolean,
        helpAndSupport: boolean,
        about: boolean
        socialLogin: boolean
    };
    active: boolean;
    hideDefaultRecordTypes: boolean;
    bypassSDCreation: boolean;
    isDefault: boolean;
    forceSDCreation: boolean;
    vCard?: BrandVCard;
}
