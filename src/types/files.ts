import { Metadata } from "./base";

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
