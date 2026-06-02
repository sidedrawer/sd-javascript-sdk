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
