import { Provider } from './provider';

export interface CloudStorageFile {
    provider?: Provider,
    driveId?: string,
    fileId?: string,

}