import { Buffer } from "node:buffer";

import "../../extensions/global/crypto.node";

import SideDrawer, {
  ERR_FILE_TOO_LARGE,
  ERR_PAYLOAD_TOO_LARGE,
  ERR_TOO_MANY_BLOCKS,
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

  describe("Files.upload preflight (consumer-supplied maxUploadMBs)", () => {
    const baseParams = {
      sidedrawerId: "preflight-sd",
      recordId: "preflight-rec",
      fileName: "preflight-test",
      uploadTitle: "preflight.bin",
      fileType: "document" as const,
    };

    let preflightSd: SideDrawer;

    beforeEach(() => {
      nock.cleanAll();
      preflightSd = new SideDrawer({
        baseUrl: BASE_URL,
        accessToken: "test",
      });
    });

    it("throws FileTooLargeError when the file exceeds the consumer-supplied limit", (done) => {
      const file = generateBlob(11 * 1024 * 1024); // 11 MB > 10 MB limit

      preflightSd.files
        .upload({ ...baseParams, file, maxUploadMBs: 10 })
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
            expect(nock.pendingMocks()).toEqual([]);
            done();
          },
        });
    });

    it("does NOT throw when the file is within the consumer-supplied limit", () => {
      const file = generateBlob(5 * 1024 * 1024);
      // The upload itself isn't mocked here; we only want to assert
      // that the preflight does not reject synchronously. We just
      // subscribe-and-immediately-unsubscribe to keep the test fast.
      const sub = preflightSd.files
        .upload({ ...baseParams, file, maxUploadMBs: 10 })
        .subscribe({
          error: (err: unknown) => {
            // If anything errors, it MUST not be FileTooLargeError.
            expect(err).not.toBeInstanceOf(FileTooLargeError);
          },
        });
      sub.unsubscribe();
    });

    it("skips the check entirely when skipSizeCheck: true (even with a tiny limit)", () => {
      const file = generateBlob(50 * 1024 * 1024);
      const sub = preflightSd.files
        .upload({
          ...baseParams,
          file,
          maxUploadMBs: 1,
          skipSizeCheck: true,
        })
        .subscribe({
          error: (err: unknown) => {
            expect(err).not.toBeInstanceOf(FileTooLargeError);
          },
        });
      sub.unsubscribe();
    });

    it("does nothing when maxUploadMBs is not provided (no fetch, no check)", () => {
      const file = generateBlob(500 * 1024 * 1024);
      const sub = preflightSd.files
        .upload({ ...baseParams, file })
        .subscribe({
          error: (err: unknown) => {
            expect(err).not.toBeInstanceOf(FileTooLargeError);
          },
        });
      sub.unsubscribe();
      // No outbound HTTP for features/anything related to preflight.
      expect(nock.pendingMocks()).toEqual([]);
    });

    it("treats zero / negative / NaN / Infinity maxUploadMBs as no limit", () => {
      const file = generateBlob(50 * 1024 * 1024);

      for (const badValue of [0, -1, NaN, Infinity]) {
        const sub = preflightSd.files
          .upload({ ...baseParams, file, maxUploadMBs: badValue })
          .subscribe({
            error: (err: unknown) => {
              expect(err).not.toBeInstanceOf(FileTooLargeError);
            },
          });
        sub.unsubscribe();
      }
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
    "Files.upload finalize 409 cant_upload_block surfaces ERR_TOO_MANY_BLOCKS",
    (done) => {
      const file = generateBlob(1 * 1024 * 1024 + 1024); // 2 blocks

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

      nock(BASE_URL)
        .post(
          `/api/v2/record-files/sidedrawer/sidedrawer-id/test/records/record-id/test/record-files`
        )
        .query(true)
        .reply(409, {
          statusCode: 409,
          message: "cant_upload_block",
          error: "conflict_exception",
        });

      sd.files
        .upload({
          sidedrawerId: "test",
          recordId: "test",
          file,
          fileName: "browser-test",
          uploadTitle: "many-blocks.bin",
          fileType: "document",
          maxChunkSizeBytes: 1024 * 1024,
        })
        .subscribe({
          next: () => {
            expect(true).toBe(false);
          },
          error: (err: unknown) => {
            expect(err).toBeInstanceOf(HttpServiceError);
            const e = err as HttpServiceError & {
              response?: { status?: number; data?: { message?: string } };
            };
            expect(e.code).toBe(ERR_TOO_MANY_BLOCKS);
            expect(e.message).toMatch(/cant_upload_block/);
            expect(e.message).toMatch(/maxChunkSizeBytes/);
            expect(e.response?.status).toBe(409);
            expect(e.response?.data?.message).toBe("cant_upload_block");
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

  describe("Files.download with sink", () => {
    const downloadPath =
      "/api/v2/record-files/sidedrawer/sidedrawer-id/sd-sink/records/record-id/rec-sink/record-files/tok-sink";

    function makeRecordingSink() {
      const writes: Uint8Array[] = [];
      let closed = false;
      let aborted = false;
      let abortReason: unknown = undefined;
      return {
        sink: {
          write(chunk: Uint8Array) {
            writes.push(chunk);
          },
          async close() {
            closed = true;
          },
          async abort(reason?: unknown) {
            aborted = true;
            abortReason = reason;
          },
        },
        snapshot: () => ({ writes, closed, aborted, abortReason }),
      };
    }

    it(
      "pipes every network chunk through sink.write and calls sink.close() on completion",
      (done) => {
        const payload = Buffer.from("hello sink world");
        nock(BASE_URL)
          .get(downloadPath)
          .reply(200, payload, {
            "Content-Type": "application/octet-stream",
            "Content-Length": String(payload.byteLength),
          });

        const { sink, snapshot } = makeRecordingSink();

        sd.files
          .download({
            sidedrawerId: "sd-sink",
            recordId: "rec-sink",
            fileToken: "tok-sink",
            responseType: "arraybuffer",
            sink,
          })
          .subscribe({
            next: (result) => {
              // With sink, discardBuffer is forced on → result is null.
              expect(result).toBeNull();
            },
            error: (err) => done(err),
            complete: () => {
              const snap = snapshot();
              expect(snap.closed).toBe(true);
              expect(snap.aborted).toBe(false);
              const total = snap.writes.reduce(
                (acc, c) => acc + c.byteLength,
                0
              );
              expect(total).toBe(payload.byteLength);
              done();
            },
          });
      },
      5000
    );

    it(
      "calls sink.abort(error) when the download fails",
      (done) => {
        nock(BASE_URL)
          .get(downloadPath)
          .reply(500, "boom");

        const { sink, snapshot } = makeRecordingSink();

        sd.files
          .download({
            sidedrawerId: "sd-sink",
            recordId: "rec-sink",
            fileToken: "tok-sink",
            responseType: "arraybuffer",
            sink,
          })
          .subscribe({
            next: () => done(new Error("should not emit on a 500")),
            error: (err) => {
              const snap = snapshot();
              expect(snap.aborted).toBe(true);
              expect(snap.closed).toBe(false);
              expect(snap.abortReason).toBeDefined();
              expect(err).toBeDefined();
              done();
            },
          });
      },
      5000
    );

    it(
      "still invokes the user-provided onChunk in addition to sink.write",
      (done) => {
        const payload = Buffer.from("compose me");
        nock(BASE_URL)
          .get(downloadPath)
          .reply(200, payload, {
            "Content-Type": "application/octet-stream",
            "Content-Length": String(payload.byteLength),
          });

        const { sink, snapshot } = makeRecordingSink();
        let onChunkBytes = 0;

        sd.files
          .download({
            sidedrawerId: "sd-sink",
            recordId: "rec-sink",
            fileToken: "tok-sink",
            responseType: "arraybuffer",
            sink,
            onChunk: (chunk) => {
              onChunkBytes += chunk.byteLength;
            },
          })
          .subscribe({
            error: (err) => done(err),
            complete: () => {
              expect(onChunkBytes).toBe(payload.byteLength);
              const sinkBytes = snapshot().writes.reduce(
                (acc, c) => acc + c.byteLength,
                0
              );
              expect(sinkBytes).toBe(payload.byteLength);
              done();
            },
          });
      },
      5000
    );
  });

  describe("Files.downloadByUrl", () => {
    it("rejects when url is missing or not a string", () => {
      expect(() =>
        sd.files.downloadByUrl(undefined as unknown as string)
      ).toThrow();
      expect(() => sd.files.downloadByUrl("")).toThrow();
    });

    it(
      "performs a GET against the provided URL and resolves with the response",
      (done) => {
        const payload = Buffer.from("zip bytes here");
        nock(BASE_URL)
          .get("/api/v2/exports/zip/xyz")
          .reply(200, payload, {
            "Content-Type": "application/zip",
            "Content-Length": String(payload.byteLength),
          });

        sd.files
          .downloadByUrl("/api/v2/exports/zip/xyz", {
            responseType: "arraybuffer",
          })
          .subscribe({
            next: (result) => {
              expect(result).toBeDefined();
              if (result instanceof Buffer) {
                expect(result.byteLength).toBe(payload.byteLength);
              }
            },
            error: (err) => done(err),
            complete: () => done(),
          });
      },
      5000
    );

    it(
      "supports a sink: pipes chunks and closes on completion",
      (done) => {
        const payload = Buffer.from("zip-streamed-bytes");
        nock(BASE_URL)
          .get("/api/v2/exports/zip/xyz")
          .reply(200, payload, {
            "Content-Type": "application/zip",
            "Content-Length": String(payload.byteLength),
          });

        const writes: Uint8Array[] = [];
        let closed = false;

        sd.files
          .downloadByUrl("/api/v2/exports/zip/xyz", {
            responseType: "arraybuffer",
            sink: {
              write: (c) => {
                writes.push(c);
              },
              close: async () => {
                closed = true;
              },
              abort: async () => undefined,
            },
          })
          .subscribe({
            error: (err) => done(err),
            complete: () => {
              const total = writes.reduce((acc, c) => acc + c.byteLength, 0);
              expect(total).toBe(payload.byteLength);
              expect(closed).toBe(true);
              done();
            },
          });
      },
      5000
    );
  });
});
