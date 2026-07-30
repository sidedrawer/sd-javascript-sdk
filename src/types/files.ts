import { ExternalKeys, Metadata } from "./base";

export interface FileBlock {
  hash: string;
  order: number;
}

/** Record File Detail */
export interface RecordFileDetail {
  _id: string;
  fileToken: string;
  format: string;
  metadata: Metadata;
  fileType: string;
  uploader: string;
  blocks: FileBlock[];
  fileSize: number;
  fileExtension: string;
  uploadTitle: string;
  caption: string;
  fileName: string;
  recordDetail: string;
  sidedrawer: string;
  updatedAt: string;
  createdAt: string;
  active: boolean;
  quarantined: boolean;
  cloudStorage: boolean;
}

export type FileType = "document" | "image" | "cloud";

export interface RecordFileQueryParams {
  fileName: string;
  uploadTitle: string;
  fileType: FileType;
  displayType?: string;
  envelopeId?: string;
  correlationId?: string;
  fileExtension?: string;
}

/**
 * Params for uploading a file to a Smart Forms Request item.
 *
 * Provide `sidedrawerId` for end-user (sidedrawer-scoped) finalize, or
 * `smartFormId` for admin finalize. Block upload always needs `sidedrawerId`,
 * so admin callers should pass both `smartFormId` and `sidedrawerId`.
 * When `smartFormId` is set, finalize uses the admin-scoped endpoint.
 */
export interface SmartFormRequestUploadParams extends RecordFileQueryParams {
  smartFormRequestId: string;
  smartFormItemId: string;
  recordId: string;
  file: File | Blob;
  sidedrawerId?: string;
  smartFormId?: string;
  metadata?: Metadata;
  externalKeys?: ExternalKeys;
}

/**
 * Response from Smart Forms Request record-file finalize endpoints.
 * Shape confirmed against api-uat (SPD-2900); similar to RecordFileDetail
 * with a few SFR-specific / extra fields observed on 201.
 */
export interface SmartFormRequestFileResponse {
  _id: string;
  fileToken: string;
  fileName: string;
  caption: string;
  uploadTitle: string;
  fileExtension: string;
  fileSize: number;
  fileType: string;
  format: string;
  uploader: string;
  sidedrawer: string;
  recordDetail: string;
  blocks: FileBlock[];
  checkSum: string;
  displayType?: string;
  correlationId?: string;
  sourceModel?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  quarantined: boolean;
  cloudStorage: boolean;
  sealed?: boolean;
  locked?: boolean;
  toSoftDelete?: boolean;
  toHardDelete?: boolean;
  metadata?: Metadata | unknown[];
}
