export class PrimaryResidence {
    constructor(
        public buildingNumber?: string,
        public streetName?: string,
        public unitNumber?: string,
        public city?: string,
        public provinceState?: string,
        public postalZip?: string,
        public country?: string,
    ) {
    }

    public toAddress(): string {
        let addressField = '';
        addressField = !!this.streetName && this.streetName.trim().length > 0
            ? addressField + this.streetName + (!!this.unitNumber && this.unitNumber.trim().length > 0 ? ' ' : ', ')
            : addressField;
        addressField = !!this.unitNumber && this.unitNumber.trim().length > 0 ? addressField + this.unitNumber + ', ' : addressField;
        addressField = !!this.city && this.city.trim().length > 0 ? addressField + this.city + ', ' : addressField;
        addressField =
            !!this.provinceState && this.provinceState.trim().length > 0 ? addressField + this.provinceState + ', ' : addressField;
        addressField = !!this.postalZip && this.postalZip.trim().length > 0 ? addressField + this.postalZip + ', ' : addressField;
        addressField = !!this.country && this.country.trim().length > 0 ? addressField + this.country : addressField;
        return addressField;
    }
}
