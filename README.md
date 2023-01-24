# SideDrawer JavaScript SDK

SDK for the SideDrawer API

## Installation

To install the SDK, use:

```bash
npm install -S @sidedrawer/sdk
```

## Example

Import SDK

```javascript
import SideDrawer from "@sidedrawer/sdk";
```

```javascript
const SideDrawer = require("@sidedrawer/sdk");
```

Create an instance of the SDK:

```javascript
const sd = new SideDrawer({
    accessToken: '...'
}); // you can target a different environment, using { baseUrl: 'https://...' }
```

Then you can use the different modules to communicate with our APIs. Examples:

Search Records

```javascript
const sd = new SideDrawer({
    accessToken: '...'
});

const records = await sd.records.search({
    sidedrawerId: '...',
    displayInactive: false,
    locale: 'en-US'
});
```

Upload File to Record

```javascript
const sd = new SideDrawer({
    accessToken: '...'
});

const controller = new AbortController();
const file = document.querySelector('#file-input').files[0];

await sd.files.upload({
  sidedrawerId: "...",
  recordId: "...",
  file,
  fileName: "...",
  uploadTitle: "...",
  fileType: "...",
  fileExtension: "..",
  signal: controller.signal,
  maxRetries: 1,
  maxConcurrency: 1
});
```

Create an instance of single SDK module:

```javascript
import { Context, Records } from "@sidedrawer/sdk";

const context = new Context({
    accessToken: '...'
});

const records = new Records(context);
```

or

```javascript
const SideDrawer = require("@sidedrawer/sdk");

const context = new SideDrawer.Context({
    accessToken: '...'
});

const records = new SideDrawer.Records(context);
```
