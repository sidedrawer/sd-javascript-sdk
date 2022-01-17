import {Environment} from "../models/environment.enum";
import {env} from "../environments/environment";
import {FileItem} from "../models/file-item.model";
import {FileType} from "../models/file-type.enum";
import {UtilsHelper} from "../helpers/utils.helper";
import {FileHistory} from "../models/file-history.model";

export class FilesModule {
    private recordsApi: string;

    constructor(public environment: Environment) {
        this.recordsApi = env(this.environment).recordsApi;
    }

    /**
     * Upload a File
     * @returns The new FileItem
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     * @param payload.file The file
     * @param payload.fileType The file
     * @param payload.fileName The file
     * @param payload.uploadTitle The file
     * @param payload.displayType The file
     * @param payload.caption The file
     */
    uploadFile(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Type */
        sidedrawerId: string,
        /** Record ID */
        recordId: string,
        /** The file*/
        file: File,
        /** The file Name  */
        fileName: string,
        /** The file type */
        fileType: FileType,
        /** The upload title */
        uploadTitle?: string,
        /** The display type, used for pdfTron modes */
        displayType?: string,
        /** The envelope ID for the sealed file */
        envelopeId?: string,
    }): Promise<FileItem> {
        const body = new FormData();
        body.append('file', payload.file);
        const params = {
            fileType: encodeURIComponent(payload?.fileType),
            fileName: UtilsHelper.generateFileName(payload.fileName, false),
            fileExtension: encodeURIComponent(encodeURIComponent(payload?.file?.name.split('.')[payload?.file?.name.split('.').length - 1])),
            correlationId: UtilsHelper.generateCorrelationId(),
            uploadTitle: !!payload?.uploadTitle ? encodeURIComponent(payload?.uploadTitle) : null,
            displayType: !!payload?.displayType ? encodeURIComponent(payload?.displayType) : null,
            envelopeId: !!payload?.envelopeId ? encodeURIComponent(payload?.envelopeId) : null,
        };
        // @ts-ignore
        const url = this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/records/record-id/${payload?.recordId}/record-files` + new URLSearchParams(UtilsHelper.removeEmptyEntriesFromObject(params));
        return fetch(
            url,
            {
                method: 'POST',
                body,
                headers: {
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Get the Files of a record
     * @returns an Array of FileHistory
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     */
    getRecordFiles(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer ID */
        sidedrawerId: string,
        /** Record ID */
        recordId: string,
    }): Promise<FileHistory[]> {
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/records/record-id/${payload?.recordId}/record-files`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Move a File to another record
     * @returns an Array of FileHistory
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     * @param payload.destinationSidedrawerId Destination SideDrawer ID
     * @param payload.destinationRecordId Destination Record ID
     * @param payload.fileNameWithExtension The file Name with the extension included
     */
    copyRecordFile(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Type */
        sidedrawerId: string,
        /** Record ID */
        recordId: string,
        /** Destination SideDrawer ID */
        destinationSidedrawerId: string,
        /** Destination Record ID */
        destinationRecordId: string,
        /** The file Name with the extension included */
        fileNameWithExtension: string,
    }): Promise<FileItem> {
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/records/record-id/${payload?.recordId}/record-files`,
            {
                method: 'PUT',
                body: JSON.stringify({
                    destinationSidedrawerId: payload.destinationSidedrawerId,
                    destinationRecordId: payload.destinationRecordId,
                    fileNameWithExtension: payload.fileNameWithExtension,
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Update a File Record
     * @returns an Array of FileHistory
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     * @param payload.fileNameWithExtension The file Name with the extension included
     * @param payload.uploadTitle The Upload Title
     * @param payload.correlationId Correlation ID
     */
    updateRecordFile(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Type */
        sidedrawerId: string,
        /** Record ID */
        recordId: string,
        /** The file Name with the extension included */
        fileNameWithExtension: string,
        /** Upload Title */
        uploadTitle: string,
        /** Correlation ID */
        correlationId: string,
    }): Promise<FileItem> {
        const {uploadTitle, correlationId} = payload;
        const body = UtilsHelper.removeEmptyEntriesFromObject({uploadTitle, correlationId});
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/records/record-id/${payload?.recordId}/record-files/${payload?.fileNameWithExtension}`,
            {
                method: 'PUT',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Delete a File
     * @returns The File
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     * @param payload.fileNameWithExtension The file Name with the extension included
     */
    deleteFile(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Type */
        sidedrawerId: string,
        /** Record ID */
        recordId: string,
        /** The file Name with the extension included */
        fileNameWithExtension: string,
    }): Promise<FileItem> {
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/records/record-id/${payload?.recordId}/record-files/${payload.fileNameWithExtension}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${payload?.token}`,
                    'Content-Type': 'application/json',
                }
            }
        ).then(response => response.json())
    }

    /**
     * Download a File
     * @returns The File
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     * @param payload.fileNameWithExtension The file Name with the extension included
     */
    downloadFile(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Type */
        sidedrawerId: string,
        /** Record ID */
        recordId: string,
        /** The file Name with the extension included */
        fileNameWithExtension: string,
    }): Promise<Blob> {
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/records/record-id/${payload?.recordId}/record-files/${payload.fileNameWithExtension}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${payload?.token}`,
                    responseType: 'blob' as 'json',
                }
            }
        ).then(response => response.json())
    }

    /**
     * Seal a File
     * @returns The FileItem sealed
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     * @param payload.fileNameWithExtension The file Name with the extension included
     */
    sealRecordFile(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Type */
        sidedrawerId: string,
        /** Record ID */
        recordId: string,
        /** The file Name with the extension included */
        fileNameWithExtension: string,
    }): Promise<FileItem> {
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/records/record-id/${payload?.recordId}/record-files/${payload.fileNameWithExtension}/seal`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }

    /**
     * Move a File to Quarantine
     * @returns The FileItem moved
     * @param payload.token The Bearer Token for the request
     * @param payload.sidedrawerId The SideDrawer ID
     * @param payload.recordId The Record ID
     * @param payload.fileNameWithExtension The file Name with the extension included
     */
    quarantineRecordFile(payload: {
        /** Bearer Token */
        token: string,
        /** SideDrawer Type */
        sidedrawerId: string,
        /** Record ID */
        recordId: string,
        /** The file Name with the extension included */
        fileNameWithExtension: string,
    }): Promise<FileItem> {
        return fetch(
            this.recordsApi + `sidedrawer/sidedrawer-id/${payload?.sidedrawerId}/records/record-id/${payload?.recordId}/record-files/${payload.fileNameWithExtension}/quarantine`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${payload?.token}`,
                }
            }
        ).then(response => response.json())
    }
}
