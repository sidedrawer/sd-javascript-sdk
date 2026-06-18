import {
  DownloadSink,
  NoFileSystemAccessError,
} from "./types";

export interface FileSystemWriterSinkOptions {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
  excludeAcceptAllOption?: boolean;
  startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
}

interface MinimalFileSystemFileHandle {
  createWritable(options?: {
    keepExistingData?: boolean;
  }): Promise<MinimalFileSystemWritable>;
}

interface MinimalFileSystemWritable {
  write(chunk: BufferSource | Blob | string): Promise<void>;
  close(): Promise<void>;
  abort(reason?: unknown): Promise<void>;
}

interface ShowSaveFilePickerWindow {
  showSaveFilePicker(
    options?: FileSystemWriterSinkOptions
  ): Promise<MinimalFileSystemFileHandle>;
}

export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as ShowSaveFilePickerWindow)
      .showSaveFilePicker === "function"
  );
}

export async function createFileSystemWriterSink(
  options?: FileSystemWriterSinkOptions
): Promise<DownloadSink> {
  if (!isFileSystemAccessSupported()) {
    throw new NoFileSystemAccessError();
  }

  const picker = (window as unknown as ShowSaveFilePickerWindow)
    .showSaveFilePicker;
  const handle = await picker(options);
  const writable = await handle.createWritable();

  let chain: Promise<void> = Promise.resolve();
  let aborted = false;
  let closed = false;

  return {
    write(chunk: Uint8Array): Promise<void> {
      if (aborted) {
        return Promise.reject(
          new Error("[SideDrawer SDK] Cannot write to an aborted sink.")
        );
      }
      if (closed) {
        return Promise.reject(
          new Error("[SideDrawer SDK] Cannot write to a closed sink.")
        );
      }
      chain = chain.then(() => writable.write(chunk));
      return chain;
    },
    async close(): Promise<void> {
      if (aborted) return;
      if (closed) return;
      closed = true;
      await chain;
      await writable.close();
    },
    async abort(reason?: unknown): Promise<void> {
      if (aborted) return;
      if (closed) return;
      aborted = true;
      try {
        await writable.abort(reason);
      } catch {
        /* best-effort: ignore secondary failures during abort */
      }
    },
  };
}
