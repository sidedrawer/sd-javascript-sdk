import { take, timeout } from "rxjs";
import AxiosHttpService from "../AxiosHttpService";
import nock from "nock";

const BASE_URL = "https://localhost";

afterEach(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.restore();
});

describe("core", () => {
  let axiosHttpService: AxiosHttpService;

  it("AxiosHttpService.constructor", () => {
    axiosHttpService = new AxiosHttpService({
      baseURL: BASE_URL,
    });
  });

  it("AxiosHttpService.request", (done) => {
    expect.assertions(3);

    const message = "ok";

    nock(BASE_URL).get("/test").reply(200, { message });

    axiosHttpService
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

  it("AxiosHttpService.get", (done) => {
    expect.assertions(3);

    const message = "ok";

    nock(BASE_URL).get("/test").reply(200, { message });

    axiosHttpService.get("/test").subscribe({
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

  it("AxiosHttpService.delete", (done) => {
    expect.assertions(3);

    const message = "ok";

    nock(BASE_URL).delete("/test").reply(200, { message });

    axiosHttpService.delete("/test").subscribe({
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

  it("AxiosHttpService.post", (done) => {
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

    axiosHttpService.post("/test", { message }).subscribe({
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

  it("AxiosHttpService.put", (done) => {
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

    axiosHttpService.put("/test", { message }).subscribe({
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

  it("AxiosHttpService error", (done) => {
    expect.assertions(3);

    nock(BASE_URL).get(`/test`).reply(403, {
      statusCode: 0,
      error: "string",
      message: "string",
    });

    axiosHttpService.get("/test").subscribe({
      error: (err: Error) => {
        expect(err).not.toEqual(undefined);
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("403");

        done();
      },
    });
  });

  it("AxiosHttpService abort signal", (done) => {
    expect.assertions(3);

    nock(BASE_URL).get(`/test`).delayConnection(1000).reply(403, {
      statusCode: 0,
      error: "string",
      message: "string",
    });

    const controller = new AbortController();
    const signal = controller.signal;

    axiosHttpService
      .get("/test", {
        signal,
      })
      .subscribe({
        error: (err: Error) => {
          expect(err).not.toEqual(undefined);
          expect(err.message).not.toEqual(undefined);
          expect(err.message.toLowerCase()).toContain("aborted");

          done();
        },
      });

    setTimeout(() => {
      controller.abort();
    }, 100);
  }, 3000);

  it("AxiosHttpService timeout from pipe", (done) => {
    expect.assertions(3);

    nock(BASE_URL).get(`/test`).delayConnection(2000).reply(403, {
      statusCode: 0,
      error: "string",
      message: "string",
    });

    axiosHttpService
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

  it("AxiosHttpService.getWithPagination subscribe", (done) => {
    expect.assertions(9);

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
          hasMore: page <= 10,
          nextPage: url.toString(),
        };
      });

    axiosHttpService
      .getWithPagination("/test", {
        params: {
          limit: 50,
        },
      })
      .pipe(take(2))
      .subscribe({
        next: (response: any) => {
          expect(response).not.toEqual(undefined);
          expect(response.length).toEqual(50);
        },
        complete: () => {
          done();
        },
      });
  });

  it("AxiosHttpService.getWithPagination response format error", (done) => {
    expect.assertions(2);

    nock(BASE_URL)
      .get("/test")
      .query(true)
      .times(1)
      .reply(200, function () {
        return {};
      });

    axiosHttpService.getWithPagination("/test").subscribe({
      error: (err: Error) => {
        expect(err).not.toEqual(undefined);
        expect(err).toBeInstanceOf(Error);

        done();
      },
    });
  });

  it("AxiosHttpService.getWithPagination http error", (done) => {
    expect.assertions(3);

    nock(BASE_URL).get(`/test`).reply(500, {
      statusCode: 0,
      error: "string",
      message: "string",
    });

    axiosHttpService.getWithPagination("/test").subscribe({
      error: (err: Error) => {
        expect(err).not.toEqual(undefined);
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("500");

        done();
      },
    });
  });
});
