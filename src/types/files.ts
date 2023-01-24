/** Record File Detail */
export interface FileDetail {
  id: string;
  fileName: string;
  correlationId: string;
  uploadDetail: string;
  caption: string;
  uploader: string;
  url: string;
  fileType: string;
}

export interface FileRecordQueryParams {
  fileName: string;
  uploadTitle: string;
  fileType: "image" | "document" | "cloud";
  displayType?: string;
  envelopeId?: string;
  correlationId?: string;
  fileExtension?: string;
}
