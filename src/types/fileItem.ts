import { FileType } from './fileType';
import { CloudStorageFile } from './cloudStorageFile';

export interface FileItem {

    cloudStorage?: boolean,
    active?: boolean,
    fileName?: string,
    caption?: string,
    fileType?: FileType,
    fileUrl?: string,
    updatedAt?: Date,
    uploader?: string,
    fileSize?: number,
    cloudStorageFile?: CloudStorageFile,
    uploadTitle?: string,
    displayType?: string,
    id?: string,

}