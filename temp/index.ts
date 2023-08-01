import {SdSdk} from "../dist";
import {Environment} from "../dist/models/environment.enum";

export const bla = () => {
    const sdk = new SdSdk(Environment.development);
    sdk.Records.createRecord({
        token: 'My Token',
        sidedrawerId: '619239517d01feacb5947f63',
        recordTypeName: 'corporateDocs',
        name: 'My Record Name',
        description: 'My Record Description',
        recordSubtypeName: 'will',
        editable: true,
    })
}
