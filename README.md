# SideDrawer JavaScript SDK

SDK for the SideDrawer API

## Installation

To install the SDK, use:

```bash
npm install -S @sidedrawer/sdk
```

## Requirements

- **Node.js 18+** (native `fetch` for the HTTP layer)
- Modern browsers with native `fetch` and `XMLHttpRequest` (upload progress)

No consumer code changes are required when upgrading from 0.0.x to 0.1.0.

## Example

Import SDK

```javascript
import { SideDrawer } from "@sidedrawer/sdk";
```

```javascript
const { SideDrawer } = require("@sidedrawer/sdk");
```

```html
<script type="text/javascript" src="/dist/index.browser.js"></script>
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

```typescript
const sd = new SideDrawer({
    accessToken: '...'
});

const controller = new AbortController();
const file = document.querySelector('#file-input').files[0];

const progressSubscriber$ = new rxjs.Subject<number>();

progressSubscriber$.subscribe((progressPercentage: number) => {
    console.log(`Upload progress: ${progressPercentage}`);
});

await sd.files.upload({
  // params
  sidedrawerId: "...",
  recordId: "...",
  file, // Blob or ArrayBuffer
  fileName: "...",
  uploadTitle: "...",
  fileType: "...",
  fileExtension: "..",
  metadata: {
    testKey: "test value",
  },
  externalKeys: [
    { key: "test", value: "test" }
  ],
  progressSubscriber$,
  // options
  signal: controller.signal,
  maxRetries: 2,
  maxConcurrency: 4,
});
```

Upload File to a Smart Forms Request

```typescript
const sd = new SideDrawer({
    accessToken: '...'
});

const controller = new AbortController();
const file = document.querySelector('#file-input').files[0];

const progressSubscriber$ = new rxjs.Subject<number>();

progressSubscriber$.subscribe((progressPercentage: number) => {
    console.log(`Upload progress: ${progressPercentage}`);
});

// End-user / sidedrawer-scoped (e.g. my-web) — recordId required for block upload
await sd.files.uploadToSmartFormRequest({
  sidedrawerId: "...",
  smartFormRequestId: "...",
  smartFormItemId: "...",
  recordId: "...",
  file,
  fileName: "...",
  uploadTitle: "...",
  fileType: "document",
  fileExtension: "pdf",
  progressSubscriber$,
  signal: controller.signal,
  maxRetries: 2,
  maxConcurrency: 4,
});

// Admin-scoped (e.g. console) — omit recordId to use SFR item block upload
await sd.files.uploadToSmartFormRequest({
  smartFormId: "...",
  smartFormRequestId: "...",
  smartFormItemId: "...",
  file,
  fileName: "...",
  uploadTitle: "...",
  fileType: "document",
});
```

Download File from a Record

Browser:

```typescript
const file: Blob = await sd.files.download({
    sidedrawerId: "...",
    recordId: "...",
    fileNameWithExtension: "...",
});

const file: Blob = await sd.files.download({
    sidedrawerId: "...",
    recordId: "...",
    fileToken: "...",
    progressSubscriber$: {
      next: (progressPercentage: number) => {
          console.log(`Download progress: ${progressPercentage}`);
      }
    }
});
```

NodeJs

```typescript
const file: ArrayBuffer = await sd.files.download({
    sidedrawerId: "...",
    recordId: "...",
    fileNameWithExtension: "...",
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
const { SideDrawer } = require("@sidedrawer/sdk");

const context = new SideDrawer.Context({
    accessToken: '...'
});

const records = new SideDrawer.Records(context);
```
