import {CloudStorageFolder} from './cloud-storage-folder.model';
import {FileType} from "./file-type.enum";
import {FileItem} from "./file-item.model";

export class FileHistory {
    constructor(
        public correlationId?: string,
        public uploadTitle?: string,
        public uploadDetail?: string,
        public fileType?: FileType,
        public files?: FileItem[],
        public cloudStorageFolder?: CloudStorageFolder,
    ) {
    }
}
