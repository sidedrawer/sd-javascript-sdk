# SideDrawer JavaScript SDK

SDK for the SideDrawer API

> This project embrace `tyoescript`.

> If you’re new to TypeScript, checkout [this handy cheatsheet](https://devhints.io/typescript)

## Installation

To install the SDK, use:

```bash
npm install -S sd-javascript-sdk 
```

## Example

Create an instance of the SDK:

```bash
const sdk = new SdSdk(); # you can target a different environment, for example: const sdk = new SdSdk('development')
```

Then you can use the different modules to communicate with our APIs. For example, to create a record:

```bash
const sdk = new SdSdk();
const myRecord = await sdk.Records.createRecord({
    token: 'My Token',
    sidedrawerId: '619239517d01feacb5947f63',
    recordTypeName: 'corporateDocs',
    name: 'My Record Name',
    description: 'My Record Description',
    recordSubtypeName: 'will',
    editable: true,
})
```
