import { timeout } from "rxjs";
import FetchHttpService from "../FetchHttpService";
import nock from "nock";

const BASE_URL = "https://localhost";

afterEach(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.restore();
});

describe("core", () => {
  let fetchHttpService: FetchHttpService;

  it("FetchHttpService.constructor", () => {
    fetchHttpService = new FetchHttpService({
      baseURL: BASE_URL,
    });
  });

  it("FetchHttpService.request", (done) => {
    expect.assertions(3);

    const message = "ok";

    nock(BASE_URL).get("/test").reply(200, { message });

    fetchHttpService
      .request({
        url: "/test",
        method: "GET",
      })
      .subscribe({
        next: (response: any) => {
          expect(response).not.toEqual(undefined);
          expect(response.message).not.toEqual(undefined);
          expect(response.message).toEqual(message);
        },
        complete: () => {
          done();
        },
      });
  }, 1500);

  it("FetchHttpService.get", (done) => {
    expect.assertions(3);

    const message = "ok";

    nock(BASE_URL).get("/test").reply(200, { message });

    fetchHttpService.get("/test").subscribe({
      next: (response: any) => {
        expect(response).not.toEqual(undefined);
        expect(response.message).not.toEqual(undefined);
        expect(response.message).toEqual(message);
      },
      complete: () => {
        done();
      },
    });
  }, 1500);

  it("FetchHttpService.delete", (done) => {
    expect.assertions(3);

    const message = "ok";

    nock(BASE_URL).delete("/test").reply(200, { message });

    fetchHttpService.delete("/test").subscribe({
      next: (response: any) => {
        expect(response).not.toEqual(undefined);
        expect(response.message).not.toEqual(undefined);
        expect(response.message).toEqual(message);
      },
      complete: () => {
        done();
      },
    });
  }, 1500);

  it("FetchHttpService.post", (done) => {
    expect.assertions(6);

    const message = "ok";

    nock(BASE_URL)
      .post("/test", (body) => {
        expect(body).not.toEqual(undefined);
        expect(body.message).not.toEqual(undefined);
        expect(body.message).toEqual(message);

        return true;
      })
      .reply(200, { message });

    fetchHttpService.post("/test", { message }).subscribe({
      next: (response: any) => {
        expect(response).not.toEqual(undefined);
        expect(response.message).not.toEqual(undefined);
        expect(response.message).toEqual(message);
      },
      complete: () => {
        done();
      },
    });
  }, 1500);

  it("FetchHttpService.put", (done) => {
    expect.assertions(6);

    const message = "ok";

    nock(BASE_URL)
      .put("/test", (body) => {
        expect(body).not.toEqual(undefined);
        expect(body.message).not.toEqual(undefined);
        expect(body.message).toEqual(message);

        return true;
      })
      .reply(200, { message });

    fetchHttpService.put("/test", { message }).subscribe({
      next: (response: any) => {
        expect(response).not.toEqual(undefined);
        expect(response.message).not.toEqual(undefined);
        expect(response.message).toEqual(message);
      },
      complete: () => {
        done();
      },
    });
  }, 1500);

  it("FetchHttpService error", (done) => {
    expect.assertions(3);

    nock(BASE_URL).get(`/test`).reply(403, {
      statusCode: 0,
      error: "string",
      message: "string",
    });

    fetchHttpService.get("/test").subscribe({
      error: (err: Error) => {
        expect(err).not.toEqual(undefined);
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("403");

        done();
      },
    });
  });

  it("FetchHttpService abort signal", (done) => {
    expect.assertions(3);

    nock(BASE_URL).get(`/test`).delayConnection(1000).reply(403, {
      statusCode: 0,
      error: "string",
      message: "string",
    });

    const controller = new AbortController();
    const signal = controller.signal;

    fetchHttpService
      .get("/test", {
        signal,
      })
      .subscribe({
        error: (err: Error) => {
          expect(err).not.toEqual(undefined);
          expect(err.message).not.toEqual(undefined);
          expect(err.message.toLowerCase()).toMatch(/abort|cancel/);

          done();
        },
      });

    setTimeout(() => {
      controller.abort();
    }, 100);
  }, 3000);

  it("FetchHttpService timeout from pipe", (done) => {
    expect.assertions(3);

    nock(BASE_URL).get(`/test`).delayConnection(2000).reply(403, {
      statusCode: 0,
      error: "string",
      message: "string",
    });

    fetchHttpService
      .get("/test")
      .pipe(timeout(1000))
      .subscribe({
        error: (err: Error) => {
          expect(err).not.toEqual(undefined);
          expect(err.message).not.toEqual(undefined);
          expect(err.message.toLowerCase()).toContain("timeout");

          done();
        },
      });
  }, 4000);
});
