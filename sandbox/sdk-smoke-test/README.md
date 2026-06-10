# SDK Smoke Test

Consumer-style integration tests for `@sidedrawer/sdk`. Uses a local mock HTTP server — no real API credentials required.

This mini-project is the **regression gate** for [SPD-3568](../../.cursor/tasks/SPD-3568.md):

1. **Phase 1 (baseline):** Run against the current SDK build (axios era).
2. **Phase 3 (regression):** Re-run after the axios → fetch migration to confirm parity.

## Prerequisites

- Node.js 18+
- SDK built at repo root (`npm run build`)

## Run (Node CLI)

```bash
# From repo root
npm run build

cd sandbox/sdk-smoke-test
npm install
npm test
```

Expected output: five `PASS:` lines and exit code `0`. See [`BASELINE.md`](BASELINE.md) for the recorded Phase 1 baseline.

## Run (Browser UI)

Starts a local dev server that serves the UI, the SDK UMD bundle, and the mock API on the same origin (no CORS setup needed).

```bash
# From repo root — build SDK first
npm run build

cd sandbox/sdk-smoke-test
npm install
npm run dev
```

Open **http://127.0.0.1:3456** in your browser. Use the UI to:

- Search records
- Upload a file (with progress bar and abort)
- Download a file (with progress bar; triggers a browser “Save as” using the file name field, last uploaded file name, or a generated name)
- Trigger a 404 and inspect `HttpServiceError` fields in the log

Set a custom port with `PORT=8080 npm run dev`.

## Consumer integration notes

### Node

- Import the SDK as a named export: `import { SideDrawer } from '@sidedrawer/sdk'` (the CJS build has no default export).
- On Node 20+, configure `globalThis.crypto` as writable before importing the SDK — see the top of [`smoke-test.mjs`](smoke-test.mjs).
- In Node, `files.download({ responseType: 'arraybuffer' })` returns a `Buffer` via axios (not a bare `ArrayBuffer`).

### Browser

- Load the UMD build: `<script src="/sdk/index.browser.js"></script>`
- Instantiate via `new sidedrawer.SideDrawer({ baseUrl, accessToken })`
- `progressSubscriber$` accepts any object with a `.next(percentage)` method

## Scenarios

| Test | What it verifies |
|------|------------------|
| `records.search` | GET + JSON parsing via SDK HTTP layer |
| `files.upload` | Multi-block upload (9 MB → 3 blocks) + finalize |
| `files.download` | GET binary response as `ArrayBuffer` |
| `HttpServiceError.shape` | 404 errors expose `.message`, `.code`, `.request`, `.response` |
| `files.upload.abort` | `AbortSignal` cancels an in-flight upload |

## Upgrading the linked SDK

After rebuilding the SDK at the repo root:

```bash
cd sandbox/sdk-smoke-test
npm install   # re-resolves file:../.. to the latest dist/
npm test
```

Results should match the Phase 1 baseline recorded in [`BASELINE.md`](BASELINE.md).
