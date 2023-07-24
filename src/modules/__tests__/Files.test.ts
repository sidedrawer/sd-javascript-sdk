import { Buffer } from "node:buffer";

import "../../extensions/global/crypto.node";

import SideDrawer, { FileUploadOptions, FileUploadParams } from "../..";
import nock from "nock";
import { Subject } from "rxjs";
import { IncomingMessage } from "node:http";

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

  it("Files.upload fail 2", (done) => {
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

      done();
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
          expect(err.message).toMatch(/canceled|close/);
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
          `/api/v2/record-files/sidedrawer/sidedrawer-id/test/records/record-id/test/record-files/recordfile-name/test`
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
          next: (file: Blob | ArrayBuffer | ReadableStream) => {
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
          next: (file: Blob | ArrayBuffer | ReadableStream) => {
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
      expect.assertions(4);

      process.env.NODE_ENV = "browser";

      nock(BASE_URL)
        .get(
          `/api/v2/record-files/sidedrawer/sidedrawer-id/test/records/record-id/test/record-files/recordfile-name/test`
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
          next: (file: Blob | ArrayBuffer | ReadableStream) => {
            expect(file).not.toBe(undefined);
            expect(file).not.toBeInstanceOf(Buffer);
            expect(file).not.toBeInstanceOf(IncomingMessage);
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
      expect.assertions(4);

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
          next: (file: Blob | ArrayBuffer | ReadableStream) => {
            expect(file).not.toBe(undefined);
            expect(file).not.toBeInstanceOf(Buffer);
            expect(file).not.toBeInstanceOf(IncomingMessage);
          },
          complete: () => {
            done();
          },
        });
    },
    1000 * 5
  );

  it(
    "Files.download with fileNameWithExtension arraybuffer",
    (done) => {
      expect.assertions(3);

      nock(BASE_URL)
        .get(
          `/api/v2/record-files/sidedrawer/sidedrawer-id/test/records/record-id/test/record-files/recordfile-name/test`
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
          next: (file: Blob | ArrayBuffer | ReadableStream) => {
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
    "Files.download with fileNameWithExtension stream",
    (done) => {
      expect.assertions(3);

      nock(BASE_URL)
        .get(
          `/api/v2/record-files/sidedrawer/sidedrawer-id/test/records/record-id/test/record-files/recordfile-name/test`
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
          responseType: "stream",
        })
        .subscribe({
          next: (file: Blob | ArrayBuffer | ReadableStream) => {
            expect(file).not.toBe(undefined);
            expect(file).toBeInstanceOf(IncomingMessage);
          },
          complete: () => {
            done();
          },
        });
    },
    1000 * 5
  );
});
