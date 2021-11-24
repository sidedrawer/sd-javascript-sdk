
import { FileType } from './fileType';
import { FileItem } from './fileItem';
import { CloudStorageFolder } from './cloudStorageFolder';

export interface FileHistory {

    correlationId?: string,
    uploadTitle?: string,
    uploadDetail?: string,
    fileType?: FileType,
    files?: FileItem[],
    cloudStorageFolder?: CloudStorageFolder,

}