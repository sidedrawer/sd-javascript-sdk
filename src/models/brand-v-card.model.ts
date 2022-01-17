export interface BrandVCard {
    profilePhoto?: string;
    primaryName?: string;
    description1?: string;
    description2?: string;
    contactLinks?: {
        icon: string,
        label: string,
        link: string,
        orderId: number
    }[];
}
