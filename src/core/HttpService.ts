import AxiosHttpService from "./AxiosHttpService";

export class HttpServiceError extends Error {
  constructor(
    public message: string,
    public code?: string,
    public request?: unknown,
    public response?: unknown
  ) {
    super(message);
  }
}

export default class HttpService extends AxiosHttpService {}
