// Polyfill global IndexedDB with fake-indexeddb. Importing the /auto
// entry point registers `indexedDB`, `IDBKeyRange`, etc. on globalThis.
import "fake-indexeddb/auto";

import { createIndexedDBDownloadStorage } from "../IndexedDBDownloadStorage";
import type { DownloadSessionMeta } from "../../modules/DownloadSession";

function uniqueDb(): string {
  // Fresh DB per test so suites are isolated without clearing logic.
  return `sd-test-${Math.random().toString(36).slice(2)}`;
}

const baseMeta = (
  sessionId: string,
  userId: string = "u1"
): DownloadSessionMeta => ({
  sessionId,
  userId,
  sidedrawerId: "sd",
  recordId: "rec",
  fileToken: "tok",
  responseType: "blob",
  offset: 0,
  fileSize: 1024,
  createdAt: 1,
  updatedAt: 2,
});

describe("IndexedDBDownloadStorage", () => {
  it("round-trips meta via saveMeta/loadMeta", async () => {
    const storage = createIndexedDBDownloadStorage({ dbName: uniqueDb() });
    await storage.saveMeta("a", baseMeta("a"));
    const meta = await storage.loadMeta("a");
    expect(meta).toMatchObject({
      sessionId: "a",
      sidedrawerId: "sd",
      offset: 0,
    });
  });

  it("returns null for missing meta", async () => {
    const storage = createIndexedDBDownloadStorage({ dbName: uniqueDb() });
    const meta = await storage.loadMeta("nope");
    expect(meta).toBeNull();
  });

  it("persists chunks and loads them sorted by offset", async () => {
    const storage = createIndexedDBDownloadStorage({ dbName: uniqueDb() });
    await storage.saveChunk("a", 200, new Uint8Array([4, 5, 6]));
    await storage.saveChunk("a", 100, new Uint8Array([2, 3]));
    await storage.saveChunk("a", 0, new Uint8Array([0, 1]));
    const chunks = await storage.loadChunks("a");
    expect(chunks.map((c) => c.offset)).toEqual([0, 100, 200]);
    expect(Array.from(chunks[0].data)).toEqual([0, 1]);
    expect(Array.from(chunks[1].data)).toEqual([2, 3]);
    expect(Array.from(chunks[2].data)).toEqual([4, 5, 6]);
  });

  it("isolates chunks across different sessionIds", async () => {
    const storage = createIndexedDBDownloadStorage({ dbName: uniqueDb() });
    await storage.saveChunk("a", 0, new Uint8Array([1]));
    await storage.saveChunk("b", 0, new Uint8Array([2]));
    const a = await storage.loadChunks("a");
    const b = await storage.loadChunks("b");
    expect(Array.from(a[0].data)).toEqual([1]);
    expect(Array.from(b[0].data)).toEqual([2]);
  });

  it("clear removes both meta and chunks for the session", async () => {
    const storage = createIndexedDBDownloadStorage({ dbName: uniqueDb() });
    await storage.saveMeta("a", baseMeta("a"));
    await storage.saveChunk("a", 0, new Uint8Array([1]));
    await storage.saveChunk("a", 10, new Uint8Array([2]));
    await storage.clear("a");
    expect(await storage.loadMeta("a")).toBeNull();
    expect(await storage.loadChunks("a")).toEqual([]);
  });

  it("listSessions returns all persisted metas when called without userId", async () => {
    const storage = createIndexedDBDownloadStorage({ dbName: uniqueDb() });
    await storage.saveMeta("a", baseMeta("a"));
    await storage.saveMeta("b", { ...baseMeta("b"), offset: 999 });
    const all = await storage.listSessions();
    expect(all).toHaveLength(2);
    const byId = new Map(all.map((m) => [m.sessionId, m]));
    expect(byId.get("a")?.offset).toBe(0);
    expect(byId.get("b")?.offset).toBe(999);
  });

  it("listSessions(userId) returns only sessions for that user", async () => {
    const storage = createIndexedDBDownloadStorage({ dbName: uniqueDb() });
    await storage.saveMeta("a", baseMeta("a", "u-alice"));
    await storage.saveMeta("b", baseMeta("b", "u-alice"));
    await storage.saveMeta("c", baseMeta("c", "u-bob"));

    const alice = await storage.listSessions("u-alice");
    expect(alice.map((m) => m.sessionId).sort()).toEqual(["a", "b"]);

    const bob = await storage.listSessions("u-bob");
    expect(bob.map((m) => m.sessionId)).toEqual(["c"]);

    const mallory = await storage.listSessions("u-mallory");
    expect(mallory).toEqual([]);
  });

  it("clearAllForUser removes meta + chunks only for the given user", async () => {
    const storage = createIndexedDBDownloadStorage({ dbName: uniqueDb() });
    await storage.saveMeta("a", baseMeta("a", "u-alice"));
    await storage.saveChunk("a", 0, new Uint8Array([1, 2, 3]));
    await storage.saveChunk("a", 100, new Uint8Array([4, 5, 6]));
    await storage.saveMeta("b", baseMeta("b", "u-alice"));
    await storage.saveChunk("b", 0, new Uint8Array([7, 8]));
    await storage.saveMeta("c", baseMeta("c", "u-bob"));
    await storage.saveChunk("c", 0, new Uint8Array([9]));

    await storage.clearAllForUser("u-alice");

    expect(await storage.loadMeta("a")).toBeNull();
    expect(await storage.loadChunks("a")).toEqual([]);
    expect(await storage.loadMeta("b")).toBeNull();
    expect(await storage.loadChunks("b")).toEqual([]);
    expect(await storage.loadMeta("c")).not.toBeNull();
    expect(await storage.loadChunks("c")).toHaveLength(1);
  });

  it("clearAllForUser is a no-op when no sessions match", async () => {
    const storage = createIndexedDBDownloadStorage({ dbName: uniqueDb() });
    await storage.saveMeta("a", baseMeta("a", "u-alice"));
    await expect(
      storage.clearAllForUser("u-mallory")
    ).resolves.toBeUndefined();
    expect(await storage.loadMeta("a")).not.toBeNull();
  });

  it("clearAllForUser throws when userId is empty", async () => {
    const storage = createIndexedDBDownloadStorage({ dbName: uniqueDb() });
    await expect(storage.clearAllForUser("")).rejects.toThrow(/userId/i);
  });

  it("saveMeta with the same id overwrites", async () => {
    const storage = createIndexedDBDownloadStorage({ dbName: uniqueDb() });
    await storage.saveMeta("a", baseMeta("a"));
    await storage.saveMeta("a", { ...baseMeta("a"), offset: 5000 });
    const loaded = await storage.loadMeta("a");
    expect(loaded?.offset).toBe(5000);
  });

  it("saveChunk clones the input buffer so mutations don't leak", async () => {
    const storage = createIndexedDBDownloadStorage({ dbName: uniqueDb() });
    const buf = new Uint8Array([1, 2, 3]);
    await storage.saveChunk("a", 0, buf);
    // Mutate after save — should not affect the persisted copy.
    buf[0] = 99;
    const chunks = await storage.loadChunks("a");
    expect(Array.from(chunks[0].data)).toEqual([1, 2, 3]);
  });
});
