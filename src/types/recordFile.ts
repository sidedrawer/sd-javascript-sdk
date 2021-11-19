import { FileType } from './fileType';
import { FileItem } from './fileItem';
import { CloudStorageFolder } from './cloudStorageFolder';

export interface RecordFile {

    correlationId?: string,
    uploadTitle?: string,
    uploadDetail?: string,
    fileType?: FileType,
    files?: FileItem[],
    cloudStorageFolder?: CloudStorageFolder

}

