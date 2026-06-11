import { Buffer } from "node:buffer";

import "../../extensions/global/crypto.node";

import SideDrawer from "../..";
import {
  DownloadSession,
  type DownloadSessionMeta,
  type DownloadSessionStorage,
} from "../DownloadSession";
import Files from "../Files";
import { HttpServiceError } from "../../core/HttpServiceError";
import nock from "nock";
import { firstValueFrom, lastValueFrom, of, Subject, throwError } from "rxjs";

const BASE_URL = "https://localhost";

function generateBlob(sizeInBytes = 1024, type = "application/octet-stream") {
  const buffer = Buffer.alloc(sizeInBytes);
  return new Blob([buffer], { type });
}

afterEach(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.restore();
});

/**
 * In-memory storage adapter for unit tests. Mirrors the IDB contract.
 */
function createMemoryStorage(): DownloadSessionStorage & {
  __debugDump(): { meta: Record<string, DownloadSessionMeta>; chunks: any };
} {
  const meta: Record<string, DownloadSessionMeta> = {};
  const chunks: Record<
    string,
    { offset: number; data: Uint8Array }[]
  > = {};

  return {
    async saveMeta(id, value) {
      meta[id] = { ...value, sessionId: id };
    },
    async loadMeta(id) {
      return meta[id] ?? null;
    },
    async saveChunk(id, offset, chunk) {
      if (!chunks[id]) chunks[id] = [];
      // Clone so caller mutations don't leak.
      const copy = new Uint8Array(chunk.byteLength);
      copy.set(chunk);
      chunks[id].push({ offset, data: copy });
    },
    async loadChunks(id) {
      return [...(chunks[id] ?? [])].sort((a, b) => a.offset - b.offset);
    },
    async clear(id) {
      delete meta[id];
      delete chunks[id];
    },
    async listSessions() {
      return Object.values(meta);
    },
    __debugDump() {
      return { meta, chunks };
    },
  };
}

describe("DownloadSession", () => {
  describe("ID derivation", () => {
    it("derives a deterministic id from sidedrawerId + recordId + fileToken", () => {
      const sd = new SideDrawer({ baseUrl: BASE_URL, accessToken: "t" });
      const a = sd.files.createDownloadSession({
        sidedrawerId: "sd1",
        recordId: "rec1",
        fileToken: "tok1",
      });
      const b = sd.files.createDownloadSession({
        sidedrawerId: "sd1",
        recordId: "rec1",
        fileToken: "tok1",
      });
      expect(a.id).toBe(b.id);
      expect(a.id).toContain("sd1");
      expect(a.id).toContain("rec1");
      expect(a.id).toContain("tok1");
    });

    it("honors a custom sessionId", () => {
      const sd = new SideDrawer({ baseUrl: BASE_URL, accessToken: "t" });
      const s = sd.files.createDownloadSession({
        sidedrawerId: "sd1",
        recordId: "rec1",
        fileToken: "tok1",
        sessionId: "my-custom-id",
      });
      expect(s.id).toBe("my-custom-id");
    });

    it("falls back to fileNameWithExtension when no fileToken", () => {
      const sd = new SideDrawer({ baseUrl: BASE_URL, accessToken: "t" });
      const s = sd.files.createDownloadSession({
        sidedrawerId: "sd1",
        recordId: "rec1",
        fileNameWithExtension: "file.pdf",
      });
      expect(s.id).toContain("file.pdf");
    });
  });

  describe("State machine", () => {
    it("starts in idle and refuses to start from a terminal state", async () => {
      const fakeFiles = { download: () => of(null) } as unknown as Files;
      const session = new DownloadSession(fakeFiles, {
        sidedrawerId: "sd",
        recordId: "rec",
        fileToken: "tok",
      });
      expect(session.getState()).toBe("idle");
      // Drive to completed.
      session.start();
      // Wait one microtask cycle for the promise to resolve.
      await firstValueFrom(session.result$);
      expect(session.getState()).toBe("completed");
      expect(() => session.start()).toThrow(/terminal/i);
    });

    it("emits state transitions idle → running → completed", async () => {
      const fakeFiles = {
        download: () => of(generateBlob(100)),
      } as unknown as Files;
      const session = new DownloadSession(fakeFiles, {
        sidedrawerId: "sd",
        recordId: "rec",
        fileToken: "tok",
      });
      const states: string[] = [];
      session.state$.subscribe((s) => states.push(s));
      session.start();
      await firstValueFrom(session.result$);
      expect(states).toEqual(["idle", "running", "completed"]);
    });

    it("cancel from running transitions to canceled and clears storage", async () => {
      // Use a download that never completes so we control the transition.
      const neverEnding = new Subject<Blob>();
      const fakeFiles = {
        download: () => neverEnding.asObservable(),
      } as unknown as Files;
      const storage = createMemoryStorage();
      await storage.saveMeta("custom", {
        sessionId: "custom",
        sidedrawerId: "sd",
        recordId: "rec",
        fileToken: "tok",
        offset: 1234,
        createdAt: 1,
        updatedAt: 1,
      });
      const session = new DownloadSession(fakeFiles, {
        sidedrawerId: "sd",
        recordId: "rec",
        fileToken: "tok",
        sessionId: "custom",
        storage,
      });
      session.start();
      // Wait one tick so the runAttempt promise reads storage and flips to running.
      await new Promise<void>((r) => setTimeout(r, 0));
      expect(session.getState()).toBe("running");
      session.cancel();
      expect(session.getState()).toBe("canceled");
      // Storage cleanup happens asynchronously.
      await new Promise<void>((r) => setTimeout(r, 0));
      expect(await storage.loadMeta("custom")).toBeNull();
    });

    it("pause + resume keeps offset and emits state transitions", async () => {
      // First attempt: emits a chunk, then waits for the signal to abort.
      // Second attempt: starts from resumeFrom=50, emits more, completes.
      let attempts = 0;
      const fakeFiles = {
        download: (params: any) => {
          attempts += 1;
          if (attempts === 1) {
            // Emit chunk synchronously via microtask; then return an
            // observable that only errors when the caller aborts.
            queueMicrotask(() => {
              params.onChunk?.(new Uint8Array(50), 0);
            });
            return new Subject<Blob>().asObservable().pipe(
              // Wire the abort signal: when consumer calls signal.abort,
              // emit a Cancel error so runAttempt's catch fires.
              (source) =>
                new (require("rxjs").Observable)((subscriber: any) => {
                  const sub = source.subscribe(subscriber);
                  const signal: AbortSignal = params.signal;
                  const onAbort = () => {
                    const err = new HttpServiceError("aborted");
                    (err as any).code = "ERR_CANCELED";
                    subscriber.error(err);
                  };
                  signal.addEventListener("abort", onAbort);
                  return () => {
                    signal.removeEventListener("abort", onAbort);
                    sub.unsubscribe();
                  };
                })
            );
          }
          // Second attempt — must start from the byte we paused at.
          expect(params.resumeFrom).toBe(50);
          queueMicrotask(() => {
            params.onChunk?.(new Uint8Array(30), 50);
          });
          return of(null);
        },
      } as unknown as Files;
      const storage = createMemoryStorage();
      const session = new DownloadSession(fakeFiles, {
        sidedrawerId: "sd",
        recordId: "rec",
        fileToken: "tok",
        responseType: "arraybuffer",
        storage,
      });
      const states: string[] = [];
      session.state$.subscribe((s) => states.push(s));

      session.start();
      // Let the first chunk land + meta save flush before we pause.
      await new Promise<void>((r) => setTimeout(r, 20));
      expect(session.getProgress().offset).toBe(50);

      session.pause();
      expect(session.getState()).toBe("paused");
      // Give the catch handler a turn so any state cleanup completes.
      await new Promise<void>((r) => setTimeout(r, 5));
      expect(session.getState()).toBe("paused");

      session.resume();
      const result = (await firstValueFrom(
        session.result$
      )) as ArrayBuffer | null;
      expect(result).not.toBeNull();
      expect((result as ArrayBuffer).byteLength).toBe(80);
      expect(session.getState()).toBe("completed");
      expect(states).toContain("paused");
      expect(states).toContain("completed");
    });
  });

  describe("Storage integration", () => {
    it("persists chunks via storage and reassembles on completion", async () => {
      const fakeFiles = {
        download: (params: any) => {
          // Stream 3 chunks then complete with null (discardBuffer mode).
          queueMicrotask(() => {
            params.onChunk?.(new Uint8Array([1, 2, 3]), 0);
            params.onChunk?.(new Uint8Array([4, 5, 6]), 3);
            params.onChunk?.(new Uint8Array([7, 8, 9]), 6);
          });
          return of(null);
        },
      } as unknown as Files;
      const storage = createMemoryStorage();
      const session = new DownloadSession(fakeFiles, {
        sidedrawerId: "sd",
        recordId: "rec",
        fileToken: "tok",
        responseType: "arraybuffer",
        storage,
      });
      session.start();
      const result = (await firstValueFrom(
        session.result$
      )) as ArrayBuffer | null;
      expect(result).not.toBeNull();
      const view = new Uint8Array(result as ArrayBuffer);
      expect(Array.from(view)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      // Storage cleared after completion.
      expect(await storage.loadMeta(session.id)).toBeNull();
      expect(await storage.loadChunks(session.id)).toEqual([]);
    });

    it("restoreDownloadSession recreates a session from storage", async () => {
      const sd = new SideDrawer({ baseUrl: BASE_URL, accessToken: "t" });
      const storage = createMemoryStorage();
      await storage.saveMeta("persisted-id", {
        sessionId: "persisted-id",
        sidedrawerId: "sdX",
        recordId: "recX",
        fileToken: "tokX",
        responseType: "blob",
        offset: 1024,
        fileSize: 10240,
        createdAt: 1,
        updatedAt: 2,
      });

      const restored = await sd.files.restoreDownloadSession("persisted-id", {
        storage,
      });
      expect(restored).not.toBeNull();
      expect(restored!.id).toBe("persisted-id");
      expect(restored!.getState()).toBe("idle");
    });

    it("restoreDownloadSession returns null when meta missing", async () => {
      const sd = new SideDrawer({ baseUrl: BASE_URL, accessToken: "t" });
      const storage = createMemoryStorage();
      const restored = await sd.files.restoreDownloadSession("nope", { storage });
      expect(restored).toBeNull();
    });

    it("listPendingDownloads surfaces persisted sessions", async () => {
      const sd = new SideDrawer({ baseUrl: BASE_URL, accessToken: "t" });
      const storage = createMemoryStorage();
      await storage.saveMeta("a", {
        sessionId: "a",
        sidedrawerId: "sd",
        recordId: "rec1",
        fileToken: "t1",
        offset: 100,
        createdAt: 1,
        updatedAt: 1,
      });
      await storage.saveMeta("b", {
        sessionId: "b",
        sidedrawerId: "sd",
        recordId: "rec2",
        fileToken: "t2",
        offset: 200,
        createdAt: 1,
        updatedAt: 1,
      });
      const pending = await sd.files.listPendingDownloads(storage);
      expect(pending).toHaveLength(2);
      expect(pending.map((p) => p.sessionId).sort()).toEqual(["a", "b"]);
    });
  });

  describe("Error handling", () => {
    it("propagates non-cancel errors through result$ and marks failed", async () => {
      const boom = new Error("network down");
      const fakeFiles = {
        download: () => throwError(() => boom),
      } as unknown as Files;
      const session = new DownloadSession(fakeFiles, {
        sidedrawerId: "sd",
        recordId: "rec",
        fileToken: "tok",
      });
      session.start();
      await expect(lastValueFrom(session.result$)).rejects.toBe(boom);
      expect(session.getState()).toBe("failed");
    });
  });

  describe("Integration with real download()", () => {
    it("downloads a file end-to-end via the SDK with no storage", (done) => {
      const sd = new SideDrawer({ baseUrl: BASE_URL, accessToken: "t" });

      nock(BASE_URL)
        .get(
          `/api/v2/record-files/sidedrawer/sidedrawer-id/sd1/records/record-id/rec1/record-files/tok1`
        )
        .reply(200, () => generateBlob(2 * 1024));

      const session = sd.files.createDownloadSession({
        sidedrawerId: "sd1",
        recordId: "rec1",
        fileToken: "tok1",
        responseType: "blob",
      });

      session.result$.subscribe({
        next: (blob) => {
          expect(blob).not.toBeNull();
          expect(session.getState()).toBe("completed");
          done();
        },
        error: (err) => done(err),
      });

      session.start();
    });
  });
});
