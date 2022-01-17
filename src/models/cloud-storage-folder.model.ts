import {Provider} from "./provider.enum";

export class CloudStorageFolder {
  constructor(
    public provider?: Provider,
    public driveId?: string,
    public folderId?: string,
  ) {
  }
}
