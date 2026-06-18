export interface DownloadSink {
  write(chunk: Uint8Array): Promise<void> | void;
  close(): Promise<void> | void;
  abort(reason?: unknown): Promise<void> | void;
}

export const ERR_NO_FS_ACCESS = "ERR_NO_FS_ACCESS";

export class NoFileSystemAccessError extends Error {
  public readonly code = ERR_NO_FS_ACCESS;
  constructor(message?: string) {
    super(
      message ??
        "[SideDrawer SDK] File System Access API is not available in this environment. Use a Chromium-based browser (Chrome/Edge/Opera 86+) or implement a custom DownloadSink."
    );
    this.name = "NoFileSystemAccessError";
  }
}
