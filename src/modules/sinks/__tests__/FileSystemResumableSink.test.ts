import {
  clearAllResumableSinkHandles,
  clearResumableSinkHandle,
  createFileSystemResumableSink,
  createMemoryResumableSinkHandleStorage,
  isFileSystemResumableSinkSupported,
  listResumableSinkHandles,
  restoreFileSystemResumableSink,
  type ResumableSinkHandleStorage,
} from "../FileSystemResumableSink";
import {
  ERR_PERMISSION_DENIED,
  ERR_RESUMABLE_SINK_NOT_FOUND,
  NoFileSystemAccessError,
  PermissionDeniedError,
  ResumableSinkNotFoundError,
} from "../types";

// Shim global `window` with a minimal stub so the sink's environment
// checks behave like a browser without pulling in jest-environment-jsdom.
beforeAll(() => {
  if (typeof (globalThis as { window?: unknown }).window === "undefined") {
    (globalThis as { window: unknown }).window = globalThis;
  }
});

interface FakeWritable {
  write: jest.Mock;
  seek: jest.Mock;
  close: jest.Mock;
  abort: jest.Mock;
}

interface FakeHandle {
  name: string;
  queryPermission: jest.Mock;
  requestPermission: jest.Mock;
  createWritable: jest.Mock;
}

function makeFakeWritable(): FakeWritable {
  return {
    write: jest.fn(() => Promise.resolve()),
    seek: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve()),
    abort: jest.fn(() => Promise.resolve()),
  };
}

function makeFakeHandle(
  opts: {
    permission?: PermissionState;
    writable?: FakeWritable;
  } = {}
): FakeHandle {
  const writable = opts.writable ?? makeFakeWritable();
  const permission: PermissionState = opts.permission ?? "granted";
  return {
    name: "fake-handle",
    queryPermission: jest.fn(() => Promise.resolve(permission)),
    requestPermission: jest.fn(() => Promise.resolve(permission)),
    createWritable: jest.fn(() => Promise.resolve(writable)),
  };
}

function installPicker(handle: FakeHandle): jest.Mock {
  const picker = jest.fn(() => Promise.resolve(handle));
  (window as unknown as { showSaveFilePicker: unknown }).showSaveFilePicker =
    picker;
  return picker;
}

function uninstallPicker(): void {
  delete (window as unknown as { showSaveFilePicker?: unknown })
    .showSaveFilePicker;
}

describe("FileSystemResumableSink", () => {
  let handleStorage: ResumableSinkHandleStorage;

  beforeEach(() => {
    handleStorage = createMemoryResumableSinkHandleStorage();
  });

  afterEach(() => {
    uninstallPicker();
    jest.restoreAllMocks();
  });

  describe("isFileSystemResumableSinkSupported", () => {
    it("returns false when showSaveFilePicker is missing", () => {
      uninstallPicker();
      expect(isFileSystemResumableSinkSupported()).toBe(false);
    });

    it("returns true when showSaveFilePicker is a function", () => {
      installPicker(makeFakeHandle());
      expect(isFileSystemResumableSinkSupported()).toBe(true);
    });
  });

  describe("createFileSystemResumableSink", () => {
    it("throws NoFileSystemAccessError when unsupported", async () => {
      uninstallPicker();
      await expect(
        createFileSystemResumableSink({ sessionId: "s1", handleStorage })
      ).rejects.toBeInstanceOf(NoFileSystemAccessError);
    });

    it("throws when sessionId is missing", async () => {
      installPicker(makeFakeHandle());
      await expect(
        // @ts-expect-error intentionally missing sessionId
        createFileSystemResumableSink({ handleStorage })
      ).rejects.toThrow(/sessionId/i);
    });

    it("opens the picker with the provided options", async () => {
      const picker = installPicker(makeFakeHandle());
      await createFileSystemResumableSink({
        sessionId: "s1",
        suggestedName: "big.zip",
        startIn: "downloads",
        handleStorage,
      });
      expect(picker).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedName: "big.zip",
          startIn: "downloads",
        })
      );
    });

    it("persists the handle so it can be listed", async () => {
      installPicker(makeFakeHandle());
      await createFileSystemResumableSink({
        sessionId: "session-A",
        suggestedName: "fileA.bin",
        handleStorage,
      });

      const all = await listResumableSinkHandles(handleStorage);
      expect(all).toHaveLength(1);
      expect(all[0].sessionId).toBe("session-A");
      expect(all[0].suggestedName).toBe("fileA.bin");
    });

    it("write pipes bytes to the underlying writable and close commits", async () => {
      const writable = makeFakeWritable();
      installPicker(makeFakeHandle({ writable }));

      const sink = await createFileSystemResumableSink({
        sessionId: "s1",
        handleStorage,
      });

      await sink.write(new Uint8Array([1, 2, 3]));
      await sink.write(new Uint8Array([4, 5]));
      await sink.close();

      expect(writable.write).toHaveBeenCalledTimes(2);
      expect(writable.close).toHaveBeenCalledTimes(1);
    });

    it("close() removes the persisted handle (download finished)", async () => {
      installPicker(makeFakeHandle());
      const sink = await createFileSystemResumableSink({
        sessionId: "session-A",
        handleStorage,
      });
      expect(await listResumableSinkHandles(handleStorage)).toHaveLength(1);

      await sink.close();
      expect(await listResumableSinkHandles(handleStorage)).toHaveLength(0);
    });

    it("abort() removes the persisted handle (canceled download)", async () => {
      installPicker(makeFakeHandle());
      const sink = await createFileSystemResumableSink({
        sessionId: "session-A",
        handleStorage,
      });
      await sink.abort(new Error("user canceled"));
      expect(await listResumableSinkHandles(handleStorage)).toHaveLength(0);
    });

    it("write after abort rejects with a clear error", async () => {
      installPicker(makeFakeHandle());
      const sink = await createFileSystemResumableSink({
        sessionId: "s1",
        handleStorage,
      });
      await sink.abort();
      await expect(sink.write(new Uint8Array([9]))).rejects.toThrow(
        /aborted/i
      );
    });
  });

  describe("restoreFileSystemResumableSink", () => {
    it("throws NoFileSystemAccessError when picker is missing", async () => {
      uninstallPicker();
      await expect(
        restoreFileSystemResumableSink({
          sessionId: "x",
          startOffset: 0,
          handleStorage,
        })
      ).rejects.toBeInstanceOf(NoFileSystemAccessError);
    });

    it("throws ResumableSinkNotFoundError when no handle exists", async () => {
      installPicker(makeFakeHandle());
      await expect(
        restoreFileSystemResumableSink({
          sessionId: "unknown",
          startOffset: 0,
          handleStorage,
        })
      ).rejects.toBeInstanceOf(ResumableSinkNotFoundError);
      try {
        await restoreFileSystemResumableSink({
          sessionId: "unknown",
          startOffset: 0,
          handleStorage,
        });
      } catch (err) {
        expect((err as { code: string }).code).toBe(
          ERR_RESUMABLE_SINK_NOT_FOUND
        );
      }
    });

    it("throws PermissionDeniedError when the user declines re-permission", async () => {
      const handle = makeFakeHandle({ permission: "denied" });
      installPicker(handle);

      await createFileSystemResumableSink({
        sessionId: "session-perm",
        handleStorage,
      });

      await expect(
        restoreFileSystemResumableSink({
          sessionId: "session-perm",
          startOffset: 100,
          handleStorage,
        })
      ).rejects.toBeInstanceOf(PermissionDeniedError);

      try {
        await restoreFileSystemResumableSink({
          sessionId: "session-perm",
          startOffset: 100,
          handleStorage,
        });
      } catch (err) {
        expect((err as { code: string }).code).toBe(ERR_PERMISSION_DENIED);
      }
    });

    it("opens with keepExistingData=true and seeks to startOffset", async () => {
      const writable = makeFakeWritable();
      const handle = makeFakeHandle({
        permission: "granted",
        writable,
      });
      installPicker(handle);

      await createFileSystemResumableSink({
        sessionId: "session-resume",
        handleStorage,
      });

      // Reset call counts so we only observe what restore does.
      handle.createWritable.mockClear();
      writable.seek.mockClear();

      const sink = await restoreFileSystemResumableSink({
        sessionId: "session-resume",
        startOffset: 4096,
        handleStorage,
      });

      expect(handle.createWritable).toHaveBeenCalledWith({
        keepExistingData: true,
      });
      expect(writable.seek).toHaveBeenCalledWith(4096);

      await sink.write(new Uint8Array([1, 2, 3]));
      expect(writable.write).toHaveBeenCalledTimes(1);

      await sink.close();
      expect(await listResumableSinkHandles(handleStorage)).toHaveLength(0);
    });

    it("does NOT seek when startOffset is 0", async () => {
      const writable = makeFakeWritable();
      installPicker(
        makeFakeHandle({
          permission: "granted",
          writable,
        })
      );

      await createFileSystemResumableSink({
        sessionId: "session-zero",
        handleStorage,
      });
      writable.seek.mockClear();

      await restoreFileSystemResumableSink({
        sessionId: "session-zero",
        startOffset: 0,
        handleStorage,
      });
      expect(writable.seek).not.toHaveBeenCalled();
    });

    it("rejects negative or non-finite offsets", async () => {
      installPicker(makeFakeHandle());
      await expect(
        restoreFileSystemResumableSink({
          sessionId: "x",
          startOffset: -1,
          handleStorage,
        })
      ).rejects.toThrow(/startOffset/);
      await expect(
        restoreFileSystemResumableSink({
          sessionId: "x",
          startOffset: Number.NaN,
          handleStorage,
        })
      ).rejects.toThrow(/startOffset/);
    });

    it("skips the prompt when queryPermission already returns 'granted'", async () => {
      const writable = makeFakeWritable();
      const handle = makeFakeHandle({
        permission: "granted",
        writable,
      });
      installPicker(handle);

      await createFileSystemResumableSink({
        sessionId: "session-pre",
        handleStorage,
      });
      handle.queryPermission.mockClear();
      handle.requestPermission.mockClear();

      await restoreFileSystemResumableSink({
        sessionId: "session-pre",
        startOffset: 0,
        handleStorage,
      });

      expect(handle.queryPermission).toHaveBeenCalledTimes(1);
      expect(handle.requestPermission).not.toHaveBeenCalled();
    });
  });

  describe("clearResumableSinkHandle / clearAllResumableSinkHandles", () => {
    it("clearResumableSinkHandle removes a single persisted handle", async () => {
      installPicker(makeFakeHandle());
      await createFileSystemResumableSink({
        sessionId: "a",
        handleStorage,
      });
      installPicker(makeFakeHandle());
      await createFileSystemResumableSink({
        sessionId: "b",
        handleStorage,
      });

      expect(await listResumableSinkHandles(handleStorage)).toHaveLength(2);
      await clearResumableSinkHandle("a", handleStorage);
      const remaining = await listResumableSinkHandles(handleStorage);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].sessionId).toBe("b");
    });

    it("clearAllResumableSinkHandles wipes everything", async () => {
      installPicker(makeFakeHandle());
      await createFileSystemResumableSink({
        sessionId: "a",
        handleStorage,
      });
      installPicker(makeFakeHandle());
      await createFileSystemResumableSink({
        sessionId: "b",
        handleStorage,
      });

      await clearAllResumableSinkHandles(handleStorage);
      expect(await listResumableSinkHandles(handleStorage)).toHaveLength(0);
    });
  });
});
