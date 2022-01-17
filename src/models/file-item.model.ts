import {FileType} from "./file-type.enum";
import {CloudStorageFolder} from "./cloud-storage-folder.model";

export class FileItem {
  constructor(
    public cloudStorage?: boolean,
    public active?: boolean,
    public fileName?: string,
    public caption?: string,
    public fileType?: FileType,
    public fileUrl?: string,
    public updatedAt?: Date,
    public uploader?: string,
    public fileSize?: number,
    public cloudStorageFile?: CloudStorageFolder,
    public uploadTitle?: string,
    public displayType?: string,
    public id?: string,
    public provider?: string,
    public quarantined?: boolean,
    public sealed?: boolean,
    public correlationId?: string,
    public uploadDetail?: string,
    public createdAt?: Date,
  ) {
  }
}
