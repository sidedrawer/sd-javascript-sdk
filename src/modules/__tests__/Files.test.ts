import { Buffer } from 'node:buffer';

import SideDrawer from "../..";
import nock from "nock";

function generateBlob(sizeInBytes = 1024, type = "application/octet-stream") {
  const buffer = Buffer.alloc(sizeInBytes);
  const blob = new Blob([buffer], { type });

  return blob;
}

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
      expect.assertions(6);

      const file = generateBlob(1024 * 1024 * 9);

      nock(BASE_URL)
        .post(
          `/api/v2/blocks/sidedrawer/sidedrawer-id/test/records/record-id/test/upload`
        )
        .query({
          order: 2,
        })
        .delay(1000)
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
        .delay(1000)
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
        .delay(1000)
        .reply(200, () => {
          return {
            id: "test",
          };
        });

      sd.files.upload({
        sidedrawerId: "test",
        recordId: "test",
        file,
        fileName: Date.now().toString(),
        uploadTitle: "test.txt",
        fileType: "document",
        metadata: {
          testKey: "test value"
        }
      }).subscribe({
        next: (uploadResult: any) => {
          expect(uploadResult).not.toBe(undefined);
          expect(uploadResult.id).toBe("test");
        },
        complete: () => {
          done();
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

      sd.files.upload({
        sidedrawerId: "test",
        recordId: "test",
        file,
        fileName: Date.now().toString(),
        uploadTitle: "test.txt",
        fileType: "document",
      }).subscribe({
        next: (uploadResult: any) => {
          console.log({ uploadResult });
        },
        error: (err: Error) => {
          expect(err).not.toBe(undefined);
          expect(err.message).toContain("403");

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

      sd.files.upload({
        sidedrawerId: "test",
        recordId: "test",
        file,
        fileName: Date.now().toString(),
        uploadTitle: "test.txt",
        fileType: "document",
      }).subscribe({
        next: (uploadResult: any) => {
          console.log({ uploadResult });
        },
        error: (err: Error) => {
          expect(err).not.toBe(undefined);
          expect(err.message).toContain("401");

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

    sd.files.upload({
      sidedrawerId: "test",
      recordId: "test",
      file,
      fileName: Date.now().toString(),
      uploadTitle: "test.txt",
      fileType: "document",
      signal,
    }).subscribe({
      error: (err: Error) => {
        expect(err).not.toBe(undefined);
        expect(err.message).toContain("canceled");
      },
    });

    setTimeout(() => {
      controller.abort();
    }, 100);
  }, 3000);

  it("Files.upload fail required param", () => {
    expect.assertions(2);

    try {
      sd.files.upload({
        // @ts-ignore
        sidedrawerId: undefined,
        recordId: "",
        // @ts-ignore
        file: undefined,
        fileName: "",
        uploadTitle: "",
        fileType: "document"
      });
    } catch (err: any) {
      expect(err).not.toBe(undefined);
      expect(err.message).toContain("required");
    }
  });
});
