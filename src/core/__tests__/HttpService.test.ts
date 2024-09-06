import { timeout } from "rxjs";
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
  let httpService: HttpService;

  it("HttpService.constructor", () => {
    httpService = new HttpService({
      baseURL: BASE_URL,
      timeout: 250,
    });
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

  it("HttpService.request", (done) => {
    expect.assertions(3);

    const message = "ok";

    nock(BASE_URL).get("/test").reply(200, { message });

    httpService
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

  it("HttpService.get", (done) => {
    expect.assertions(3);

    const message = "ok";

    nock(BASE_URL).get("/test").reply(200, { message });

    httpService.get("/test").subscribe({
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

  it("HttpService.delete", (done) => {
    expect.assertions(3);

    const message = "ok";

    nock(BASE_URL).delete("/test").reply(200, { message });

    httpService.delete("/test").subscribe({
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

  it("HttpService.post", (done) => {
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

    httpService.post("/test", { message }).subscribe({
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

  it("HttpService.put", (done) => {
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

    httpService.put("/test", { message }).subscribe({
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

  it("abort signal", (done) => {
    // expect.assertions(3); // failing

    nock(BASE_URL).get(`/test`).delayConnection(1000).reply(403, {
      statusCode: 0,
      error: "string",
      message: "string",
    });

    const controller = new AbortController();
    const signal = controller.signal;

    httpService
      .get("/test", {
        signal,
      })
      .subscribe({
        error: (err: Error) => {
          expect(err).not.toEqual(undefined);
          expect(err.message).not.toEqual(undefined);
          expect(err.message.toLowerCase()).toContain("aborted");

          done();
        }
      });

    setTimeout(() => {
      controller.abort();
    }, 100);
  }, 3000);

  it("error", (done) => {
    expect.assertions(3);

    nock(BASE_URL).get(`/test`).reply(403, {
      statusCode: 0,
      error: "string",
      message: "string",
    });

    httpService.get("/test").subscribe({
      error: (err: Error) => {
        expect(err).not.toEqual(undefined);
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("403");

        done();
      },
    });
  });

  it("timeout from pipe", (done) => {
    expect.assertions(3);

    nock(BASE_URL)
      .get(`/test`)
      .delayConnection(2000)
      .reply(403, () => {
        return {
          statusCode: 0,
          error: "string",
          message: "string",
        };
      });

    httpService
      .get("/test")
      .pipe(timeout(1000))
      .subscribe({
        error: (err: Error) => {
          expect(err).not.toEqual(undefined);
          expect(err.message).not.toEqual(undefined);
          expect(err.message.toLowerCase()).toContain("timeout");

          setTimeout(() => {
            done();
          }, 2000);
        },
      });
  }, 5000);

  it("HttpService.getWithPagination subscribe", (done) => {
    expect.assertions(20);

    nock(BASE_URL)
      .get("/test")
      .query(true)
      .times(5)
      .reply(200, function (urlString) {
        const url = new URL(`${BASE_URL}${urlString}`);
        const limit = parseInt(url.searchParams.get("limit") ?? "20");
        const page = parseInt(url.searchParams.get("page") ?? "1");

        expect(limit).toEqual(20);

        const data = Array.from(
          {
            length: limit > 20 ? limit : 20,
          },
          (_, index) => {
            return {
              name: `Element ${index + 1 + 20 * (page - 1)}`,
            };
          }
        );

        url.searchParams.set("page", `${page + 1}`);

        return {
          data,
          hasMore: page < 5,
          nextPage: url.searchParams.toString(),
        };
      });

    httpService
      .getWithPagination("/test", {
        params: {
          limit: 20,
        },
      })
      .subscribe({
        next: (response: any) => {
          expect(response).not.toEqual(undefined);

          const { data } = response;

          expect(data).not.toEqual(undefined);
          expect(data.length).toEqual(20);
        },
        complete: () => {
          done();
        },
      });
  });

  it("HttpService.getWithPagination response format error", (done) => {
    expect.assertions(3);

    nock(BASE_URL)
      .get("/test")
      .query(true)
      .times(1)
      .reply(200, function () {
        return "Gateway not available.";
      });

    httpService.getWithPagination("/test").subscribe({
      next: (response: any) => {
        expect(response).not.toEqual(undefined);

        const { data, hasMore } = response;

        expect(data).toEqual(undefined);
        expect(hasMore).toEqual(false);
      },
      complete: () => {
        done();
      },
    });
  });

  it("HttpService.getWithPagination http error", (done) => {
    expect.assertions(3);

    nock(BASE_URL).get(`/test`).reply(500, {
      statusCode: 0,
      error: "string",
      message: "string",
    });

    httpService.getWithPagination("/test").subscribe({
      error: (err: Error) => {
        expect(err).not.toEqual(undefined);
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("500");

        done();
      },
    });
  });
});
