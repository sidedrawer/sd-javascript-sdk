import { Buffer } from "node:buffer";
import { timeout } from "rxjs";
import FetchHttpService from "../FetchHttpService";
import { SdkProgressEvent } from "../types/HttpRequestConfig";
import nock from "nock";

const BASE_URL = "https://localhost";

afterEach(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.restore();
});

describe("core", () => {
  let fetchHttpService: FetchHttpService;

  it("FetchHttpService.constructor", () => {
    fetchHttpService = new FetchHttpService({
      baseURL: BASE_URL,
    });
  });

  it("FetchHttpService.request", (done) => {
    expect.assertions(3);

    const message = "ok";

    nock(BASE_URL).get("/test").reply(200, { message });

    fetchHttpService
      .request({
        url: "/test",
        method: "GET",
      })
      .subscribe({
        next: (response: any) => {
          expect(response).not.toEqual(undefined);
          expect(response.message).not.toEqual(undefined);
          expect(response.message).toEqual(message);
        },
        complete: () => {
          done();
        },
      });
  }, 1500);

  it("FetchHttpService.get", (done) => {
    expect.assertions(3);

    const message = "ok";

    nock(BASE_URL).get("/test").reply(200, { message });

    fetchHttpService.get("/test").subscribe({
      next: (response: any) => {
        expect(response).not.toEqual(undefined);
        expect(response.message).not.toEqual(undefined);
        expect(response.message).toEqual(message);
      },
      complete: () => {
        done();
      },
    });
  }, 1500);

  it("FetchHttpService.delete", (done) => {
    expect.assertions(3);

    const message = "ok";

    nock(BASE_URL).delete("/test").reply(200, { message });

    fetchHttpService.delete("/test").subscribe({
      next: (response: any) => {
        expect(response).not.toEqual(undefined);
        expect(response.message).not.toEqual(undefined);
        expect(response.message).toEqual(message);
      },
      complete: () => {
        done();
      },
    });
  }, 1500);

  it("FetchHttpService.post", (done) => {
    expect.assertions(6);

    const message = "ok";

    nock(BASE_URL)
      .post("/test", (body) => {
        expect(body).not.toEqual(undefined);
        expect(body.message).not.toEqual(undefined);
        expect(body.message).toEqual(message);

        return true;
      })
      .reply(200, { message });

    fetchHttpService.post("/test", { message }).subscribe({
      next: (response: any) => {
        expect(response).not.toEqual(undefined);
        expect(response.message).not.toEqual(undefined);
        expect(response.message).toEqual(message);
      },
      complete: () => {
        done();
      },
    });
  }, 1500);

  it("FetchHttpService.put", (done) => {
    expect.assertions(6);

    const message = "ok";

    nock(BASE_URL)
      .put("/test", (body) => {
        expect(body).not.toEqual(undefined);
        expect(body.message).not.toEqual(undefined);
        expect(body.message).toEqual(message);

        return true;
      })
      .reply(200, { message });

    fetchHttpService.put("/test", { message }).subscribe({
      next: (response: any) => {
        expect(response).not.toEqual(undefined);
        expect(response.message).not.toEqual(undefined);
        expect(response.message).toEqual(message);
      },
      complete: () => {
        done();
      },
    });
  }, 1500);

  it("FetchHttpService error", (done) => {
    expect.assertions(3);

    nock(BASE_URL).get(`/test`).reply(403, {
      statusCode: 0,
      error: "string",
      message: "string",
    });

    fetchHttpService.get("/test").subscribe({
      error: (err: Error) => {
        expect(err).not.toEqual(undefined);
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("403");

        done();
      },
    });
  });

  it("FetchHttpService abort signal", (done) => {
    expect.assertions(3);

    nock(BASE_URL).get(`/test`).delayConnection(1000).reply(403, {
      statusCode: 0,
      error: "string",
      message: "string",
    });

    const controller = new AbortController();
    const signal = controller.signal;

    fetchHttpService
      .get("/test", {
        signal,
      })
      .subscribe({
        error: (err: Error) => {
          expect(err).not.toEqual(undefined);
          expect(err.message).not.toEqual(undefined);
          expect(err.message.toLowerCase()).toMatch(/abort|cancel/);

          done();
        },
      });

    setTimeout(() => {
      controller.abort();
    }, 100);
  }, 3000);

  it("FetchHttpService timeout from pipe", (done) => {
    expect.assertions(3);

    nock(BASE_URL).get(`/test`).delayConnection(2000).reply(403, {
      statusCode: 0,
      error: "string",
      message: "string",
    });

    fetchHttpService
      .get("/test")
      .pipe(timeout(1000))
      .subscribe({
        error: (err: Error) => {
          expect(err).not.toEqual(undefined);
          expect(err.message).not.toEqual(undefined);
          expect(err.message.toLowerCase()).toContain("timeout");

          done();
        },
      });
  }, 4000);

  // SPD-3781 Phase 0.1: expose status + headers on success responses
  // so callers can detect Range support (206 + Content-Range) without
  // adding a separate HEAD probe.
  it("FetchHttpService.getWithResponse exposes status and headers", (done) => {
    expect.assertions(5);

    nock(BASE_URL)
      .get("/test-meta")
      .reply(206, "partial-body", {
        "Content-Range": "bytes 0-9/100",
        "Content-Length": "10",
        "Accept-Ranges": "bytes",
      });

    fetchHttpService
      .getWithResponse<string>("/test-meta", {
        responseType: "text",
        headers: { Range: "bytes=0-9" },
      })
      .subscribe({
        next: (response) => {
          expect(response.status).toBe(206);
          expect(response.data).toBe("partial-body");
          expect(response.headers["content-range"]).toBe("bytes 0-9/100");
          expect(response.headers["content-length"]).toBe("10");
          expect(response.headers["accept-ranges"]).toBe("bytes");
        },
        complete: () => done(),
      });
  }, 1500);

  it("FetchHttpService.postWithResponse exposes status and headers", (done) => {
    expect.assertions(2);

    nock(BASE_URL)
      .post("/test-meta")
      .reply(201, { ok: true }, { Location: "/created/123" });

    fetchHttpService
      .postWithResponse<{ ok: boolean }>("/test-meta", { foo: "bar" })
      .subscribe({
        next: (response) => {
          expect(response.status).toBe(201);
          expect(response.headers["location"]).toBe("/created/123");
        },
        complete: () => done(),
      });
  }, 1500);

  // SPD-3781 Phase 0.2: stream binary responses (blob / arraybuffer) so
  // onDownloadProgress fires for them, not only for JSON responses.
  it("FetchHttpService streams arraybuffer with download progress", (done) => {
    const totalBytes = 8 * 1024;
    const payload = Buffer.alloc(totalBytes, 0x42);

    nock(BASE_URL).get("/binary").reply(200, payload, {
      "Content-Length": String(totalBytes),
      "Content-Type": "application/octet-stream",
    });

    const progressEvents: SdkProgressEvent[] = [];

    fetchHttpService
      .get<ArrayBuffer | Buffer>("/binary", {
        responseType: "arraybuffer",
        onDownloadProgress: (event) => {
          progressEvents.push(event);
        },
      })
      .subscribe({
        next: (data) => {
          const byteLength =
            data instanceof ArrayBuffer ? data.byteLength : data.length;
          expect(byteLength).toBe(totalBytes);
        },
        complete: () => {
          // Progress fired at least once and final loaded matches totalBytes.
          expect(progressEvents.length).toBeGreaterThan(0);
          const last = progressEvents[progressEvents.length - 1];
          expect(last.loaded).toBe(totalBytes);
          expect(last.total).toBe(totalBytes);
          // Loaded is monotonically non-decreasing.
          for (let i = 1; i < progressEvents.length; i++) {
            expect(progressEvents[i].loaded).toBeGreaterThanOrEqual(
              progressEvents[i - 1].loaded
            );
          }
          done();
        },
      });
  }, 5000);

  it("FetchHttpService streams blob with download progress", (done) => {
    const totalBytes = 4 * 1024;
    const payload = Buffer.alloc(totalBytes, 0x37);

    nock(BASE_URL).get("/binary-blob").reply(200, payload, {
      "Content-Length": String(totalBytes),
      "Content-Type": "image/png",
    });

    const progressEvents: SdkProgressEvent[] = [];

    fetchHttpService
      .get<Blob>("/binary-blob", {
        responseType: "blob",
        onDownloadProgress: (event) => {
          progressEvents.push(event);
        },
      })
      .subscribe({
        next: (data) => {
          expect(typeof Blob !== "undefined" && data instanceof Blob).toBe(
            true
          );
          if (data instanceof Blob) {
            expect(data.size).toBe(totalBytes);
            // Streaming path should preserve the response Content-Type.
            expect(data.type).toBe("image/png");
          }
        },
        complete: () => {
          expect(progressEvents.length).toBeGreaterThan(0);
          expect(progressEvents[progressEvents.length - 1].loaded).toBe(
            totalBytes
          );
          done();
        },
      });
  }, 5000);

  it("FetchHttpService falls back to non-streaming blob when no progress callback", (done) => {
    const totalBytes = 1024;
    const payload = Buffer.alloc(totalBytes, 0x55);

    nock(BASE_URL).get("/blob-no-progress").reply(200, payload, {
      "Content-Type": "application/octet-stream",
    });

    fetchHttpService
      .get<Blob>("/blob-no-progress", { responseType: "blob" })
      .subscribe({
        next: (data) => {
          // Without onDownloadProgress we go through the non-streaming
          // path; the result is still a Blob with the full payload.
          expect(typeof Blob !== "undefined" && data instanceof Blob).toBe(
            true
          );
          if (data instanceof Blob) {
            expect(data.size).toBe(totalBytes);
          }
        },
        complete: () => done(),
      });
  }, 1500);

  it("FetchHttpService streaming handles missing Content-Length", (done) => {
    const totalBytes = 2048;
    const payload = Buffer.alloc(totalBytes, 0x01);

    nock(BASE_URL).get("/no-length").reply(200, payload, {
      "Content-Type": "application/octet-stream",
    });

    const progressEvents: SdkProgressEvent[] = [];

    fetchHttpService
      .get<ArrayBuffer | Buffer>("/no-length", {
        responseType: "arraybuffer",
        onDownloadProgress: (event) => {
          progressEvents.push(event);
        },
      })
      .subscribe({
        next: (data) => {
          const byteLength =
            data instanceof ArrayBuffer ? data.byteLength : data.length;
          expect(byteLength).toBe(totalBytes);
        },
        complete: () => {
          expect(progressEvents.length).toBeGreaterThan(0);
          // total is undefined when Content-Length is missing — consumers
          // should treat progress as "bytes so far, unknown total".
          for (const ev of progressEvents) {
            expect(ev.total).toBeUndefined();
          }
          done();
        },
      });
  }, 5000);

  // SPD-3781 Phase 2: onChunk callback for incremental persistence
  // (downloads -> disk / IndexedDB without buffering the whole file).
  it("FetchHttpService onChunk fires per streamed chunk and bytes match payload", (done) => {
    const totalBytes = 16 * 1024;
    const payload = Buffer.alloc(totalBytes, 0xab);

    nock(BASE_URL).get("/chunked").reply(200, payload, {
      "Content-Length": String(totalBytes),
      "Content-Type": "application/octet-stream",
    });

    const receivedChunks: Uint8Array[] = [];

    fetchHttpService
      .get<ArrayBuffer | Buffer>("/chunked", {
        responseType: "arraybuffer",
        onChunk: (chunk) => {
          receivedChunks.push(chunk);
        },
      })
      .subscribe({
        next: (data) => {
          // Default mode (discardBuffer=false) still returns the full payload.
          const byteLength =
            data instanceof ArrayBuffer ? data.byteLength : data.length;
          expect(byteLength).toBe(totalBytes);
        },
        complete: () => {
          expect(receivedChunks.length).toBeGreaterThan(0);
          const summed = receivedChunks.reduce(
            (acc, c) => acc + c.byteLength,
            0
          );
          expect(summed).toBe(totalBytes);
          // Every byte we received was 0xAB (the payload filler).
          for (const chunk of receivedChunks) {
            for (let i = 0; i < chunk.byteLength; i++) {
              expect(chunk[i]).toBe(0xab);
            }
          }
          done();
        },
      });
  }, 5000);

  it("FetchHttpService discardBuffer streams via onChunk and resolves with null", (done) => {
    const totalBytes = 12 * 1024;
    const payload = Buffer.alloc(totalBytes, 0xcd);

    nock(BASE_URL).get("/streaming-only").reply(200, payload, {
      "Content-Length": String(totalBytes),
      "Content-Type": "application/octet-stream",
    });

    let receivedBytes = 0;

    fetchHttpService
      .get<ArrayBuffer | Buffer | null>("/streaming-only", {
        responseType: "arraybuffer",
        discardBuffer: true,
        onChunk: (chunk) => {
          receivedBytes += chunk.byteLength;
        },
      })
      .subscribe({
        next: (data) => {
          // discardBuffer=true => SDK does NOT accumulate, returns null.
          expect(data).toBeNull();
        },
        complete: () => {
          // Caller saw the full payload via onChunk even though the result is null.
          expect(receivedBytes).toBe(totalBytes);
          done();
        },
      });
  }, 5000);

  it("FetchHttpService forwards Range request header for partial downloads", (done) => {
    const fullBytes = 1024;
    const startOffset = 256;
    const partial = Buffer.alloc(fullBytes - startOffset, 0xee);

    nock(BASE_URL)
      .get("/range")
      .matchHeader("Range", "bytes=256-")
      .reply(206, partial, {
        "Content-Length": String(fullBytes - startOffset),
        "Content-Range": `bytes ${startOffset}-${fullBytes - 1}/${fullBytes}`,
        "Content-Type": "application/octet-stream",
      });

    fetchHttpService
      .getWithResponse<ArrayBuffer | Buffer>("/range", {
        responseType: "arraybuffer",
        headers: { Range: "bytes=256-" },
      })
      .subscribe({
        next: (response) => {
          expect(response.status).toBe(206);
          expect(response.headers["content-range"]).toBe(
            `bytes ${startOffset}-${fullBytes - 1}/${fullBytes}`
          );
          const byteLength =
            response.data instanceof ArrayBuffer
              ? response.data.byteLength
              : response.data.length;
          expect(byteLength).toBe(fullBytes - startOffset);
        },
        complete: () => done(),
      });
  }, 5000);
});
