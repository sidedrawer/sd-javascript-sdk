# SideDrawer JavaScript SDK

SDK for the SideDrawer API

## Installation

To install the SDK, use:

```bash
npm install -S @sidedrawer/sdk
```

## Example

Import SDK

```bash
import SideDrawer from "@sidedrawer/sdk";
```

```bash
const SideDrawer = require("@sidedrawer/sdk");
```

Create an instance of the SDK:

```bash
const sd = new SideDrawer({
    accessToken: '...'
}); # you can target a different environment, using { baseUrl: 'https://...' }
```

Then you can use the different modules to communicate with our APIs. For example, to search records:

```bash
const sd = new SideDrawer({
    accessToken: '...'
});

const records = await sd.records.search({
    sidedrawerId: '...',
    displayInactive: false,
    locale: 'en-US'
});
```

Create an instance of single SDK module:

```bash
import { Context, Records } from "@sidedrawer/sdk";

const context = new Context({
    accessToken: '...'
});

const records = new Records(context);
```

or

```bash
const SideDrawer = require("@sidedrawer/sdk");

const context = new SideDrawer.Context({
    accessToken: '...'
});

const records = new SideDrawer.Records(context);
```
