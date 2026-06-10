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

  // SPD-3781 Phase 1.5: preflight size validation. The SDK fails fast
  // synchronously when the caller supplies maxUploadMBs (read from the
  // SideDrawer subscription features) and the file exceeds it, instead
  // of uploading every block and being rejected at finalize with HTTP 409.
  describe("Files.upload preflight maxUploadMBs", () => {
    const baseParams = {
      sidedrawerId: "test",
      recordId: "test",
      fileName: "preflight-test",
      uploadTitle: "preflight.bin",
      fileType: "document" as const,
    };

    it("throws FileTooLargeError when file.size exceeds maxUploadMBs", () => {
      const file = generateBlob(11 * 1024 * 1024); // 11 MB
      let caught: unknown;
      try {
        sd.files.upload({
          ...baseParams,
          file,
          maxUploadMBs: 10, // mimics subscriptionFeatures.sidedrawer.maxUploadMBs
        });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(FileTooLargeError);
      const e = caught as FileTooLargeError;
      expect(e.code).toBe(ERR_FILE_TOO_LARGE);
      expect(e.fileSizeBytes).toBe(11 * 1024 * 1024);
      expect(e.maxBytes).toBe(10 * 1024 * 1024);
      // Message must include both sizes so the consumer can render
      // something useful without re-parsing the error.
      expect(e.message).toMatch(/11\.00 MB/);
      expect(e.message).toMatch(/10\.00 MB/);
    });

    it("does not throw when file.size is within maxUploadMBs", () => {
      const file = generateBlob(2 * 1024 * 1024); // 2 MB
      // No subscribe → no network call. We only assert the sync path
      // does not throw and returns an Observable to the caller.
      expect(() => {
        sd.files.upload({
          ...baseParams,
          file,
          maxUploadMBs: 10,
        });
      }).not.toThrow();
    });

    it("does not throw when maxUploadMBs is omitted, even for big files", () => {
      const file = generateBlob(50 * 1024 * 1024); // 50 MB
      expect(() => {
        sd.files.upload({
          ...baseParams,
          file,
          // no maxUploadMBs → backwards-compatible behaviour, the SDK
          // skips the preflight and lets the backend decide.
        });
      }).not.toThrow();
    });

    it("treats maxUploadMBs === 0 as disabled", () => {
      // 0 disables the check on purpose: it would otherwise reject
      // every non-empty file, which is never what a caller wants when
      // the subscription value happens to be missing/zero.
      const file = generateBlob(50 * 1024 * 1024);
      expect(() => {
        sd.files.upload({
          ...baseParams,
          file,
          maxUploadMBs: 0,
        });
      }).not.toThrow();
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
