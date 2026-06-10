# Phase 1 Baseline — SDK 0.0.17 (axios)

Recorded on 2026-06-01 against `@sidedrawer/sdk@0.0.17` before the axios → fetch migration.

## Environment

- Node.js v24.13.0
- Command: `npm run build && cd sandbox/sdk-smoke-test && npm install && npm test`

## Output

```
Mock API listening at http://127.0.0.1:62491
SDK version: file:../..
---
PASS: records.search
PASS: files.upload
PASS: files.download
PASS: HttpServiceError.shape
PASS: files.upload.abort
---
All smoke tests passed.
```

Exit code: `0`

## Notes

- `files.download` with `responseType: "arraybuffer"` returns a Node `Buffer` (axios behaviour), not a bare `ArrayBuffer`. The smoke test accepts either.
- Node 20+ requires pre-configuring `globalThis.crypto` as writable before importing the SDK (see `smoke-test.mjs`). The SDK assigns `webcrypto` on import via `crypto.node.ts`.
- Import `SideDrawer` as a **named export** (`import { SideDrawer } from '@sidedrawer/sdk'`), not default — the CJS build has no `default` export.

## Phase 3 regression gate

After the migration, re-run the same command. All five `PASS:` lines must appear and exit code must remain `0`.
