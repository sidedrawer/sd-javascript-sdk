/**
 * Consumer-style smoke tests for @sidedrawer/sdk (Node CLI).
 * Run against a local mock HTTP server — no real API credentials needed.
 */
import { Buffer } from "node:buffer";
import { webcrypto } from "node:crypto";

import {
  FINALIZE_ID,
  RECORD_ID,
  SIDEDRAWER_ID,
  DOWNLOAD_TOKEN,
  createMockServer,
} from "./mock-api.mjs";

Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  writable: true,
  configurable: true,
});

const { SideDrawer } = await import("@sidedrawer/sdk");

function pass(name) {
  console.log(`PASS: ${name}`);
}

function fail(name, message) {
  throw new Error(`FAIL: ${name} — ${message}`);
}

function createSdk(baseUrl) {
  return new SideDrawer({
    baseUrl,
    accessToken: "smoke-test-token",
  });
}

function generateBlob(sizeInBytes) {
  return new Blob([Buffer.alloc(sizeInBytes)]);
}

async function testRecordsSearch(baseUrl) {
  const sd = createSdk(baseUrl);
  const records = await sd.records.search({
    sidedrawerId: SIDEDRAWER_ID,
    displayInactive: false,
  });

  if (!Array.isArray(records) || records.length === 0) {
    fail("records.search", "expected non-empty array");
  }

  if (records[0].id !== "record-1") {
    fail("records.search", `unexpected record id: ${records[0].id}`);
  }

  pass("records.search");
}

async function testFilesUploadHappyPath(baseUrl) {
  const sd = createSdk(baseUrl);
  const file = generateBlob(9 * 1024 * 1024);

  const result = await sd.files.upload({
    sidedrawerId: SIDEDRAWER_ID,
    recordId: RECORD_ID,
    file,
    fileName: `smoke-${Date.now()}`,
    uploadTitle: "smoke-test.txt",
    fileType: "document",
  });

  if (result?.id !== FINALIZE_ID) {
    fail("files.upload", `expected id "${FINALIZE_ID}", got ${result?.id}`);
  }

  pass("files.upload");
}

async function testFilesDownload(baseUrl) {
  const sd = createSdk(baseUrl);

  const file = await sd.files.download({
    sidedrawerId: SIDEDRAWER_ID,
    recordId: RECORD_ID,
    fileToken: DOWNLOAD_TOKEN,
    responseType: "arraybuffer",
  });

  const byteLength =
    file instanceof ArrayBuffer
      ? file.byteLength
      : Buffer.isBuffer(file)
        ? file.length
        : file?.byteLength ?? 0;

  if (byteLength === 0) {
    fail("files.download", "expected non-empty binary response");
  }

  pass("files.download");
}

async function testFilesUploadAbort(baseUrl) {
  const { server, baseUrl: slowBaseUrl } = await createMockServer({
    slowBlockUploadMs: 2000,
  });

  try {
    const sd = createSdk(slowBaseUrl);
    const file = generateBlob(9 * 1024 * 1024);
    const controller = new AbortController();

    const uploadPromise = sd.files.upload({
      sidedrawerId: SIDEDRAWER_ID,
      recordId: RECORD_ID,
      file,
      fileName: `abort-${Date.now()}`,
      uploadTitle: "abort-test.txt",
      fileType: "document",
      signal: controller.signal,
    });

    setTimeout(() => controller.abort(), 100);

    let caught = false;

    try {
      await uploadPromise;
    } catch (err) {
      caught = true;
      const message = String(err?.message ?? err).toLowerCase();

      if (!/(canceled|cancelled|aborted|close)/.test(message)) {
        fail(
          "files.upload.abort",
          `expected abort-related message, got: ${err?.message ?? err}`
        );
      }
    }

    if (!caught) {
      fail("files.upload.abort", "expected upload to reject after abort");
    }

    pass("files.upload.abort");
  } finally {
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
}

async function testHttpServiceErrorShape(baseUrl) {
  const sd = createSdk(baseUrl);

  try {
    await sd.context.http.get("/api/v2/smoke/trigger-404");
    fail("HttpServiceError.shape", "expected request to fail with 404");
  } catch (err) {
    if (err?.message == null) {
      fail("HttpServiceError.shape", "missing .message");
    }

    if (err?.code == null) {
      fail("HttpServiceError.shape", "missing .code");
    }

    if (err?.request == null) {
      fail("HttpServiceError.shape", "missing .request");
    }

    if (err?.response == null) {
      fail("HttpServiceError.shape", "missing .response");
    }

    if (!String(err.message).includes("404")) {
      fail("HttpServiceError.shape", `message should mention 404: ${err.message}`);
    }
  }

  pass("HttpServiceError.shape");
}

async function main() {
  const { server, baseUrl } = await createMockServer();

  console.log(`Mock API listening at ${baseUrl}`);
  console.log(`SDK version: ${process.env.npm_package_dependencies__sidedrawer_sdk ?? "file:../.."}`);
  console.log("---");

  try {
    await testRecordsSearch(baseUrl);
    await testFilesUploadHappyPath(baseUrl);
    await testFilesDownload(baseUrl);
    await testHttpServiceErrorShape(baseUrl);
    await testFilesUploadAbort(baseUrl);

    console.log("---");
    console.log("All smoke tests passed.");
  } finally {
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
