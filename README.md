# SideDrawer JavaScript SDK

SDK for the SideDrawer API

## Installation

To install the SDK, use:

```bash
npm install -S @sidedrawer/sdk
```

## Examples

### Import SDK

```javascript
import { SideDrawer } from "@sidedrawer/sdk";
```

```javascript
const { SideDrawer } = require("@sidedrawer/sdk");
```

```html
<script type="text/javascript" src="/dist/index.browser.js"></script>
```


### Create an instance of the SDK:

```javascript
const sd = new SideDrawer({
    accessToken: '...'
}); // you can target a different environment, using { baseUrl: 'https://...' }
```

Then you can use the different modules to communicate with our APIs. Examples:


### Search Records

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

### Upload File to Record

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

### Download File from a Record

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

### Create an instance of single SDK module:

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

### Use pagination:

```javascript
records
    .search({
        sidedrawerId: "test",
        name: "test",
        limit: 20
    })
    .subscribe({
        next: (records) => { // Returns up to 20 records per page
            console.log(records);
        },
        complete: () => {
            done();
        },
    });
```

or

```javascript
// It paginates and buffer elements up to a maximum of 100.
const records = await records.search({
    sidedrawerId: "test",
    name: "test",
    limit: 100
}); // 
```