import { Buffer } from "node:buffer";

import "../../extensions/global/crypto.node";

import SideDrawer, {
  ERR_FILE_TOO_LARGE,
  ERR_PAYLOAD_TOO_LARGE,
  FileTooLargeError,
  FileUploadOptions,
  FileUploadParams,
} from "../..";
import { HttpServiceError } from "../../core/HttpService";
import nock from "nock";
import { Subject } from "rxjs";

function generateBlob(sizeInBytes = 1024, type = "application/octet-stream") {
  const buffer = Buffer.alloc(sizeInBytes);
  const blob = new Blob([buffer], { type });

  return blob;
}

class File extends Blob {
  name: string;
  constructor(a: any, name: string) {
    super(a);
    this.name = name;
  }
}

// @ts-ignore
globalThis.File = File;

const BASE_URL = "https://localhost";

afterEach(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.restore();
});

describe("Files", () => {
  const sd: SideDrawer = new SideDrawer({
    baseUrl: BASE_URL,
    accessToken: "test",
  });

  // The upload preflight calls `/api/v1/subscriptions/features/sidedrawer-id/{id}`
  // before chunking. For tests that aren't about the preflight, stub the
  // endpoint with an empty features payload so `getMaxUploadMBs` returns
  // `null` and the preflight is a no-op. Preflight-specific tests below
  // call `nock.cleanAll()` and register their own mock.
  beforeEach(() => {
    nock(BASE_URL)
      .persist()
      .get(/\/api\/v1\/subscriptions\/features\/sidedrawer-id\//)
      .reply(200, {});
  });

  it(
    "Files.upload",
    (done) => {
      expect.assertions(10);

      const file = generateBlob(1024 * 1024 * 9);

      nock(BASE_URL)
        .post(
          `/api/v2/blocks/sidedrawer/sidedrawer-id/test/records/record-id/test/upload`
        )
        .query({
          order: 2,
        })
        .delay({ head: 500, body: 500 })
        .reply(403, (urlString) => {
          expect(urlString).not.toBe(undefined);

          return {};
        });

      nock(BASE_URL)
        .post(
          `/api/v2/blocks/sidedrawer/sidedrawer-id/test/records/record-id/test/upload`
        )
        .query((actualQueryObject) => {
          return actualQueryObject.order != null;
        })
        .delay({ head: 500, body: 500 })
        .times(3)
        .reply(200, function (urlString) {
          expect(urlString).not.toBe(undefined);

          const url = new URL(`${BASE_URL}${urlString}`);
          const order: any = url.searchParams.get("order");

          return {
            hash: Date.now().toString(),
            order: parseInt(order),
          };
        });

      nock(BASE_URL)
        .post(
          `/api/v2/record-files/sidedrawer/sidedrawer-id/test/records/record-id/test/record-files`
        )
        .query((actualQueryObject) => {
          return (
            actualQueryObject.fileName != null &&
            actualQueryObject.uploadTitle != null &&
            actualQueryObject.fileType != null
          );
        })
        .delay({ head: 500, body: 500 })
        .reply(200, () => {
          return {
            id: "test",
          };
        });

      const progressSubscriber$ = new Subject<number>();

      progressSubscriber$.subscribe((progressPercentage: number) => {
        expect(progressPercentage).not.toBe(undefined);
      });

      sd.files
        .upload({
          sidedrawerId: "test",
          recordId: "test",
          file,
          fileName: Date.now().toString(),
          uploadTitle: "test.txt",
          fileType: "document",
          metadata: {
            testKey: "test value",
          },
          externalKeys: [{ key: "test", value: "test" }],
          progressSubscriber$,
        })
        .subscribe({
          next: (uploadResult: any) => {
            expect(uploadResult).not.toBe(undefined);
            expect(uploadResult.id).toBe("test");
          },
          complete: () => {
            done();
          },
          error: (e) => {
            console.log("Files > Files.upload", e);
          },
        });
    },
    1000 * 13
  );

  it(
    "Files.upload fail",
    (done) => {
      expect.assertions(13);

      const file = generateBlob(4 * 1024 * 1024 * 9);

      nock(BASE_URL)
        .post(
          `/api/v2/blocks/sidedrawer/sidedrawer-id/test/records/record-id/test/upload`
        )
        .query((actualQueryObject) => {
          return actualQueryObject.order != null;
        })
        .delay(1000)
        .times(8)
        .reply(200, (urlString) => {
          expect(urlString).not.toBe(undefined);

          const url = new URL(`${BASE_URL}${urlString}`);
          const order: any = url.searchParams.get("order");

          return {
            hash: Date.now().toString(),
            order: parseInt(order),
          };
        });

      nock(BASE_URL)
        .post(
          `/api/v2/blocks/sidedrawer/sidedrawer-id/test/records/record-id/test/upload`
        )
        .query(() => {
          return true;
        })
        .delay(1000)
        .times(3)
        .reply(403, (url) => {
          expect(url).not.toBe(undefined);

          return {};
        });

      sd.files
        .upload({
          sidedrawerId: "test",
          recordId: "test",
          file,
          fileName: Date.now().toString(),
          uploadTitle: "test.txt",
          fileType: "document",
        })
        .subscribe({
          next: (uploadResult: any) => {
            console.log({ uploadResult });
          },
          error: (err: Error) => {
            expect(err).not.toBe(undefined);
            expect(err.message).toMatch(/403|close/);

            done();
          },
        });
    },
    1000 * 14
  );

  it(
    "Files.upload fail 2",
    (done) => {
      expect.assertions(13);

      const file = generateBlob(4 * 1024 * 1024 * 9);

      nock(BASE_URL)
        .post(
          `/api/v2/blocks/sidedrawer/sidedrawer-id/test/records/record-id/test/upload`
        )
        .query((actualQueryObject) => {
          return (
            actualQueryObject.order != null && actualQueryObject.order !== "3"
          );
        })
        .delay(1000)
        .times(4)
        .reply(200, (urlString) => {
          expect(urlString).not.toBe(undefined);

          const url = new URL(`${BASE_URL}${urlString}`);
          const order: any = url.searchParams.get("order");

          return {
            hash: Date.now().toString(),
            order: parseInt(order),
          };
        });

      nock(BASE_URL)
        .post(
          `/api/v2/blocks/sidedrawer/sidedrawer-id/test/records/record-id/test/upload`
        )
        .query((actualQueryObject) => {
          return actualQueryObject.order === "3";
        })
        .delay(1000)
        .times(3)
        .reply(401, (url) => {
          expect(url).not.toBe(undefined);

          return { statusCode: 401, message: "Unauthorized" };
        });

      nock(BASE_URL)
        .post(
          `/api/v2/blocks/sidedrawer/sidedrawer-id/test/records/record-id/test/upload`
        )
        .query((actualQueryObject) => {
          return actualQueryObject.order != null;
        })
        .delay(1000)
        .times(4)
        .reply(200, (urlString) => {
          expect(urlString).not.toBe(undefined);

          const url = new URL(`${BASE_URL}${urlString}`);
          const order: any = url.searchParams.get("order");

          return {
            hash: Date.now().toString(),
            order: parseInt(order),
          };
        });

      sd.files
        .upload({
          sidedrawerId: "test",
          recordId: "test",
          file,
          fileName: Date.now().toString(),
          uploadTitle: "test.txt",
          fileType: "document",
        })
        .subscribe({
          next: (uploadResult: any) => {
            console.log({ uploadResult });
          },
          error: (err: Error) => {
            expect(err).not.toBe(undefined);
            expect(err.message).toMatch(/401|close/);

            done();
          },
        });
    },
    1000 * 14
  );

  it("Files.upload abort", (done) => {
    expect.assertions(3);

    const file = generateBlob(4 * 1024 * 1024 * 2);

    nock(BASE_URL)
      .post(
        `/api/v2/blocks/sidedrawer/sidedrawer-id/test/records/record-id/test/upload`
      )
      .query(() => {
        return true;
      })
      .delayConnection(1000)
      .times(2)
      .reply(204);

    const controller = new AbortController();
    const signal = controller.signal;

    signal.addEventListener("abort", () => {
      expect(signal.aborted).toBe(true);
    });

    sd.files
      .upload({
        sidedrawerId: "test",
        recordId: "test",
        file,
        fileName: Date.now().toString(),
        uploadTitle: "test.txt",
        fileType: "document",
        signal,
      })
      .subscribe({
        error: (err: Error) => {
          expect(err).not.toBe(undefined);
          expect(err.message).toMatch(/canceled|cancelled|close|abort/i);

          done();
        },
      });

    setTimeout(() => {
      controller.abort();
    }, 100);
  }, 3000);

  it("Files.upload fail emitBlock", (done) => {
    expect.assertions(2);

    const file = generateBlob(4 * 1024 * 1024 * 2);

    // @ts-ignore
    file.slice = undefined;

    sd.files
      .upload({
        sidedrawerId: "test",
        recordId: "test",
        file,
        fileName: Date.now().toString(),
        uploadTitle: "test.txt",
        fileType: "document",
      })
      .subscribe({
        error: (err: Error) => {
          expect(err).not.toBe(undefined);
          expect(err.message).toMatch(/slice/);

          done();
        },
      });
  });

  it("Files.upload fail required params", () => {
    const file = generateBlob(4 * 1024 * 1024 * 2);

    const params: FileUploadParams & Partial<FileUploadOptions> = {
      sidedrawerId: "test",
      recordId: "test",
      file,
      fileName: Date.now().toString(),
      uploadTitle: "test.txt",
      fileType: "document",
    };

    const requiredParams = [
      "sidedrawerId",
      "recordId",
      "file",
      "fileName",
      "uploadTitle",
      "fileType",
    ];

    expect.assertions(requiredParams.length * 3);

    for (let i = 0; i < requiredParams.length; i++) {
      const param = requiredParams[i];

      const controller = new AbortController();
      const signal = controller.signal;

      try {
        sd.files.upload({
          ...params,
          [param]: undefined,
          signal,
        });
      } catch (err: any) {
        expect(err).not.toBe(undefined);
        expect(err.message).toContain("required");
        expect(err.message).toContain(param);
      }

      controller.abort();
    }
  });

  it("Files.download fail required params", () => {
    const params = {
      sidedrawerId: "test",
      recordId: "test",
    };

    const requiredParams = ["sidedrawerId", "recordId"];

    expect.assertions(requiredParams.length * 3);

    for (let i = 0; i < requiredParams.length; i++) {
      const param = requiredParams[i];

      try {
        sd.files.download({
          ...params,
          [param]: undefined,
        });
      } catch (err: any) {
        expect(err).not.toBe(undefined);
        expect(err.message).toContain("required");
        expect(err.message).toContain(param);
      }
    }
  });

  it("Files.download fail required fileNameWithExtension or fileToken", () => {
    expect.assertions(4);

    try {
      sd.files.download({
        sidedrawerId: "test",
        recordId: "test",
      });
    } catch (err: any) {
      expect(err).not.toBe(undefined);
      expect(err.message).toContain("required");
      expect(err.message).toContain("fileNameWithExtension");
      expect(err.message).toContain("fileToken");
    }
  });

  it(
    "Files.download with fileNameWithExtension",
    (done) => {
      expect.assertions(3);

      nock(BASE_URL)
        .get(
          `/api/v1/record-files/sidedrawer/sidedrawer-id/test/records/record-id/test/record-files/test`
        )
        .delay({ head: 500, body: 500 })
        .reply(200, function (urlString) {
          expect(urlString).not.toBe(undefined);

          return generateBlob(40 * 1024 * 1024 * 2);
        });

      const progressSubscriber$ = new Subject<number>();

      progressSubscriber$.subscribe((progressPercentage: number) => {
        expect(progressPercentage).not.toBe(undefined);
      });

      sd.files
        .download({
          sidedrawerId: "test",
          recordId: "test",
          fileNameWithExtension: "test",
          progressSubscriber$,
        })
        .subscribe({
          next: (file: Blob | ArrayBuffer | null) => {
            expect(file).not.toBe(undefined);
            expect(file).toBeInstanceOf(Buffer);
          },
          complete: () => {
            done();
          },
        });
    },
    1000 * 5
  );

  it(
    "Files.download with fileToken",
    (done) => {
      expect.assertions(3);

      nock(BASE_URL)
        .get(
          `/api/v2/record-files/sidedrawer/sidedrawer-id/test/records/record-id/test/record-files/test`
        )
        .delay({ head: 500, body: 500 })
        .reply(200, function (urlString) {
          expect(urlString).not.toBe(undefined);

          return generateBlob(4 * 1024 * 1024 * 2);
        });

      sd.files
        .download({
          sidedrawerId: "test",
          recordId: "test",
          fileToken: "test",
        })
        .subscribe({
          next: (file: Blob | ArrayBuffer | null) => {
            expect(file).not.toBe(undefined);
            expect(file).toBeInstanceOf(Buffer);
          },
          complete: () => {
            done();
          },
        });
    },
    1000 * 5
  );

  it(
    "Files.download with fileToken priority",
    (done) => {
      expect.assertions(3);

      nock(BASE_URL)
        .get(
          `/api/v2/record-files/sidedrawer/sidedrawer-id/test/records/record-id/test/record-files/test`
        )
        .delay({ head: 500, body: 500 })
        .reply(200, function (urlString) {
          expect(urlString).not.toBe(undefined);

          return generateBlob(4 * 1024 * 1024 * 2);
        });

      sd.files
        .download({
          sidedrawerId: "test",
          recordId: "test",
          fileToken: "test",
          fileNameWithExtension: "testbad"
        })
        .subscribe({
          next: (file: Blob | ArrayBuffer | null) => {
            expect(file).not.toBe(undefined);
            expect(file).toBeInstanceOf(Buffer);
          },
          complete: () => {
            done();
          },
        });
    },
    1000 * 5
  );

  it(
    "Files.download with fileNameWithExtension browser",
    (done) => {
      expect.assertions(3);

      process.env.NODE_ENV = "browser";

      nock(BASE_URL)
        .get(
          `/api/v1/record-files/sidedrawer/sidedrawer-id/test/records/record-id/test/record-files/test`
        )
        .delay({ head: 500, body: 500 })
        .reply(200, function (urlString) {
          expect(urlString).not.toBe(undefined);

          return generateBlob(4 * 1024 * 1024 * 2);
        });

      sd.files
        .download({
          sidedrawerId: "test",
          recordId: "test",
          fileNameWithExtension: "test",
        })
        .subscribe({
          next: (file: Blob | ArrayBuffer | null) => {
            expect(file).not.toBe(undefined);
            expect(file).not.toBeInstanceOf(Buffer);
          },
          complete: () => {
            done();
          },
        });
    },
    1000 * 5
  );

  it(
    "Files.download with fileToken browser",
    (done) => {
      expect.assertions(3);

      process.env.NODE_ENV = "browser";

      nock(BASE_URL)
        .get(
          `/api/v2/record-files/sidedrawer/sidedrawer-id/test/records/record-id/test/record-files/test`
        )
        .delay({ head: 500, body: 500 })
        .reply(200, function (urlString) {
          expect(urlString).not.toBe(undefined);

          return generateBlob(4 * 1024 * 1024 * 2);
        });

      sd.files
        .download({
          sidedrawerId: "test",
          recordId: "test",
          fileToken: "test",
        })
        .subscribe({
          next: (file: Blob | ArrayBuffer | null) => {
            expect(file).not.toBe(undefined);
            expect(file).not.toBeInstanceOf(Buffer);
          },
          complete: () => {
            done();
          },
        });
    },
    1000 * 5
  );

  // SPD-3781: preflight size validation. The SDK no longer accepts a
  // caller-provided limit — it fetches the SideDrawer's
  // `sidedrawer.maxUploadMBs` from
  // `/api/v1/subscriptions/features/sidedrawer-id/{id}` (cached in memory
  // for 5 minutes) and fails fast if the file exceeds it. Callers can opt
  // out of the entire preflight with `skipSizeCheck: true`.
  describe("Files.upload preflight (subscription features)", () => {
    const baseParams = {
      sidedrawerId: "preflight-sd",
      recordId: "preflight-rec",
      fileName: "preflight-test",
      uploadTitle: "preflight.bin",
      fileType: "document" as const,
    };

    // Use a fresh SDK instance per test so the SubscriptionFeatures
    // in-memory cache cannot leak between cases.
    let preflightSd: SideDrawer;

    beforeEach(() => {
      // Drop the generic empty-features stub the outer describe sets up;
      // these tests register their own per-case mocks.
      nock.cleanAll();
      preflightSd = new SideDrawer({
        baseUrl: BASE_URL,
        accessToken: "test",
      });
    });

    it("throws FileTooLargeError when the file exceeds the subscription limit", (done) => {
      nock(BASE_URL)
        .get(
          "/api/v1/subscriptions/features/sidedrawer-id/preflight-sd"
        )
        .reply(200, { "sidedrawer.maxUploadMBs": "10" });

      const file = generateBlob(11 * 1024 * 1024); // 11 MB > 10 MB limit

      preflightSd.files
        .upload({ ...baseParams, file })
        .subscribe({
          next: () => {
            done(new Error("Upload should have been rejected by preflight"));
          },
          error: (err: unknown) => {
            expect(err).toBeInstanceOf(FileTooLargeError);
            const e = err as FileTooLargeError;
            expect(e.code).toBe(ERR_FILE_TOO_LARGE);
            expect(e.fileSizeBytes).toBe(11 * 1024 * 1024);
            expect(e.maxBytes).toBe(10 * 1024 * 1024);
            expect(e.message).toMatch(/11\.00 MB/);
            expect(e.message).toMatch(/10\.00 MB/);
            done();
          },
        });
    });

    it("skips the features fetch entirely when skipSizeCheck: true", (done) => {
      // Register the features endpoint with a scope; if `skipSizeCheck`
      // works, this scope should NOT be consumed. We assert that explicitly.
      const featuresScope = nock(BASE_URL)
        .get(
          "/api/v1/subscriptions/features/sidedrawer-id/preflight-sd"
        )
        .reply(200, { "sidedrawer.maxUploadMBs": "10" });

      // Big file (would be rejected if the preflight ran).
      const file = generateBlob(50 * 1024 * 1024);

      // We don't care what the upload itself does — we only need to
      // observe whether the preflight kicked in. The upload pipeline
      // will fail downstream (no nock for /blocks/...), which is fine.
      preflightSd.files
        .upload({ ...baseParams, file, skipSizeCheck: true })
        .subscribe({
          next: () => {
            // Should never reach success (no upload mocks).
          },
          error: (err: unknown) => {
            // Whatever the downstream failure is, it must NOT be the
            // preflight error.
            expect(err).not.toBeInstanceOf(FileTooLargeError);
            expect(featuresScope.isDone()).toBe(false); // never called
            done();
          },
          complete: () => {
            expect(featuresScope.isDone()).toBe(false);
            done();
          },
        });
    });

    it("fails open when the features endpoint errors", (done) => {
      // Subscription features endpoint blows up — the SDK must log a
      // warning and let the upload proceed. The backend remains the
      // authoritative gate (it would reject at finalize with 409 if the
      // file is actually too big).
      nock(BASE_URL)
        .get(
          "/api/v1/subscriptions/features/sidedrawer-id/preflight-sd"
        )
        .reply(500, { error: "boom" });

      // Silence the expected warning so the test output stays clean.
      const warnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);

      const file = generateBlob(50 * 1024 * 1024); // would be > any limit

      preflightSd.files
        .upload({ ...baseParams, file })
        .subscribe({
          next: () => {
            // ignore
          },
          error: (err: unknown) => {
            // Must NOT be the preflight error: fail-open is honoured.
            expect(err).not.toBeInstanceOf(FileTooLargeError);
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
            done();
          },
          complete: () => {
            warnSpy.mockRestore();
            done();
          },
        });
    });

    it("treats a missing / zero / unparseable maxUploadMBs as no limit", (done) => {
      // Features endpoint responds but without the key (or with garbage)
      // → SDK treats it as "no limit" and lets the upload through.
      nock(BASE_URL)
        .get(
          "/api/v1/subscriptions/features/sidedrawer-id/preflight-sd"
        )
        .reply(200, { "sidedrawer.maxUploadMBs": "0" });

      const file = generateBlob(50 * 1024 * 1024);

      preflightSd.files
        .upload({ ...baseParams, file })
        .subscribe({
          next: () => {
            // ignore
          },
          error: (err: unknown) => {
            expect(err).not.toBeInstanceOf(FileTooLargeError);
            done();
          },
          complete: () => done(),
        });
    });

    it("caches features per sidedrawerId across uploads (single GET for N uploads)", async () => {
      // Mock the features endpoint exactly ONCE. If the cache works,
      // both upload preflights will resolve from cache after the first.
      const featuresScope = nock(BASE_URL)
        .get(
          "/api/v1/subscriptions/features/sidedrawer-id/preflight-sd"
        )
        .once()
        .reply(200, { "sidedrawer.maxUploadMBs": "10" });

      // Both files exceed the limit → both must fail with FileTooLargeError,
      // but only the FIRST one should hit the features endpoint.
      const file = generateBlob(11 * 1024 * 1024);

      const expectTooLarge = (sd: SideDrawer) =>
        new Promise<void>((resolve, reject) => {
          sd.files.upload({ ...baseParams, file }).subscribe({
            next: () => reject(new Error("expected FileTooLargeError")),
            error: (err: unknown) => {
              if (err instanceof FileTooLargeError) resolve();
              else reject(err);
            },
          });
        });

      await expectTooLarge(preflightSd);
      await expectTooLarge(preflightSd);

      expect(featuresScope.isDone()).toBe(true);
      // Pending mocks list would be non-empty if the SDK had hit the
      // endpoint twice and tried to re-consume a non-existent stub.
      expect(nock.pendingMocks()).toEqual([]);
    });
  });

  // SPD-3781 Phase 1.5: enrich the finalize-step error so consumers
  // can branch on err.code === ERR_PAYLOAD_TOO_LARGE regardless of the
  // (currently wrong) HTTP status code the backend returns (409).
  it(
    "Files.upload finalize 409 payload_too_large surfaces ERR_PAYLOAD_TOO_LARGE",
    (done) => {
      const file = generateBlob(1 * 1024 * 1024 + 1024); // 2 blocks

      // Each block goes 200 — the issue only surfaces at finalize.
      nock(BASE_URL)
        .post(
          `/api/v2/blocks/sidedrawer/sidedrawer-id/test/records/record-id/test/upload`
        )
        .query(true)
        .times(2)
        .reply(200, (uri) => {
          const url = new URL(`${BASE_URL}${uri}`);
          const order = parseInt(
            url.searchParams.get("order") as string,
            10
          );
          return { hash: `hash-${order}`, order };
        });

      // Finalize replies with the exact shape the UAT backend returns
      // for files larger than subscriptionFeatures.sidedrawer.maxUploadMBs:
      // HTTP 409 + body { statusCode: 409, message: "payload_too_large", error: "conflict_exception" }.
      nock(BASE_URL)
        .post(
          `/api/v2/record-files/sidedrawer/sidedrawer-id/test/records/record-id/test/record-files`
        )
        .query(true)
        .reply(409, {
          statusCode: 409,
          message: "payload_too_large",
          error: "conflict_exception",
        });

      sd.files
        .upload({
          sidedrawerId: "test",
          recordId: "test",
          file,
          fileName: "browser-test",
          uploadTitle: "big.bin",
          fileType: "document",
          maxChunkSizeBytes: 1024 * 1024,
        })
        .subscribe({
          next: () => {
            // Should not reach success.
            expect(true).toBe(false);
          },
          error: (err: unknown) => {
            expect(err).toBeInstanceOf(HttpServiceError);
            const e = err as HttpServiceError & {
              response?: { status?: number; data?: { message?: string } };
            };
            expect(e.code).toBe(ERR_PAYLOAD_TOO_LARGE);
            expect(e.message).toMatch(/payload_too_large/);
            // The original response body is preserved so the consumer
            // can still read the backend's exact wording if needed.
            expect(e.response?.status).toBe(409);
            expect(e.response?.data?.message).toBe("payload_too_large");
            done();
          },
        });
    },
    1000 * 10
  );

  it(
    "Files.download with fileNameWithExtension arraybuffer",
    (done) => {
      expect.assertions(3);

      nock(BASE_URL)
        .get(
          `/api/v1/record-files/sidedrawer/sidedrawer-id/test/records/record-id/test/record-files/test`
        )
        .delay({ head: 500, body: 500 })
        .reply(200, function (urlString) {
          expect(urlString).not.toBe(undefined);

          return generateBlob(4 * 1024 * 1024 * 2);
        });

      sd.files
        .download({
          sidedrawerId: "test",
          recordId: "test",
          fileNameWithExtension: "test",
          responseType: "arraybuffer",
        })
        .subscribe({
          next: (file: Blob | ArrayBuffer | null) => {
            expect(file).not.toBe(undefined);
            expect(file).toBeInstanceOf(Buffer);
          },
          complete: () => {
            done();
          },
        });
    },
    1000 * 5
  );

  // SPD-3781 Phase 2: resumable downloads via HTTP Range + onChunk callback.

  it("Files.download throws synchronously when discardBuffer=true without onChunk", () => {
    expect(() =>
      sd.files.download({
        sidedrawerId: "test",
        recordId: "test",
        fileToken: "tk",
        discardBuffer: true,
      })
    ).toThrow(/discardBuffer.*requires.*onChunk/i);
  });

  it("Files.download throws synchronously for negative resumeFrom", () => {
    expect(() =>
      sd.files.download({
        sidedrawerId: "test",
        recordId: "test",
        fileToken: "tk",
        resumeFrom: -1,
      })
    ).toThrow(/invalid resumeFrom/i);
  });

  it("Files.download sends Range header when resumeFrom > 0", (done) => {
    expect.assertions(2);

    const totalBytes = 4 * 1024;
    const startOffset = 1024;
    const partial = Buffer.alloc(totalBytes - startOffset, 0x11);

    nock(BASE_URL)
      .get(
        `/api/v2/record-files/sidedrawer/sidedrawer-id/test/records/record-id/test/record-files/tk-resume`
      )
      .matchHeader("Range", `bytes=${startOffset}-`)
      .reply(206, partial, {
        "Content-Length": String(totalBytes - startOffset),
        "Content-Range": `bytes ${startOffset}-${totalBytes - 1}/${totalBytes}`,
        "Content-Type": "application/octet-stream",
      });

    sd.files
      .download({
        sidedrawerId: "test",
        recordId: "test",
        fileToken: "tk-resume",
        responseType: "arraybuffer",
        resumeFrom: startOffset,
      })
      .subscribe({
        next: (data) => {
          expect(data).not.toBe(null);
          let byteLength = 0;
          if (data instanceof ArrayBuffer) {
            byteLength = data.byteLength;
          } else if (Buffer.isBuffer(data)) {
            byteLength = data.length;
          } else if (data instanceof Blob) {
            byteLength = data.size;
          }
          expect(byteLength).toBe(totalBytes - startOffset);
        },
        complete: () => done(),
      });
  }, 5000);

  it("Files.download onChunk receives absolute offsets relative to original file", (done) => {
    expect.assertions(2);

    const totalBytes = 8 * 1024;
    const startOffset = 2048;
    const partial = Buffer.alloc(totalBytes - startOffset, 0x22);

    nock(BASE_URL)
      .get(
        `/api/v2/record-files/sidedrawer/sidedrawer-id/test/records/record-id/test/record-files/tk-chunked`
      )
      .matchHeader("Range", `bytes=${startOffset}-`)
      .reply(206, partial, {
        "Content-Length": String(totalBytes - startOffset),
        "Content-Type": "application/octet-stream",
      });

    const seenOffsets: number[] = [];
    let totalSeen = 0;

    sd.files
      .download({
        sidedrawerId: "test",
        recordId: "test",
        fileToken: "tk-chunked",
        responseType: "arraybuffer",
        resumeFrom: startOffset,
        onChunk: (chunk, offsetFromStart) => {
          seenOffsets.push(offsetFromStart);
          totalSeen += chunk.byteLength;
        },
      })
      .subscribe({
        complete: () => {
          // First chunk should report the resumeFrom offset, not 0.
          expect(seenOffsets[0]).toBe(startOffset);
          // Sum of all chunks equals the partial payload length.
          expect(totalSeen).toBe(totalBytes - startOffset);
          done();
        },
      });
  }, 5000);

  it("Files.download with discardBuffer streams via onChunk and resolves with null", (done) => {
    expect.assertions(2);

    const totalBytes = 6 * 1024;
    const payload = Buffer.alloc(totalBytes, 0x33);

    nock(BASE_URL)
      .get(
        `/api/v2/record-files/sidedrawer/sidedrawer-id/test/records/record-id/test/record-files/tk-discard`
      )
      .reply(200, payload, {
        "Content-Length": String(totalBytes),
        "Content-Type": "application/octet-stream",
      });

    let received = 0;

    sd.files
      .download({
        sidedrawerId: "test",
        recordId: "test",
        fileToken: "tk-discard",
        responseType: "arraybuffer",
        discardBuffer: true,
        onChunk: (chunk) => {
          received += chunk.byteLength;
        },
      })
      .subscribe({
        next: (data) => {
          expect(data).toBeNull();
        },
        complete: () => {
          expect(received).toBe(totalBytes);
          done();
        },
      });
  }, 5000);
});
