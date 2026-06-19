export interface DownloadSink {
  write(chunk: Uint8Array): Promise<void> | void;
  close(): Promise<void> | void;
  abort(reason?: unknown): Promise<void> | void;
}

export const ERR_NO_FS_ACCESS = "ERR_NO_FS_ACCESS";
export const ERR_RESUMABLE_SINK_NOT_FOUND = "ERR_RESUMABLE_SINK_NOT_FOUND";
export const ERR_PERMISSION_DENIED = "ERR_PERMISSION_DENIED";

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

/**
 * Thrown by `restoreFileSystemResumableSink` when no persisted handle
 * exists for the given `sessionId` — typically because the user (or
 * another tab) cleared it, the IndexedDB was evicted, or the session
 * never used a resumable sink in the first place.
 */
export class ResumableSinkNotFoundError extends Error {
  public readonly code = ERR_RESUMABLE_SINK_NOT_FOUND;
  constructor(public readonly sessionId: string) {
    super(
      `[SideDrawer SDK] No persisted file handle found for sessionId "${sessionId}". The download cannot be resumed to its original disk location — ask the user to pick a destination again.`
    );
    this.name = "ResumableSinkNotFoundError";
  }
}

/**
 * Thrown by `restoreFileSystemResumableSink` when the user declines the
 * browser's re-permission prompt. The persisted handle is still valid,
 * but the user must explicitly re-grant write access before the bytes
 * can flow.
 */
export class PermissionDeniedError extends Error {
  public readonly code = ERR_PERMISSION_DENIED;
  constructor(public readonly sessionId: string) {
    super(
      `[SideDrawer SDK] User declined write permission for sessionId "${sessionId}". The download cannot be resumed without explicit access to the file.`
    );
    this.name = "PermissionDeniedError";
  }
}
