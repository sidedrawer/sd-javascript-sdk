import HttpService, { HttpServiceError } from "../HttpService";
import nock from "nock";

const BASE_URL = "https://localhost";

afterEach(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.restore();
});

describe("HttpService", () => {
  const httpService = new HttpService({
    timeout: 250,
  });

  it("OK 200", (done) => {
    expect.assertions(2);

    nock(BASE_URL).get(`/ping`).reply(200, {
      message: "pong",
    });

    httpService.get(`${BASE_URL}/ping`).subscribe({
      next: (response: any) => {
        expect(response).not.toEqual(undefined);
        expect(response.message).toEqual("pong");

        done();
      },
      error: (err: HttpServiceError) => {
        expect(err).not.toEqual(undefined);
      },
    });
  });

  it("error 500", (done) => {
    expect.assertions(6);

    nock(BASE_URL).get(`/test`).reply(500, {
      message: "server error",
    });

    httpService.get(`${BASE_URL}/test`).subscribe({
      next: (response: any) => {
        expect(response).not.toEqual(undefined);
        expect(response.message).toEqual("server error");
      },
      error: (err: HttpServiceError) => {
        expect(err).not.toEqual(undefined);
        expect(err).toBeInstanceOf(HttpServiceError);
        expect(err.code).not.toEqual(undefined);
        expect(err.request).not.toEqual(undefined);
        expect(err.response).not.toEqual(undefined);

        expect(err.code).toEqual("ERR_BAD_RESPONSE");

        done();
      },
    });
  });

  it("error 404", (done) => {
    expect.assertions(6);

    nock(BASE_URL).get(`/test`).reply(404, {
      message: "not found",
    });

    httpService.get(`${BASE_URL}/test`).subscribe({
      next: (response: any) => {
        expect(response).not.toEqual(undefined);
        expect(response.message).toEqual("test");
      },
      error: (err: HttpServiceError) => {
        expect(err).not.toEqual(undefined);
        expect(err).toBeInstanceOf(HttpServiceError);
        expect(err.code).not.toEqual(undefined);
        expect(err.request).not.toEqual(undefined);
        expect(err.response).not.toEqual(undefined);

        expect(err.code).toEqual("ERR_BAD_REQUEST");

        done();
      },
    });
  });

  it("connection refused error", (done) => {
    expect.assertions(6);

    const controller = new AbortController();
    const signal = controller.signal;

    signal.addEventListener("abort", () => {
      expect(signal.aborted).toBe(true);

      done();
    });

    httpService.get(`${BASE_URL}/test`).subscribe({
      next: (uploadResult: any) => {
        console.log({ uploadResult });
      },
      error: (err: HttpServiceError) => {
        expect(err).not.toEqual(undefined);
        expect(err).toBeInstanceOf(HttpServiceError);
        expect(err.code).not.toEqual(undefined);
        expect(err.request).not.toEqual(undefined);
        expect(err.response).toEqual(undefined);

        expect(err.code).toEqual("ECONNREFUSED");

        done();
      },
    });

    setTimeout(() => {
      controller.abort();
    }, 100);
  }, 1000);
});
