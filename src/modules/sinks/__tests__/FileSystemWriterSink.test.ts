import {
  createFileSystemWriterSink,
  isFileSystemAccessSupported,
} from "../FileSystemWriterSink";
import { NoFileSystemAccessError, ERR_NO_FS_ACCESS } from "../types";

// Provide a minimal `window` shim so the sink's `typeof window` and
// `window.showSaveFilePicker` checks behave as in a browser. We do this
// at the top of the file (and clean up afterEach) instead of using
// jest-environment-jsdom which is not installed in this repo.
beforeAll(() => {
  if (typeof (globalThis as { window?: unknown }).window === "undefined") {
    (globalThis as { window: unknown }).window = globalThis;
  }
});

type WriteCall =
  | { type: "write"; bytes: number }
  | { type: "close" }
  | { type: "abort"; reason?: unknown };

interface FakeWritable {
  write: jest.Mock;
  close: jest.Mock;
  abort: jest.Mock;
}

interface FakeHandle {
  createWritable: jest.Mock;
}

function makeFakeWritable(calls: WriteCall[]): FakeWritable {
  return {
    write: jest.fn((chunk: unknown) => {
      const bytes =
        chunk instanceof Uint8Array ? chunk.byteLength : 0;
      calls.push({ type: "write", bytes });
      return Promise.resolve();
    }),
    close: jest.fn(() => {
      calls.push({ type: "close" });
      return Promise.resolve();
    }),
    abort: jest.fn((reason?: unknown) => {
      calls.push({ type: "abort", reason });
      return Promise.resolve();
    }),
  };
}

function installFakePicker(writable: FakeWritable): jest.Mock {
  const handle: FakeHandle = {
    createWritable: jest.fn(() => Promise.resolve(writable)),
  };
  const picker = jest.fn(() => Promise.resolve(handle));
  (window as unknown as { showSaveFilePicker: unknown }).showSaveFilePicker =
    picker;
  return picker;
}

function uninstallPicker(): void {
  delete (window as unknown as { showSaveFilePicker?: unknown })
    .showSaveFilePicker;
}

describe("FileSystemWriterSink", () => {
  afterEach(() => {
    uninstallPicker();
    jest.restoreAllMocks();
  });

  describe("isFileSystemAccessSupported", () => {
    it("returns false when window.showSaveFilePicker is missing", () => {
      uninstallPicker();
      expect(isFileSystemAccessSupported()).toBe(false);
    });

    it("returns true when window.showSaveFilePicker is a function", () => {
      installFakePicker(makeFakeWritable([]));
      expect(isFileSystemAccessSupported()).toBe(true);
    });
  });

  describe("createFileSystemWriterSink", () => {
    it("throws NoFileSystemAccessError with ERR_NO_FS_ACCESS code when unsupported", async () => {
      uninstallPicker();
      await expect(createFileSystemWriterSink()).rejects.toBeInstanceOf(
        NoFileSystemAccessError
      );
      try {
        await createFileSystemWriterSink();
      } catch (err) {
        expect((err as { code: string }).code).toBe(ERR_NO_FS_ACCESS);
      }
    });

    it("calls the picker with the provided options and opens a writable", async () => {
      const calls: WriteCall[] = [];
      const writable = makeFakeWritable(calls);
      const picker = installFakePicker(writable);

      const sink = await createFileSystemWriterSink({
        suggestedName: "report.zip",
      });

      expect(picker).toHaveBeenCalledWith({ suggestedName: "report.zip" });
      expect(sink).toBeDefined();
    });

    it("forwards chunks to the underlying writable in order", async () => {
      const calls: WriteCall[] = [];
      const writable = makeFakeWritable(calls);
      installFakePicker(writable);

      const sink = await createFileSystemWriterSink();
      const chunkA = new Uint8Array([1, 2, 3]);
      const chunkB = new Uint8Array([4, 5, 6, 7]);
      const chunkC = new Uint8Array([8]);

      // Note: each write returns a chained promise. Fire-and-forget at the
      // caller is intentional — the chain serializes the writes internally.
      void sink.write(chunkA);
      void sink.write(chunkB);
      void sink.write(chunkC);

      await sink.close();

      expect(calls).toEqual([
        { type: "write", bytes: 3 },
        { type: "write", bytes: 4 },
        { type: "write", bytes: 1 },
        { type: "close" },
      ]);
    });

    it("close() awaits in-flight writes before closing the writable", async () => {
      const calls: WriteCall[] = [];
      let releaseFirstWrite: () => void = () => undefined;
      const writable: FakeWritable = {
        write: jest.fn((chunk: unknown) => {
          const bytes = chunk instanceof Uint8Array ? chunk.byteLength : 0;
          if (calls.length === 0) {
            calls.push({ type: "write", bytes });
            // Block the first write until we explicitly release it.
            return new Promise<void>((resolve) => {
              releaseFirstWrite = resolve;
            });
          }
          calls.push({ type: "write", bytes });
          return Promise.resolve();
        }),
        close: jest.fn(() => {
          calls.push({ type: "close" });
          return Promise.resolve();
        }),
        abort: jest.fn(() => Promise.resolve()),
      };
      installFakePicker(writable);

      const sink = await createFileSystemWriterSink();
      void sink.write(new Uint8Array([1]));
      void sink.write(new Uint8Array([2]));

      const closing = sink.close();

      // close() must NOT have happened yet — the first write is still pending.
      await new Promise((r) => setTimeout(r, 10));
      expect(calls).toEqual([{ type: "write", bytes: 1 }]);

      releaseFirstWrite();
      await closing;

      expect(calls).toEqual([
        { type: "write", bytes: 1 },
        { type: "write", bytes: 1 },
        { type: "close" },
      ]);
    });

    it("abort(reason) forwards the reason to the writable and rejects further writes", async () => {
      const calls: WriteCall[] = [];
      const writable = makeFakeWritable(calls);
      installFakePicker(writable);

      const sink = await createFileSystemWriterSink();
      const reason = new Error("user canceled");
      await sink.abort(reason);

      expect(writable.abort).toHaveBeenCalledWith(reason);
      await expect(sink.write(new Uint8Array([9]))).rejects.toThrow(
        /aborted sink/i
      );
    });

    it("close() is a no-op when called after abort()", async () => {
      const calls: WriteCall[] = [];
      const writable = makeFakeWritable(calls);
      installFakePicker(writable);

      const sink = await createFileSystemWriterSink();
      await sink.abort();
      await sink.close();

      expect(writable.close).not.toHaveBeenCalled();
    });

    it("abort() is a no-op when called after close()", async () => {
      const calls: WriteCall[] = [];
      const writable = makeFakeWritable(calls);
      installFakePicker(writable);

      const sink = await createFileSystemWriterSink();
      await sink.close();
      await sink.abort();

      expect(writable.abort).not.toHaveBeenCalled();
    });

    it("swallows writable.abort() failures so the original error wins", async () => {
      const writable: FakeWritable = {
        write: jest.fn(() => Promise.resolve()),
        close: jest.fn(() => Promise.resolve()),
        abort: jest.fn(() => Promise.reject(new Error("boom"))),
      };
      installFakePicker(writable);

      const sink = await createFileSystemWriterSink();
      // Should NOT throw.
      await expect(sink.abort(new Error("primary"))).resolves.toBeUndefined();
    });
  });
});
